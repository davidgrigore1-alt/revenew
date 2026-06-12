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
};

export type Opportunity = {
  id: string;
  title: string;
  type: OpportunityType;
  status: OpportunityStatus;
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

export type CommercialSignalStatus = "new" | "reviewed" | "converted" | "ignored" | "archived";

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
