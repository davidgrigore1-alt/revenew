begin;

-- The approval RPCs remain SECURITY INVOKER so every read and write continues
-- to execute as the authenticated caller and remains subject to the existing
-- workspace-scoped RLS policies. Only the columns written transactionally by
-- those RPCs are exposed; no destructive or broad table-level write privilege
-- is granted.

grant insert (business_id, name, normalized_name)
on table public.crm_organizations to authenticated;

grant insert (
  business_id, organization_id, full_name, normalized_name,
  email, normalized_email, phone, is_primary_for_organization
)
on table public.crm_contacts to authenticated;

grant update (organization_id, is_primary_for_organization)
on table public.crm_contacts to authenticated;

grant insert (
  business_id, organization_id, title, type, status, commercial_type,
  owner_profile_id, currency, estimated_value_low, estimated_value_high,
  deadline, fit_score, urgency_score, money_score, confidence_score,
  summary, relevance, risks, recommended_action, raw_source_text,
  contact_name, contact_email, contact_phone, ai_summary, why_relevant,
  analysis_mode
)
on table public.opportunities to authenticated;

grant update (owner_profile_id, deadline, recommended_action, updated_at)
on table public.opportunities to authenticated;

grant insert (business_id, opportunity_id, contact_id, role, is_primary)
on table public.opportunity_contacts to authenticated;

grant insert (
  business_id, opportunity_id, type, title, description, status,
  priority, due_at, assigned_to_profile_id
)
on table public.opportunity_actions to authenticated;

grant insert (
  business_id, opportunity_id, document_type, title, body, status,
  generation_mode, edited_at
)
on table public.opportunity_documents to authenticated;

grant insert (opportunity_id, event_type, label, description)
on table public.opportunity_events to authenticated;

grant update (
  status, review_status, converted_opportunity_id, matched_organization_id,
  matched_contact_id, assigned_to_profile_id, reviewed_draft, reviewed_at,
  approved_by_profile_id, conversion_idempotency_key, updated_at
)
on table public.commercial_signals to authenticated;

grant insert (
  business_id, signal_id, event_type, description, metadata,
  created_by_profile_id
)
on table public.commercial_signal_events to authenticated;

commit;

notify pgrst, 'reload schema';
