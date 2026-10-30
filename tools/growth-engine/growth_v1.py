#!/usr/bin/env python3
"""ReveNew Growth Engine V1 — evidence-based prospecting, REVIEW ONLY by default.

Standard library only (Python 3.10+). Never sends email. The only Gmail action
is creation of an unsent draft after source review, documented permission, human
copy approval, matching recipient, sender verification and suppression checks.
"""
from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import html
import json
import os
import re
import sqlite3
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DB = ROOT / "private" / "growth_v1.sqlite3"
SEED = ROOT / "data" / "prospects.csv"
REVIEW = ROOT / "data" / "source_review.json"
COPY = ROOT / "data" / "curated_copy.json"
RELEASE = ROOT / "reports"
BANNED = (
    "sper că acest email vă găsește bine", "soluție inovatoare", "sinergii",
    "transformare revoluționară", "vă pierdeți clienții", "am descoperit că pierdeți",
    "am constatat că pierdeți", "creștere garantată", "garantăm rezultate",
    "game changer", "nu ratați oferta", "ultimul avertisment", "100% garantat",
)
SCORES = ("complexity_25", "handoffs_20", "followup_20", "fragmentation_15", "signals_10", "pilot_10")
MAX_SCORES = (25, 20, 20, 15, 10, 10)


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def digest(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def valid_domain(s: str) -> bool:
    return bool(re.fullmatch(r"(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}", s))


def valid_source(url: str, domain: str) -> bool:
    try:
        p = urlsplit(url)
        h = (p.hostname or "").lower()
        return p.scheme == "https" and (h == domain or h.endswith("." + domain)) and not p.username and not p.password
    except ValueError:
        return False


def valid_email(email: str) -> bool:
    return bool(re.fullmatch(r"[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,}", email)) and "\r" not in email and "\n" not in email


def connect(db: Path = DB):
    db.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(db)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    c.execute("PRAGMA busy_timeout=4000")
    c.executescript("""
        CREATE TABLE IF NOT EXISTS accounts (
            domain TEXT PRIMARY KEY, company TEXT NOT NULL, vertical TEXT NOT NULL,
            source_url TEXT NOT NULL, legacy_claim TEXT NOT NULL,
            fit_score INTEGER NOT NULL CHECK(fit_score BETWEEN 0 AND 100),
            buyability_estimate INTEGER NOT NULL DEFAULT 0 CHECK(buyability_estimate BETWEEN 0 AND 4),
            public_fact TEXT NOT NULL DEFAULT '', evidence_excerpt TEXT NOT NULL DEFAULT '',
            hypothesis TEXT NOT NULL DEFAULT '', workflow TEXT NOT NULL DEFAULT '',
            buyer_role TEXT NOT NULL, research_status TEXT NOT NULL DEFAULT 'PENDING'
              CHECK(research_status IN ('PENDING','SOURCE_REVIEWED','BLOCKED')),
            reviewed_at TEXT NOT NULL DEFAULT '',
            outreach_status TEXT NOT NULL DEFAULT 'RESEARCH_ONLY',
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS contacts (
            email TEXT PRIMARY KEY, domain TEXT NOT NULL REFERENCES accounts(domain),
            consent_status TEXT NOT NULL DEFAULT 'UNKNOWN'
              CHECK(consent_status IN ('UNKNOWN','EXPLICIT_OPT_IN')),
            proof_id TEXT NOT NULL DEFAULT '', evidence TEXT NOT NULL DEFAULT '',
            permission_time TEXT NOT NULL DEFAULT '', reviewer TEXT NOT NULL DEFAULT '',
            purpose TEXT NOT NULL DEFAULT 'ReveNew product demo communications',
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS suppressions (
            email TEXT PRIMARY KEY, reason TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT NOT NULL REFERENCES accounts(domain),
            subject TEXT NOT NULL, body TEXT NOT NULL, method TEXT NOT NULL,
            evidence_fingerprint TEXT NOT NULL, content_hash TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
            recipient TEXT NOT NULL DEFAULT '', reviewer TEXT NOT NULL DEFAULT '',
            reviewed_at TEXT NOT NULL DEFAULT '', gmail_draft_id TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            UNIQUE(domain, content_hash)
        );
        CREATE TABLE IF NOT EXISTS audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT, event TEXT NOT NULL, note TEXT NOT NULL, happened_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_drafts_domain ON drafts(domain);
    """)
    c.commit()
    return c


def audit(c, domain: str | None, event: str, note: str = ""):
    c.execute("INSERT INTO audit(domain,event,note,happened_at) VALUES(?,?,?,?)",
              (domain, event, note[:250], now()))


def get_account(c, domain: str):
    row = c.execute("SELECT * FROM accounts WHERE domain=?", (domain.lower(),)).fetchone()
    if not row:
        raise ValueError(f"Unknown company domain: {domain}")
    return row


def priority(a) -> int:
    # Estimated buyability is explicitly an unvalidated hypothesis, not a factual signal.
    return round(0.72 * int(a['fit_score']) + 0.28 * (int(a['buyability_estimate']) * 25))


def evidence_fingerprint(a) -> str:
    return digest("|".join([a['source_url'], a['public_fact'], a['evidence_excerpt'], a['reviewed_at']]))


def ingest(c, seed: Path = SEED, review: Path = REVIEW):
    verified = json.loads(review.read_text(encoding="utf-8"))
    added, seen = 0, set()
    with seed.open(encoding="utf-8-sig", newline="") as fp:
        for row in csv.DictReader(fp):
            domain = row['domain'].strip().lower()
            if domain in seen:
                raise ValueError("Duplicate domain in seed: " + domain)
            seen.add(domain)
            if not valid_domain(domain) or not valid_source(row['source_url'], domain):
                raise ValueError("Invalid source/domain: " + domain)
            nums = [int(row[k]) for k in SCORES]
            if any(v < 0 or v > limit for v,limit in zip(nums, MAX_SCORES)):
                raise ValueError("Invalid rubric: " + domain)
            score = sum(nums)
            cur = c.execute("""INSERT OR IGNORE INTO accounts
              (domain,company,vertical,source_url,legacy_claim,fit_score,buyer_role,updated_at)
              VALUES (?,?,?,?,?,?,?,?)""", (domain,row['company'],row['vertical'],row['source_url'],
                         row['verified_fact'],score,row['buyer_role'],now()))
            added += cur.rowcount
            if cur.rowcount:
                audit(c,domain,'ACCOUNT_SEEDED','Source not treated as verified')
            if domain in verified and (cur.rowcount or c.execute("SELECT research_status FROM accounts WHERE domain=?",(domain,)).fetchone()["research_status"] == "PENDING"):
                e = verified[domain]
                if e['source_url'] != row['source_url'] and urlsplit(e['source_url']).hostname not in (domain,'www.'+domain):
                    raise ValueError('Evidence URL outside company domain: ' + domain)
                if not valid_source(e['source_url'], domain) or not e['observed_fact'].strip() or not e['source_extract'].strip():
                    raise ValueError('Invalid evidence: ' + domain)
                c.execute("""UPDATE accounts SET source_url=?,public_fact=?,evidence_excerpt=?,hypothesis=?,workflow=?,
                  buyability_estimate=?,research_status='SOURCE_REVIEWED',reviewed_at=?,updated_at=? WHERE domain=?""",
                    (e['source_url'],e['observed_fact'],e['source_extract'],e['copy_angle'],e['example_workflow'],
                     e['estimated_buyability'],e['source_reviewed_at'],now(),domain))
    c.commit()
    return added, len(seen), len(verified)


def review_source(c, domain: str, url: str, public_fact: str, excerpt: str, reviewer: str):
    a=get_account(c,domain)
    if not valid_source(url,domain): raise ValueError('Source must be an HTTPS official company domain URL')
    if len(public_fact.strip()) < 25 or len(excerpt.strip()) < 15 or not reviewer.strip():
        raise ValueError('Evidence and reviewer required')
    c.execute("""UPDATE accounts SET source_url=?,public_fact=?,evidence_excerpt=?,
      research_status='SOURCE_REVIEWED',reviewed_at=?,updated_at=? WHERE domain=?""",
              (url,public_fact,excerpt,now()[:10],now(),domain))
    # Existing approvals are made stale by fingerprint mismatch; do not delete their audit trail.
    audit(c,domain,'SOURCE_REVIEWED','Reviewer='+reviewer)
    c.commit()


def text_quality(a, subject: str, body: str) -> list[str]:
    issues=[]
    n=len(body.split())
    t=(subject+' '+body).casefold()
    if not 13 <= len(subject) <= 90 or "\n" in subject or "\r" in subject: issues.append('subject')
    if not 55 <= n <= 160: issues.append('body_length')
    if 'revenew' not in t: issues.append('brand_missing')
    if a['company'].casefold() not in t: issues.append('company_missing')
    if any(k in t for k in BANNED): issues.append('sales_cliche_or_unsubstantiated_claim')
    if body.count('!') > 0: issues.append('exclamation')
    if len(re.findall(r'https?://',body)) > 1: issues.append('links')
    if '\r' in body or any(c in body for c in ('\x00','\x1b')): issues.append('control_char')
    if not body.rstrip().endswith('https://revenew.ro'): issues.append('signature')
    if a['research_status'] != 'SOURCE_REVIEWED': issues.append('source_not_reviewed')
    return issues


def extract_output(response: dict) -> dict:
    parts=[]
    for o in response.get('output',[]):
        if o.get('type') == 'message':
            parts += [x.get('text','') for x in o.get('content',[]) if x.get('type')=='output_text']
    if not parts:
        raise ValueError('No text output returned by OpenAI')
    return json.loads(''.join(parts))


def generate_ai(a, model: str) -> tuple[str,str]:
    key=os.environ.get('OPENAI_API_KEY','')
    if not key: raise ValueError('OPENAI_API_KEY not configured: use curated drafts instead')
    if a['research_status'] != 'SOURCE_REVIEWED': raise ValueError('Public source not reviewed')
    schema={"type":"object","additionalProperties":False,"required":["subject","body"],
            "properties":{"subject":{"type":"string"},"body":{"type":"string"}}}
    prompt=(
      "Scrie UN draft B2B in romana, pentru review uman, fara trimitere. "
      "Nu inventa ce se intampla in firma, probleme, rezultate, contacte, "
      "conversatii anterioare, procente, reduceri sau promisiuni. "
      "Nu folosi complimente, formule tip spam si afirmatii agresive. "
      "Foloseste doar faptele publice date si descrie orice nevoie ca scenariu ipotetic. "
      "Subiect 20-70 caractere; corp 65-115 cuvinte. 3-5 paragrafe scurte, un singur CTA: "
      "o discutie de 10 minute. Ton: fondator catre lider B2B; clar, precis, usor de citit. "
      "Fara false emotii, fara emoji. Semnatura EXACTA: "
      "David Grigore\\nFounder · ReveNew\\nhttps://revenew.ro. "
      "Returneaza numai obiectul JSON cerut de schema."
    )
    content=json.dumps({"company":a['company'],"vertical":a['vertical'],"official_source":a['source_url'],
            "observed_fact":a['public_fact'],"example_not_observed_workflow":a['workflow'],
            "hypothesis":a['hypothesis'],"buyer_role":a['buyer_role']},ensure_ascii=False)
    request_data={"model":model,"instructions":prompt,"input":content,"max_output_tokens":850,
        "text":{"format":{"type":"json_schema","name":"revenew_draft","strict":True,"schema":schema}}}
    req=urllib.request.Request('https://api.openai.com/v1/responses',
       data=json.dumps(request_data,ensure_ascii=False).encode('utf-8'),method='POST',
       headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=60) as response:
        answer=json.load(response)
    if answer.get('status') not in (None,'completed'):
        raise ValueError('AI result incomplete: ' + str(answer.get('status')))
    payload=extract_output(answer)
    return payload['subject'], payload['body']


def create_draft(c, domain: str, ai: bool=False, model: str='gpt-6.1-terra', curated: Path=COPY):
    a=get_account(c,domain)
    if a['research_status']!='SOURCE_REVIEWED': raise ValueError('Research not reviewed. Draft generation blocked.')
    if ai:
        subject,body=generate_ai(a,model)
        method='openai:'+model
    else:
        variants=json.loads(curated.read_text(encoding='utf-8'))
        if domain not in variants: raise ValueError('No curated copy available. Review source or use --ai.')
        subject,body=variants[domain]['subject'],variants[domain]['body']
        method='curated'
    problems=text_quality(a,subject,body)
    if problems: raise ValueError('Copy quality gate blocked: '+', '.join(problems))
    fingerprint=evidence_fingerprint(a)
    sha=digest(subject+'\n'+body)
    cur=c.execute("""INSERT OR IGNORE INTO drafts
      (domain,subject,body,method,evidence_fingerprint,content_hash,created_at)
      VALUES(?,?,?,?,?,?,?)""",(domain,subject,body,method,fingerprint,sha,now()))
    if cur.rowcount: audit(c,domain,'DRAFT_CREATED',method)
    c.commit()
    return c.execute('SELECT * FROM drafts WHERE domain=? AND content_hash=?',(domain,sha)).fetchone()


def latest_draft(c,domain: str):
    d=c.execute('SELECT * FROM drafts WHERE domain=? ORDER BY id DESC LIMIT 1',(domain,)).fetchone()
    if d is None:raise ValueError('No draft for this account')
    return d


def consent(c, domain: str, email: str, proof_id: str, evidence: str, reviewer: str, timestamp: str):
    get_account(c,domain)
    email=email.lower().strip()
    if not valid_email(email):raise ValueError('Email invalid')
    if c.execute('SELECT 1 FROM suppressions WHERE email=?',(email,)).fetchone():
        raise ValueError('Recipient is suppressed and cannot be re-added')
    if not proof_id.startswith(('internal:','https://')) or len(evidence.strip())<35 or not reviewer.strip():
        raise ValueError('Real traceable consent record, explanation and reviewer required')
    try:
        t=datetime.fromisoformat(timestamp.replace('Z','+00:00'))
        if not t.tzinfo or t.astimezone(timezone.utc)>datetime.now(timezone.utc):raise ValueError()
    except ValueError as e:
        raise ValueError('Valid past consent timestamp with timezone required') from e
    existing=c.execute('SELECT domain FROM contacts WHERE email=?',(email,)).fetchone()
    if existing and existing['domain']!=domain: raise ValueError('Address already linked to another account')
    c.execute('''INSERT INTO contacts (email,domain,consent_status,proof_id,evidence,permission_time,reviewer,created_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(email) DO UPDATE SET consent_status=excluded.consent_status,proof_id=excluded.proof_id,
      evidence=excluded.evidence,permission_time=excluded.permission_time,reviewer=excluded.reviewer''',
      (email,domain,'EXPLICIT_OPT_IN',proof_id,evidence,t.isoformat(),reviewer,now()))
    audit(c,domain,'CONSENT_RECORDED','Proof reference='+proof_id)
    c.commit()


def suppress(c,email: str,reason: str):
    email=email.lower().strip()
    if not valid_email(email) or len(reason.strip())<3:raise ValueError('Valid email and reason required')
    c.execute('INSERT OR IGNORE INTO suppressions(email,reason,created_at) VALUES(?,?,?)',(email,reason,now()))
    c.execute("UPDATE contacts SET consent_status='UNKNOWN' WHERE email=?",(email,))
    audit(c,None,'RECIPIENT_SUPPRESSED','Suppression recorded (recipient omitted from audit)')
    c.commit()


def authorize_draft(c,domain: str,recipient: str,reviewer: str):
    a=get_account(c,domain)
    d=latest_draft(c,domain)
    if not reviewer.strip():raise ValueError('Human reviewer required')
    recipient=recipient.lower().strip()
    contact=c.execute("SELECT * FROM contacts WHERE email=? AND domain=?",(recipient,domain)).fetchone()
    if not contact or contact['consent_status']!='EXPLICIT_OPT_IN' or not contact['proof_id']:
        raise ValueError('Blocked: explicit documented recipient opt-in absent')
    if c.execute('SELECT 1 FROM suppressions WHERE email=?',(recipient,)).fetchone():
        raise ValueError('Blocked: opt-out/suppression')
    if d['evidence_fingerprint']!=evidence_fingerprint(a):raise ValueError('Research was changed: regenerate draft')
    if text_quality(a,d['subject'],d['body']):raise ValueError('Text quality check failed')
    if d['status']=='REJECTED':raise ValueError('Rejected copy cannot be approved')
    c.execute("UPDATE drafts SET status='APPROVED',recipient=?,reviewer=?,reviewed_at=? WHERE id=?",
              (recipient,reviewer,now(),d['id']))
    audit(c,domain,'DRAFT_APPROVED',f'Draft {d["id"]} for reviewed consent record')
    c.commit()
    return d['id']


def assert_draft_ready(c,domain: str):
    a=get_account(c,domain);d=latest_draft(c,domain)
    if d['status']!='APPROVED' or not d['recipient']:raise ValueError('Draft is not human-approved and recipient-bound')
    if d['evidence_fingerprint'] != evidence_fingerprint(a):raise ValueError('Research evidence changed')
    contact=c.execute('SELECT * FROM contacts WHERE email=? AND domain=?',(d['recipient'],domain)).fetchone()
    if not contact or contact['consent_status']!='EXPLICIT_OPT_IN':raise ValueError('Recipient permission revoked/missing')
    if c.execute('SELECT 1 FROM suppressions WHERE email=?',(d['recipient'],)).fetchone():
        raise ValueError('Recipient opted out')
    if text_quality(a,d['subject'],d['body']):raise ValueError('Copy gate failed')
    if d['gmail_draft_id']:raise ValueError('Gmail draft already created')
    return d


def gmail_profile(token: str) -> str:
    req=urllib.request.Request('https://gmail.googleapis.com/gmail/v1/users/me/profile',
             headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)['emailAddress'].lower()


def create_gmail_draft(c,domain: str) -> str:
    d=assert_draft_ready(c,domain)
    token=os.environ.get('GMAIL_ACCESS_TOKEN','')
    expected=os.environ.get('GMAIL_SENDER_EMAIL','').lower().strip()
    if not token:raise ValueError('GMAIL_ACCESS_TOKEN missing; only OAuth2 gmail.compose can create drafts')
    if not expected.endswith('@revenew.ro') or not valid_email(expected):
        raise ValueError('GMAIL_SENDER_EMAIL must be an authorized @revenew.ro mailbox')
    actual=gmail_profile(token)
    if actual!=expected:raise ValueError('Gmail authenticated profile is not the expected @revenew.ro mailbox')
    message=EmailMessage()
    message['From']=expected
    message['To']=d['recipient']
    message['Subject']=d['subject']
    message.set_content(d['body'])
    raw=base64.urlsafe_b64encode(message.as_bytes()).decode('ascii').rstrip('=')
    payload={'message':{'raw':raw}}
    req=urllib.request.Request('https://gmail.googleapis.com/gmail/v1/users/me/drafts',
             data=json.dumps(payload).encode('utf-8'),method='POST',
             headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=30) as r:
        created=json.load(r)
    draft_id=created['id']
    c.execute('UPDATE drafts SET gmail_draft_id=? WHERE id=?',(draft_id,d['id']))
    audit(c,domain,'GMAIL_DRAFT_CREATED','Provider draft ID='+draft_id+' (UNSENT)')
    c.commit()
    return draft_id



def daily_batch(c, limit: int=10, ai: bool=False, model: str='gpt-6.1-terra'):
    """Idempotent research-to-preview batch. No external sending, ever."""
    if limit < 1 or limit > 20:
        raise ValueError('Batch must be between 1 and 20 companies')
    candidates=c.execute("""SELECT * FROM accounts a WHERE research_status='SOURCE_REVIEWED'
      AND NOT EXISTS (SELECT 1 FROM drafts d WHERE d.domain=a.domain)""").fetchall()
    candidates.sort(key=lambda a:(-priority(a),a['company']))
    results=[]
    for a in candidates[:limit]:
        try:
            d=create_draft(c,a['domain'],ai=ai,model=model)
            results.append({'company':a['company'],'domain':a['domain'],'status':'PREVIEW', 'draft_id':d['id']})
        except (ValueError, KeyError, urllib.error.URLError) as error:
            results.append({'company':a['company'],'domain':a['domain'],'status':'BLOCKED','reason':str(error)[:160]})
    return results


def summary(c):
    rows=c.execute('''SELECT a.*, (SELECT COUNT(1) FROM drafts d WHERE d.domain=a.domain) AS drafts_count
                     FROM accounts a''').fetchall()
    return {'accounts':len(rows),'sources_reviewed':sum(x['research_status']=='SOURCE_REVIEWED' for x in rows),
            'needs_review':sum(x['research_status']!='SOURCE_REVIEWED' for x in rows),
            'drafts':c.execute('SELECT COUNT(*) FROM drafts').fetchone()[0],
            'approved':c.execute("SELECT COUNT(*) FROM drafts WHERE status='APPROVED'").fetchone()[0],
            'consented':c.execute("SELECT COUNT(*) FROM contacts WHERE consent_status='EXPLICIT_OPT_IN'").fetchone()[0],
            'suppressed':c.execute('SELECT COUNT(*) FROM suppressions').fetchone()[0],
            'gmail_drafts':c.execute("SELECT COUNT(*) FROM drafts WHERE gmail_draft_id != ''").fetchone()[0]}


def export_csv(c, dest: Path):
    rows=c.execute('SELECT * FROM accounts').fetchall()
    dest.parent.mkdir(parents=True,exist_ok=True)
    with dest.open('w',encoding='utf-8-sig',newline='') as fp:
        w=csv.writer(fp)
        w.writerow(['Companie','Domeniu','Sector','Scor fit (ipoteza)','Acces pilot estimat 0-4',
                    'Prioritate estimata','Research','Dovada (pagina)','Observatie publică','Ipoteza demo',
                    'Flux demo','Data verificare','Contact eligibil'])
        for a in sorted(rows,key=lambda x:(-priority(x),x['company'])):
            eligible=c.execute("""SELECT COUNT(*) FROM contacts WHERE domain=? AND consent_status='EXPLICIT_OPT_IN'
                AND email NOT IN (SELECT email FROM suppressions)""",(a['domain'],)).fetchone()[0]
            w.writerow([a['company'],a['domain'],a['vertical'],a['fit_score'],a['buyability_estimate'],
                        priority(a),a['research_status'],a['source_url'],a['public_fact'] if a['research_status']=='SOURCE_REVIEWED' else 'NEVERIFICAT',
                        a['hypothesis'],a['workflow'],a['reviewed_at'],eligible])


def dashboard(c, output: Path):
    rows=c.execute('SELECT * FROM accounts').fetchall()
    drafts={}
    for r in c.execute('SELECT * FROM drafts ORDER BY id DESC'):
        drafts.setdefault(r['domain'],r)
    counters=summary(c)
    cards=[]
    for a in sorted(rows,key=lambda x:(-priority(x),x['company'])):
        verified=a['research_status']=='SOURCE_REVIEWED'
        d=drafts.get(a['domain'])
        css_status='verified' if verified else 'pending'
        fact=a['public_fact'] if verified else 'Sursa nu este încă verificată. Datele V0 sunt doar ipoteze de cercetare.'
        copy=d['body'] if d else ''
        subject=d['subject'] if d else ''
        can_email=bool(c.execute("SELECT 1 FROM contacts WHERE domain=? AND consent_status='EXPLICIT_OPT_IN' AND email NOT IN (SELECT email FROM suppressions) LIMIT 1",(a['domain'],)).fetchone())
        card=(f'<article class="lead" data-company="{html.escape(a["company"].lower(),quote=True)}" '
              f'data-status="{css_status}" data-vertical="{html.escape(a["vertical"],quote=True)}">'
              f'<header class="leadtop"><div><div class="company">{html.escape(a["company"])}</div>'
              f'<div class="domain">{html.escape(a["domain"])}</div></div>'
              f'<div class="score"><b>{priority(a)}</b><span>PRIORITATE*</span></div></header>'
              f'<div class="tags"><span class="chip">{html.escape(a["vertical"])}</span>'
              f'<span class="chip {css_status}">{"Sursă revizuită" if verified else "Cercetare necesară"}</span>'
              f'<span class="chip">{"Contact eligibil" if can_email else "Fără permisiune email"}</span></div>'
              f'<p class="fact">{html.escape(fact)}</p>'
              f'<p class="hint">{html.escape(a["workflow"] if verified else "Verifică oferta și rolul decidentului înainte de personalizare.")}</p>'
              f'<div class="foot"><a href="{html.escape(a["source_url"],quote=True)}" target="_blank" rel="noreferrer">Sursa oficială ↗</a>'
              f'<button type="button" onclick="toggleDraft(this)" {"" if d else "disabled"}> {"Vezi draft" if d else "Fără draft"} </button></div>'
              f'<section class="draft" hidden><div class="subject">{html.escape(subject)}</div><pre>{html.escape(copy)}</pre>'
              f'<div class="draftnote">PREVIEW INTERN · NU ESTE APROBAT PENTRU TRIMITERE</div></section></article>')
        cards.append(card)
    template='''<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ReveNew Growth · Research Review</title><style>
:root{color-scheme:dark;--bg:#101112;--panel:#1b1d20;--border:#2c3035;--text:#f4f5f7;--muted:#9ba3ae;--blue:#5c8efa}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}
a{color:#8eb0ff;text-decoration:none}a:hover{text-decoration:underline}.shell{max-width:1300px;margin:auto;padding:54px 30px 80px}
.brand{display:flex;align-items:center;gap:12px;color:#f7f7f7;font-size:16px;font-weight:700;letter-spacing:-.4px}.mark{display:grid;place-items:center;border-radius:10px;background:#1e4cad;color:white;width:36px;height:36px;font-size:21px}
.eyebrow{text-transform:uppercase;letter-spacing:.13em;font-size:11px;color:#89909a;margin:56px 0 5px}
h1{font-size:clamp(30px,5vw,50px);line-height:1.15;letter-spacing:-1.5px;margin:0 0 12px;font-weight:620}p.subtitle{font-size:15px;color:var(--muted);max-width:720px;margin:0}
.topnote{border:1px solid #344256;background:#15202c;border-radius:12px;padding:16px 18px;margin:26px 0;color:#b1bfd3;font-size:13px}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:30px 0 28px}.stat{border:1px solid var(--border);border-radius:14px;background:var(--panel);padding:17px 20px}.stat strong{font-size:28px;line-height:1.2;display:block;letter-spacing:-.8px}.stat label{display:block;font-size:11px;letter-spacing:.04em;color:var(--muted);margin-top:5px}
.controls{display:flex;gap:12px;margin:24px 0 16px}.controls input,.controls select{background:#1b1d20;color:white;border:1px solid #32363b;border-radius:10px;padding:12px 14px;outline:0}.controls input{flex:1;min-width:140px}.controls select{min-width:190px}.controls input:focus,.controls select:focus{border-color:#648af3}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.lead{background:var(--panel);border:1px solid var(--border);border-radius:15px;padding:21px;min-width:0;transition:border-color .18s}.lead:hover{border-color:#47505e}.leadtop,.foot{display:flex;align-items:start;justify-content:space-between;gap:12px}.company{font-size:16px;font-weight:650;letter-spacing:-.2px}.domain{font-size:12px;color:#939ba6;margin-top:2px}.score{text-align:right}.score b{font-size:24px;display:block;line-height:1}.score span{font-size:9px;letter-spacing:.1em;color:#9299a4;white-space:nowrap}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}.chip{font-size:11px;color:#afb6bf;border:1px solid #34383e;padding:3px 9px;border-radius:20px}.chip.verified{color:#a7caaf;border-color:#3b5c47;background:#23352b}.chip.pending{color:#ead0a2;border-color:#5e4b2c;background:#30281c}
.fact{color:#d4d8de;margin:0 0 10px;min-height:40px}.hint{color:#9aabc3;font-size:12px;min-height:38px;margin:0 0 14px}.foot{align-items:center;border-top:1px solid #303339;padding-top:13px}.foot button{border:1px solid #414752;background:#222830;border-radius:9px;color:#e7ebf3;padding:8px 12px;cursor:pointer}.foot button:disabled{opacity:.36;cursor:not-allowed}.draft{margin-top:14px;background:#131518;border:1px solid #30343a;border-radius:10px;padding:15px}.draft .subject{font-size:14px;font-weight:620;margin-bottom:10px}.draft pre{font:12px/1.65 inherit;white-space:pre-wrap;margin:0;color:#c7cbd1}.draftnote{border-top:1px solid #32363b;color:#d9b68b;font-size:10px;letter-spacing:.08em;padding-top:9px;margin-top:10px}
.smallprint{color:#8c949e;font-size:12px;max-width:860px;margin:26px 0}.empty{color:#8c949e;padding:25px}
@media(max-width:800px){.shell{padding:32px 18px}.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.controls{flex-wrap:wrap}.controls input{flex:1 0 100%}} </style></head><body>
<main class="shell"><div class="brand"><span class="mark">R</span> ReveNew <span style="color:#737a83;font-size:12px;font-weight:450"> / Growth Engine</span></div>
<div class="eyebrow">Research workspace · V1.0</div><h1>Companiile potrivite.<br>Înaintea mesajelor.</h1><p class="subtitle">Cercetare, dovezi și un context comercial clar. Prospectarea nu înseamnă permisiune de a trimite emailuri.</p>
<div class="topnote"><strong>REVIEW ONLY</strong> · Nu există un mecanism de expediere în acest sistem. Drafturile pot fi create în Gmail numai după verificarea sursei, consimțământ documentat și aprobare umană. Site-urile și rolurile se reverifică înainte de contactare.</div>
<div class="stats">{{STATS}}</div><div class="controls"><input id="q" placeholder="Caută companie sau domeniu..." aria-label="Caută companie" oninput="filterCards()"><select id="f" onchange="filterCards()"><option value="all">Toate companiile</option><option value="verified">Sursă revizuită</option><option value="pending">Cercetare necesară</option></select></div>
<section class="grid" id="leads">{{CARDS}}</section><div class="smallprint">*Prioritatea este un scor orientativ: 72% potrivire de proces (scorul V0) + 28% accesibilitate estimată pentru pilot. Nu este probabilitate de cumpărare. Companiile nu au fost contactate, iar existența unei nevoi comerciale nu este confirmată.</div></main>
<script>function filterCards(){const q=document.getElementById('q').value.trim().toLowerCase(),s=document.getElementById('f').value;for(const e of document.querySelectorAll('.lead')){e.hidden=!(e.dataset.company.includes(q)||e.textContent.toLowerCase().includes(q))||(s!=='all'&&e.dataset.status!==s)}}function toggleDraft(b){const section=b.closest('.lead').querySelector('.draft');section.hidden=!section.hidden;b.textContent=section.hidden?'Vezi draft':'Închide draft';}</script></body></html>'''
    stats=''.join(f'<div class="stat"><strong>{counters[key]}</strong><label>{label}</label></div>' for key,label in [
         ('accounts','COMPANII IDENTIFICATE'),('sources_reviewed','SURSE REVIZUITE'),
         ('drafts','DRAFTURI PREVIEW'),('consented','CONTACTE CU ACORD')])
    dest=template.replace('{{STATS}}',stats).replace('{{CARDS}}',''.join(cards))
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(dest,encoding='utf-8')


def cli(argv=None):
    p=argparse.ArgumentParser(description='ReveNew Growth V1 — research and draft review (never sends)')
    p.add_argument('--db',type=Path,default=DB)
    sub=p.add_subparsers(dest='action',required=True)
    sub.add_parser('init')
    sub.add_parser('stats')
    b=sub.add_parser('batch');b.add_argument('--limit',type=int,default=10);b.add_argument('--ai',action='store_true');b.add_argument('--model',default=os.getenv('OPENAI_MODEL','gpt-6.1-terra'))
    cp=sub.add_parser('draft');cp.add_argument('domain');cp.add_argument('--ai',action='store_true');cp.add_argument('--model',default=os.getenv('OPENAI_MODEL','gpt-6.1-terra'))
    co=sub.add_parser('consent');co.add_argument('domain');co.add_argument('--email',required=True);co.add_argument('--proof-id',required=True);co.add_argument('--evidence',required=True);co.add_argument('--reviewer',required=True);co.add_argument('--at',required=True)
    ap=sub.add_parser('approve');ap.add_argument('domain');ap.add_argument('--recipient',required=True);ap.add_argument('--reviewer',required=True)
    sp=sub.add_parser('suppress');sp.add_argument('email');sp.add_argument('--reason',required=True)
    gd=sub.add_parser('gmail-draft');gd.add_argument('domain')
    x=sub.add_parser('export');x.add_argument('--output',type=Path,default=RELEASE/'Prospects_V1.csv')
    h=sub.add_parser('dashboard');h.add_argument('--output',type=Path,default=RELEASE/'Growth_Board_V1.html')
    v=sub.add_parser('verify-source');v.add_argument('domain');v.add_argument('--url',required=True);v.add_argument('--fact',required=True);v.add_argument('--excerpt',required=True);v.add_argument('--reviewer',required=True)
    args=p.parse_args(argv)
    c=connect(args.db)
    try:
        if args.action=='init':print('New/total/reviewed:',ingest(c))
        elif args.action=='stats':print(json.dumps(summary(c),ensure_ascii=False,indent=2))
        elif args.action=='batch':print(json.dumps(daily_batch(c,args.limit,args.ai,args.model),ensure_ascii=False,indent=2))
        elif args.action=='draft':
            d=create_draft(c,args.domain,args.ai,args.model)
            print(f'Internal preview #{d["id"]} [{d["status"]}]: {d["subject"]}')
        elif args.action=='consent':
            consent(c,args.domain,args.email,args.proof_id,args.evidence,args.reviewer,args.at)
            print('Explicit permission recorded. Nothing sent.')
        elif args.action=='approve':
            print('Human-approved unsent draft:',authorize_draft(c,args.domain,args.recipient,args.reviewer))
        elif args.action=='suppress':suppress(c,args.email,args.reason);print('Recipient suppressed')
        elif args.action=='gmail-draft':print('Created UNSENT Gmail draft:',create_gmail_draft(c,args.domain))
        elif args.action=='export':export_csv(c,args.output);print(args.output)
        elif args.action=='dashboard':dashboard(c,args.output);print(args.output)
        elif args.action=='verify-source':review_source(c,args.domain,args.url,args.fact,args.excerpt,args.reviewer);print('Review recorded')
    except (ValueError,KeyError,sqlite3.Error,urllib.error.URLError,urllib.error.HTTPError) as e:
        print('BLOCKED:',str(e),file=sys.stderr)
        return 2
    finally:c.close()
    return 0


if __name__=='__main__':raise SystemExit(cli())
