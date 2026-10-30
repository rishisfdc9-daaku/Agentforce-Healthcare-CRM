/**
 * ConversationalAgentService — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why citations are mandatory: a member acting on a benefits or claims
 * answer needs to know where it came from, and a reviewer later needs
 * the same. And the fallback is the point — "I don't know, escalating
 * to a human" is a successful outcome here, not a failure. Guessing
 * about healthcare coverage is the one thing this agent must not do.
 * Fictional prototype only. Knowledge articles below are mock titles;
 * production must query real Salesforce Knowledge with consent checks.
 */
public with sharing class ConversationalAgentService {

    public class AgentAnswer {
        public String answer;
        public List<String> citations; // e.g. KB-101 — title
        public Integer confidence;
        public Boolean escalated;
    }

    public static AgentAnswer answerQuestion(String question, String urgency) {
        AgentAnswer a = new AgentAnswer();
        a.citations = new List<String>();
        // P1 never gets a bot-only answer.
        if (urgency == 'P1') {
            a.answer = 'This looks urgent, so I am escalating you to a human agent right away. If this is an emergency, please contact emergency services or your care team immediately.';
            a.confidence = 0;
            a.escalated = true;
            return a;
        }
        String q = (question == null ? '' : question).toLowerCase();
        if (q.contains('benefit') || q.contains('coverage') || q.contains('copay')) {
            a.answer = 'Your plan covers in-network preventive care in most cases, and specialist visits usually need a referral first. Exact copay and deductible amounts depend on your plan — a human agent can confirm yours.';
            a.citations.add('KB-101 — Understanding Your Benefits and Coverage');
            a.confidence = 85; a.escalated = false;
        } else if (q.contains('claim') || q.contains('denied') || q.contains('bill')) {
            a.answer = 'If a claim is denied, check the denial reason on your Explanation of Benefits. Common reasons are missing information or an out-of-network provider. A human claims specialist can walk through the appeal steps with you.';
            a.citations.add('KB-102 — What to Do When a Claim Is Denied');
            a.confidence = 85; a.escalated = false;
        } else if (q.contains('appointment') || q.contains('schedule') || q.contains('reschedule')) {
            a.answer = 'You can book or reschedule through the member portal or by calling scheduling. If you need an earlier slot, ask to join the waitlist. For urgent symptoms, contact your care team or emergency services directly.';
            a.citations.add('KB-103 — Booking, Rescheduling, and Cancelling Appointments');
            a.confidence = 85; a.escalated = false;
        } else {
            a.answer = 'I don\'t know the answer to that from the knowledge base I can access, so I\'m escalating this to a human agent rather than guessing.';
            a.confidence = 0; a.escalated = true;
        }
        return a;
    }
}
