/**
 * CaseTriageService — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why this class exists: triage is the front door of the support process.
 * I keep the decision contract explicit — urgency, category, confidence,
 * reasons, queue — so that whatever model powers it later (keyword rules
 * today, Agentforce tomorrow) still has to explain itself the same way.
 * Confidence below 70 always means human review. That rule lives here
 * in code, not in a prompt someone can quietly edit.
 *
 * Fictional prototype only. No real patient data, no live integrations.
 */
public with sharing class CaseTriageService {

    public static final Integer HUMAN_REVIEW_THRESHOLD = 70;

    public class TriageResult {
        public String urgency;        // P1, P2, P3, P4
        public String category;       // Benefits, Claims, Appointment, Care Coordination, General Enquiry
        public Integer confidence;    // 0-100
        public List<String> reasons;
        public String queue;
        public Boolean requiresHumanReview;
    }

    /**
     * Triage a Case. In production this would call an Agentforce agent;
     * in this scaffolding it applies the same transparent rules as
     * core/triage.js so behaviour can be compared side by side.
     * Callers must pass already-redacted text — see RedactionService.
     */
    public static TriageResult triageCase(Case c, String redactedDescription) {
        TriageResult r = new TriageResult();
        r.reasons = new List<String>();
        String text = ((c.Subject == null ? '' : c.Subject) + ' ' +
                       (redactedDescription == null ? '' : redactedDescription)).toLowerCase();

        // Safety first: P1 keywords always win. I would rather over-escalate
        // a routine case than under-triage a possible emergency.
        if (containsAny(text, new List<String>{'chest pain','difficulty breathing','suicidal','self-harm','overdose','seizure','stroke','emergency','ambulance'})) {
            r.urgency = 'P1';
            r.reasons.add('Safety keyword found — P1 Critical');
        } else if (containsAny(text, new List<String>{'insulin','medication ran out','prescription denied','urgent','pain getting worse'})) {
            r.urgency = 'P2';
            r.reasons.add('Urgent keyword found — P2 High');
        } else if (containsAny(text, new List<String>{'claim','benefit','appointment','referral','coverage'})) {
            r.urgency = 'P3';
            r.reasons.add('Time-sensitive keyword found — P3 Medium');
        } else {
            r.urgency = 'P4';
            r.reasons.add('No urgent keywords — P4 Low');
        }

        if (text.contains('claim') || text.contains('bill')) { r.category = 'Claims'; }
        else if (text.contains('benefit') || text.contains('coverage') || text.contains('copay')) { r.category = 'Benefits'; }
        else if (text.contains('appointment') || text.contains('schedule')) { r.category = 'Appointment'; }
        else if (text.contains('care coordinator') || text.contains('referral') || text.contains('care plan')) { r.category = 'Care Coordination'; }
        else { r.category = 'General Enquiry'; }
        r.reasons.add('Category keyword match: ' + r.category);

        r.confidence = r.reasons.size() > 1 ? 85 : 55;
        r.requiresHumanReview = (r.urgency == 'P1' || r.confidence < HUMAN_REVIEW_THRESHOLD);
        r.queue = EscalationService.resolveQueue(r);
        return r;
    }

    private static Boolean containsAny(String text, List<String> keywords) {
        for (String k : keywords) { if (text.contains(k)) return true; }
        return false;
    }
}
