/**
 * agentConsole.js — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why this component keeps the human controls visible: an agent console
 * that hides escalation and override behind menus teaches agents to
 * trust the bot by default. Here "Escalate to Human" and "Apply Human
 * Override" sit next to the triage result, on purpose.
 *
 * NOTE: Apex calls are marked TODO — wire to the classes in
 * ../classes/ when deploying to a real org (see TODO.md). The demo in
 * ../../demo/ shows the same flow working end-to-end in plain JS.
 * Fictional prototype only.
 */
import { LightningElement, api, track } from 'lwc';

export default class AgentConsole extends LightningElement {
    @api recordId; // Case Id when placed on a Case record page
    @track description = '';
    @track question = '';
    @track triage = null;
    @track answer = null;
    @track overrideQueue = '';
    @track overrideReason = '';

    handleDescriptionChange(event) { this.description = event.target.value; }
    handleQuestionChange(event) { this.question = event.target.value; }
    handleOverrideQueueChange(event) { this.overrideQueue = event.target.value; }
    handleOverrideReasonChange(event) { this.overrideReason = event.target.value; }

    get triageReasons() {
        return this.triage && this.triage.reasons ? this.triage.reasons.join('; ') : '';
    }

    get answerCitations() {
        return this.answer && this.answer.citations ? this.answer.citations.join(', ') : 'None — escalated';
    }

    async handleTriage() {
        // TODO: imperative Apex -> RedactionService.redact, then
        // CaseTriageService.triageCase, then AuditLogService.logDecision.
        // Keep the redacted text as the only text sent to the agent.
        // eslint-disable-next-line no-console
        console.log('TODO: wire handleTriage to CaseTriageService for Case', this.recordId);
    }

    async handleAsk() {
        // TODO: imperative Apex -> ConversationalAgentService.answerQuestion.
        // If answer.escalated, call EscalationService + AuditLogService.
        // eslint-disable-next-line no-console
        console.log('TODO: wire handleAsk to ConversationalAgentService');
    }

    handleEscalate() {
        // TODO: imperative Apex -> EscalationService + AuditLogService.
        // Must preserve the full conversation + triage history on the Case.
        // eslint-disable-next-line no-console
        console.log('TODO: wire handleEscalate to EscalationService');
    }

    handleOverride() {
        // Human override: never silent. Record who, what changed, and why.
        // TODO: imperative Apex -> AuditLogService.logHumanOverride.
        // eslint-disable-next-line no-console
        console.log('TODO: wire handleOverride to AuditLogService', this.overrideQueue, this.overrideReason);
    }
}
