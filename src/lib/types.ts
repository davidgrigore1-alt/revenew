export type OpportunityType =
  | "public_procurement"
  | "b2b_lead"
  | "grant"
  | "partnership"
  | "invoice_followup"
  | "contract_renewal"
  | "cold_outreach"
  | "website_lead"
  | "manual";

export type OpportunityStatus =
  | "new"
  | "reviewed"
  | "action_generated"
  | "contacted"
  | "follow_up_needed"
  | "won"
  | "lost"
  | "ignored";

export type OpportunityActionType =
  | "send_email"
  | "call_contact"
  | "prepare_offer"
  | "prepare_documents"
  | "follow_up"
  | "apply_to_procurement"
  | "apply_to_grant"
  | "research_more";

export type CommercialPipelineStage = "lead" | "qualified" | "proposal" | "won" | "lost";

export type OpportunityLifecycleStatus = "open" | "won" | "lost" | "disqualified" | "archived";

export type OpportunityCommercialType =
  | "new_business"
  | "stalled_pipeline"
  | "reactivation"
  | "expansion"
  | "renewal"
  | "commercial_recovery"
  | "other";

export type OpportunityDocumentType =
  | "outreach_email"
  | "follow_up_email"
  | "offer_draft"
  | "call_script"
  | "procurement_checklist"
  | "grant_summary"
  | "linkedin_message"
  | "whatsapp_message";

export type ScoreRange = {
  fitScore: number;
  urgencyScore: number;
  moneyScore: number;
  confidenceScore: number;
};

export type Business = {
  id: string;
  owner_profile_id?: string | null;
  name: string;
  legalName: string;
  cui: string;
  website: string;
  industry: string;
  countryCode?: string;
  administrativeAreaCode?: string;
  companyPhoneE164?: string;
  postalCode?: string;
  city: string;
  county: string;
  services: string[];
  targetCustomers: string[];
  averageContractValue: number;
  targetCities: string[];
  targetIndustries: string[];
  currentSalesProcess: string;
  notificationEmail: string;
};

export type BusinessProfile = Business;

export type BusinessService = {
  id: string;
  businessId: string;
  name: string;
  description: string;
};

export type BusinessTarget = {
  id: string;
  businessId: string;
  type: "customer" | "city" | "industry";
  value: string;
};

export type OpportunityAction = {
  id: string;
  type?: OpportunityActionType;
  title: string;
  description: string;
  status: "pending" | "done" | "cancelled";
  dueDate: string;
  priority?: "low" | "medium" | "high";
  assignedToProfileId?: string | null;
  assignedToName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
};

export type OpportunityDocument = {
  id: string;
  type?: OpportunityDocumentType;
  title: string;
  content?: string;
  status: "placeholder" | "draft" | "edited" | "copied" | "ready_to_send" | "sent" | "approved" | "archived";
  generationMode?: "ai" | "local_fallback";
  createdAt?: string;
  editedAt?: string;
  copiedAt?: string;
  readyAt?: string;
  sentAt?: string;
};

export type OpportunityEvent = {
  id: string;
  type?:
    | "detected"
    | "analyzed"
    | "action_generated"
    | "follow_up_due"
    | "contacted"
    | "won"
    | "lost"
    | "ignored"
    | "ai_analysis_saved"
    | "local_analysis_saved"
    | "document_generated"
    | "document_edited"
    | "document_copied"
    | "document_ready_to_send"
    | "document_marked_sent"
    | "marked_contacted"
    | "marked_won"
    | "marked_lost"
    | "follow_up_scheduled"
    | "action_completed"
    | "action_postponed"
    | "action_cancelled"
    | string;
  label: string;
  date: string;
  description: string;
  businessId?: string | null;
  actorProfileId?: string | null;
  metadata?: Record<string, unknown>;
};

