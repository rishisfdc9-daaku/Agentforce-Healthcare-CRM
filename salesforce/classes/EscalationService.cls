/**
 * EscalationService — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why this is its own class: escalation rules change for governance
 * reasons, not product reasons, and they should be reviewable in one
 * place. Any single trigger escalates — the list is deliberately
 * overlapping so one missed check does not strand a risky case.
 * Fictional prototype only.
 */
public with sharing class EscalationService {

    public static String resolveQueue(CaseTriageService.TriageResult t) {
        if (t.urgency == 'P1') return 'Clinical Escalation (Human)';
        if (t.requiresHumanReview) return 'Human Review Queue';
        if (t.category == 'Benefits') return 'Benefits & Coverage';
        if (t.category == 'Claims') return 'Claims & Billing';
        if (t.category == 'Appointment') return 'Scheduling & Appointments';
        if (t.category == 'Care Coordination') return 'Care Coordination';
        return 'General Member Support';
    }

    public static Boolean shouldEscalate(CaseTriageService.TriageResult t, Boolean memberRequestedHuman, Boolean chatFallback) {
        if (t == null) return true;
        if (t.urgency == 'P1') return true;
        if (t.confidence < CaseTriageService.HUMAN_REVIEW_THRESHOLD) return true;
        if (t.requiresHumanReview) return true;
        if (memberRequestedHuman == true) return true;
        if (chatFallback == true) return true;
        return false;
    }
}
