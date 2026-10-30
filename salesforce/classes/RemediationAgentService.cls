/**
 * RemediationAgentService — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why this class exists: the remediation agent in core/remediation.js
 * needs a Salesforce home for patch proposals, approvals, and the
 * re-guard record. This class outlines that home. Safe, low-risk
 * fixes (output re-redaction, audit logging, citation fallback) may
 * be applied automatically in the model. High-risk fixes (triage rules,
 * escalation triggers, consent rules) become patch proposals that
 * require a named human approval — they are never silently applied,
 * and they are never marked fixed by approval alone. The working logic
 * is in core/remediation.js.
 * Fictional prototype only.
 */
public with sharing class RemediationAgentService {

    public class RemediationPatch {
        public String issueId;
        public String title;
        public String fixKind; // 'auto' or 'approval-required'
        public String risk;
        public String patchText;
        public Boolean applied;
        public Boolean approved;
        public String approvedBy;
    }

    // Build a plan from guardian issues. Auto vs approval-required is
    // decided by risk, not by convenience — see core/remediation.js
    // for the full mapping.
    public static List<RemediationPatch> buildPlan(List<PreDeploymentGuardianService.GuardianIssue> issues) {
        List<RemediationPatch> plan = new List<RemediationPatch>();
        if (issues == null) return plan;
        for (PreDeploymentGuardianService.GuardianIssue i : issues) {
            RemediationPatch p = new RemediationPatch();
            p.issueId = i.issueId;
            p.title = 'Fix: ' + i.name;
            p.patchText = i.suggestion;
            // Safe fixes: PHI re-redaction, audit logging, citation fallback.
            if (i.issueId == 'phi-leak' || i.issueId == 'audit-completeness' || i.issueId == 'citation-check' || i.issueId == 'hidden-bugs-edge-cases') {
                p.fixKind = 'auto';
                p.risk = 'Low';
                p.applied = true;
            } else {
                p.fixKind = 'approval-required';
                p.risk = 'High';
                p.applied = false;
            }
            p.approved = false;
            plan.add(p);
        }
        return plan;
    }

    // Approve a high-risk patch by name. Approval authorises the patch
    // to be implemented as a code change; it does not, by itself, mark
    // the underlying code as fixed — the re-guard must still pass on
    // the changed code in a real org.
    public static void approvePatch(RemediationPatch p, String approverName) {
        if (p == null || String.isBlank(approverName)) return;
        if (p.fixKind == 'approval-required') {
            p.approved = true;
            p.approvedBy = approverName;
        }
    }
}