export type CrmOrganization = {
  id: string;
  businessId: string;
  name: string;
  normalizedName?: string | null;
  website?: string | null;
  industry?: string | null;
  phone?: string | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
  notes?: string | null;
  relationshipStatus?: string | null;
  isArchived?: boolean | null;
  archivedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CrmContact = {
  id: string;
  businessId: string;
  organizationId?: string | null;
  organization?: CrmOrganization | null;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  decisionRole?: string | null;
  email?: string | null;
  phone?: string | null;
  professionalUrl?: string | null;
  isActive?: boolean | null;
  isPrimaryForOrganization?: boolean | null;
  archivedAt?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type OpportunityContact = {
  id: string;
  opportunityId: string;
  businessId: string;
  contactId: string;
  role?: string | null;
  isPrimary: boolean;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  contact: CrmContact;
};

export type Opportunity = {
  id: string;
  businessId?: string;
  organizationId?: string | null;
  title: string;
  type: OpportunityType;
  status: OpportunityStatus;
  lifecycleStatus?: OpportunityLifecycleStatus;
  commercialType?: OpportunityCommercialType | null;
  ownerProfileId?: string | null;
  ownerName?: string | null;
  currency?: string;
  actualOutcomeAmount?: number | null;
  outcomeDate?: string | null;
  outcomeReason?: string | null;
  outcomeNote?: string | null;
  outcomeRecordedByProfileId?: string | null;
  outcomeRecordedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  sourceUrl?: string;
  estimatedValueLow: number;
  estimatedValueHigh: number;
  deadline?: string;
  city: string;
  county: string;
  fitScore: number;
  urgencyScore: number;
  moneyScore: number;
  confidenceScore: number;
  analysisMode?: "ai" | "local_fallback";
  contact?: {
    name: string;
    role: string;
    email?: string;
    phone?: string;
    company: string;
  };
  summary: string;
  relevance: string[];
  risks: string[];
  recommendedAction: string;
  rawSourceText: string;
  timeline: OpportunityEvent[];
  documents: OpportunityDocument[];
  actions: OpportunityAction[];
  contacts?: OpportunityContact[];
};

export type CommercialSignalSource =
  | "manual"
  | "email"
  | "phone"
  | "missed_call"
  | "website_form"
  | "whatsapp"
  | "instagram"
  | "csv_import"
  | "ai_receptionist"
  | "referral"
  | "other";

export type CommercialSignalStatus =
  | "new"
  | "analyzing"
  | "ready_for_review"
  | "approved"
  | "dismissed"
  | "duplicate"
  | "postponed"
  | "converted"
  | "failed"
  | "reviewed"
  | "ignored"
  | "archived";

export type CommercialSignalAnalysisStatus = "not_started" | "analyzing" | "completed" | "failed";
export type CommercialSignalReviewStatus = "new" | "ready_for_review" | "approved" | "dismissed" | "duplicate" | "postponed" | "converted";
export type RecoverabilityConfidence = "low" | "medium" | "high";
export type RecoverabilityUrgency = "low" | "medium" | "high" | "critical";

export type CommercialSignalPriority = "low" | "medium" | "high" | "urgent";

export type CommercialSignalEvent = {
  id: string;
  businessId: string;
  signalId: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdByProfileId?: string | null;
  createdAt: string;
};

export type CommercialSignal = {
  id: string;
  businessId: string;
  source: CommercialSignalSource;
  sourceLabel?: string | null;
  status: CommercialSignalStatus;
  priority: CommercialSignalPriority;
  title: string;
  sourceReference?: string | null;
  lastInteractionAt?: string | null;
  analysisStatus: CommercialSignalAnalysisStatus;
  reviewStatus: CommercialSignalReviewStatus;
  analysisMode?: "ai" | "deterministic_fallback" | null;
  recoverabilityScore?: number | null;
  confidenceLevel?: RecoverabilityConfidence | null;
  estimatedRecoverableValue?: number | null;
  urgencyLevel?: RecoverabilityUrgency | null;
  primaryRecoveryReason?: string | null;
  analysisExplanation?: string | null;
  missingInformation: string[];
  uncertaintyNotes: string[];
  suggestedDueDate?: string | null;
  suggestedOwnerProfileId?: string | null;
  matchedOrganizationId?: string | null;
  matchedContactId?: string | null;
  duplicateRisk: boolean;
  duplicateSignalId?: string | null;
  reviewDueAt?: string | null;
  reviewedDraft?: string | null;
  dismissalReason?: string | null;
  analyzedAt?: string | null;
  reviewedAt?: string | null;
  approvedByProfileId?: string | null;
  contactName?: string | null;
  contactCompany?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactRole?: string | null;
  rawMessage?: string | null;
  extractedSummary?: string | null;
  detectedNeed?: string | null;
  serviceInterest?: string | null;
  location?: string | null;
  requestedDate?: string | null;
  estimatedValueMin?: number | null;
  estimatedValueMax?: number | null;
  currency: string;
  urgencyScore: number;
  fitScore: number;
  confidenceScore: number;
  recommendedAction?: string | null;
  nextStep?: string | null;
  notes?: string | null;
  convertedOpportunityId?: string | null;
  createdByProfileId?: string | null;
  assignedToProfileId?: string | null;
  occurredAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  events?: CommercialSignalEvent[];
};

export type LeadStatus = "new" | "qualified" | "contacted" | "in_outreach" | "won" | "lost";

export type LeadContact = {
  id: string;
  companyName: string;
  industry: string;
  city: string;
  contactName: string;
  email?: string;
  phone?: string;
  leadScore: number;
  estimatedBudget: number;
  needSignal: string;
  recommendedAngle: string;
  status?: LeadStatus;
};

export type Lead = LeadContact;

export type OutreachMessage = {
  id: string;
  subject: string;
  body: string;
  status: "draft" | "scheduled" | "sent" | "replied";
  dueDate?: string;
  recipientCompany?: string;
};

export type OutreachSequence = {
  id: string;
  name: string;
  target: string;
  status: "draft" | "active" | "paused" | "completed";
  messages: OutreachMessage[];
  followUps: Array<{
    id: string;
    task: string;
    dueDate: string;
    status?: "pending" | "done";
  }>;
};

export type WeeklyReport = {
  opportunitiesFound: number;
  estimatedPipelineValue: number;
  actionsCompleted: number;
  actionsPrepared: number;
  risks: string[];
  suggestedOutreachAngle: string;
  recommendedFocus: string;
  topOpportunities: Opportunity[];
  deadlinesThisWeek: Opportunity[];
  followUpsNeeded: Opportunity[];
};
