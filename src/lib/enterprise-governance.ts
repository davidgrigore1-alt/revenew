"use server";

import {
  assignEnterpriseWork as assignEnterpriseWorkInternal,
  createWorkspaceInvitation as createWorkspaceInvitationInternal,
  decideGovernedApproval as decideGovernedApprovalInternal,
  revokeWorkspaceInvitation as revokeWorkspaceInvitationInternal,
  updateGovernancePolicies as updateGovernancePoliciesInternal,
  updateWorkspaceMember as updateWorkspaceMemberInternal
} from "@/lib/enterprise-governance-internal";
import type { EnterpriseMemberRole } from "@/lib/enterprise-governance-core";

export async function createWorkspaceInvitation(formData: FormData) {
  return createWorkspaceInvitationInternal(formData);
}

export async function revokeWorkspaceInvitation(invitationId: string) {
  return revokeWorkspaceInvitationInternal(invitationId);
}

export async function updateWorkspaceMember(memberId: string, role: EnterpriseMemberRole | "inactive") {
  return updateWorkspaceMemberInternal(memberId, role);
}

export async function updateGovernancePolicies(formData: FormData) {
  return updateGovernancePoliciesInternal(formData);
}

export async function assignEnterpriseWork(entityType: "opportunity" | "action", entityId: string, assigneeProfileId: string) {
  return assignEnterpriseWorkInternal(entityType, entityId, assigneeProfileId);
}

export async function decideGovernedApproval(approvalId: string, decision: "approved" | "rejected") {
  return decideGovernedApprovalInternal(approvalId, decision);
}