import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('growth_v1',ROOT/'growth_v1.py')
ge=importlib.util.module_from_spec(spec)
spec.loader.exec_module(ge)

class EngineTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.workspace=Path(self.temp.name)
        self.c=ge.connect(self.workspace/'grow.sqlite3')
        new,total,verified=ge.ingest(self.c)
        self.assertEqual((new,total,verified),(16,16,7))
    def tearDown(self):
        self.c.close()
        self.temp.cleanup()
    def test_daily_batch_idempotent_and_bounded(self):
        first=ge.daily_batch(self.c,limit=20)
        self.assertEqual(len(first),7)
        self.assertEqual({r['status'] for r in first},{'PREVIEW'})
        self.assertEqual(ge.daily_batch(self.c,limit=20),[])
        with self.assertRaisesRegex(ValueError,'between'):
            ge.daily_batch(self.c,limit=100)
    def test_init_idempotent(self):
        self.assertEqual(ge.ingest(self.c),(0,16,7))
        self.assertEqual(ge.summary(self.c)['accounts'],16)
    def test_source_verification_gate(self):
        with self.assertRaisesRegex(ValueError,'Research not reviewed'):
            ge.create_draft(self.c,'hacs.ro')
    def test_7_curated_drafts_pass(self):
        v=json.loads((ROOT/'data/curated_copy.json').read_text())
        for domain in v:
            draft=ge.create_draft(self.c,domain)
            self.assertEqual(draft['status'],'PENDING')
            self.assertEqual(ge.text_quality(ge.get_account(self.c,domain),draft['subject'],draft['body']),[])
        self.assertEqual(ge.summary(self.c)['drafts'],7)
    def test_approval_requires_explicit_opt_in(self):
        ge.create_draft(self.c,'briaris.ro')
        with self.assertRaisesRegex(ValueError,'opt-in'):
            ge.authorize_draft(self.c,'briaris.ro','someone@example.com','Operator')
    def test_draft_creation_only_not_sending(self):
        self.assertFalse(hasattr(ge,'send_email'))
        self.assertFalse(hasattr(ge,'gmail_send'))
    def test_consent_needs_proof(self):
        with self.assertRaisesRegex(ValueError,'traceable'):
            ge.consent(self.c,'briaris.ro','someone@example.com','none','yes','A', '2026-10-28T12:00:00+02:00')
    def test_approval_then_suppression_blocks(self):
        ge.create_draft(self.c,'briaris.ro')
        ge.consent(self.c,'briaris.ro','someone@example.com','internal:crm:consent-123',
                   'Recorded demo-specific explicit opt-in via manual form; synthetic test only','Operator','2026-10-28T12:00:00+02:00')
        ge.authorize_draft(self.c,'briaris.ro','someone@example.com','Operator')
        ge.assert_draft_ready(self.c,'briaris.ro')
        ge.suppress(self.c,'someone@example.com','Recipient requested no further emails')
        with self.assertRaisesRegex(ValueError,'revoked|opted out'):
            ge.assert_draft_ready(self.c,'briaris.ro')
    def test_suppressed_cannot_reenroll(self):
        ge.suppress(self.c,'someone@example.com','Unsubscribe')
        with self.assertRaisesRegex(ValueError,'suppressed'):
            ge.consent(self.c,'briaris.ro','someone@example.com','internal:crm:consent-123',
                     'Recorded demo-specific explicit opt-in via manual form; synthetic test only','Operator','2026-10-28T12:00:00+02:00')
    def test_stale_evidence_invalidates(self):
        ge.create_draft(self.c,'briaris.ro')
        ge.consent(self.c,'briaris.ro','someone@example.com','internal:crm:consent-123',
                   'Recorded demo-specific explicit opt-in via manual form; synthetic test only','Operator','2026-10-28T12:00:00+02:00')
        ge.authorize_draft(self.c,'briaris.ro','someone@example.com','Operator')
        ge.review_source(self.c,'briaris.ro','https://www.briaris.ro/despre-noi/',
                         'BRIARIS oferă servicii de vânzare vehicule comerciale și service.',
                         'Vânzări IVECO, Service & Piese','Operator')
        with self.assertRaisesRegex(ValueError,'Research evidence changed'):
            ge.assert_draft_ready(self.c,'briaris.ro')
    def test_sender_identity_not_skippable(self):
        ge.create_draft(self.c,'briaris.ro')
        ge.consent(self.c,'briaris.ro','someone@example.com','internal:crm:consent-123',
                   'Recorded demo-specific explicit opt-in via manual form; synthetic test only','Operator','2026-10-28T12:00:00+02:00')
        ge.authorize_draft(self.c,'briaris.ro','someone@example.com','Operator')
        with patch.dict(os.environ,{'GMAIL_ACCESS_TOKEN':'synthetic','GMAIL_SENDER_EMAIL':'revenewai@gmail.com'}):
            with self.assertRaisesRegex(ValueError,'@revenew.ro'):
                ge.create_gmail_draft(self.c,'briaris.ro')
    def test_prompt_does_not_run_without_api_key(self):
        with patch.dict(os.environ,{},clear=True):
            with self.assertRaisesRegex(ValueError,'OPENAI_API_KEY'):
                ge.generate_ai(ge.get_account(self.c,'briaris.ro'),'gpt-6.1-terra')
    def test_dedup_preview(self):
        d1=ge.create_draft(self.c,'briaris.ro')
        d2=ge.create_draft(self.c,'briaris.ro')
        self.assertEqual(d1['id'],d2['id'])
    def test_html_escapes(self):
        self.c.execute("UPDATE accounts SET company=? WHERE domain='briaris.ro'",("BRIARIS<script>alert('x')</script>",))
        ge.dashboard(self.c,self.workspace/'board.html')
        text=(self.workspace/'board.html').read_text()
        self.assertNotIn('<script>alert(',text)
        self.assertIn('BRIARIS&lt;script&gt;',text)
    def test_bad_email_and_source_url(self):
        self.assertFalse(ge.valid_email('hi@ex.com\r\nBcc:a@x.com'))
        self.assertFalse(ge.valid_source('https://briaris.ro.attack.com/a','briaris.ro'))
        self.assertFalse(ge.valid_source('http://briaris.ro','briaris.ro'))
        self.assertTrue(ge.valid_source('https://www.briaris.ro/despre-noi/','briaris.ro'))
    def test_public_export_minimizes_contact_data(self):
        ge.export_csv(self.c,self.workspace/'accounts.csv')
        s=(self.workspace/'accounts.csv').read_text(encoding='utf-8-sig')
        self.assertIn('CIPA AIR',s)
        self.assertNotIn('someone@example.com',s)
    def test_priorities_in_range(self):
        for a in self.c.execute('SELECT * FROM accounts'):
            self.assertGreaterEqual(ge.priority(a),0)
            self.assertLessEqual(ge.priority(a),100)

if __name__=='__main__': unittest.main()
