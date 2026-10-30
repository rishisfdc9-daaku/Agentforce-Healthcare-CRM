/**
 * caseSummaryPanel.js — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why this panel is separate from the console: a summary is read by
 * different people (supervisors, next-shift agents, auditors) than the
 * agent working the case live. Keeping it its own component means it
 * can be placed on Case pages, queues, and handoff views without
 * dragging the whole console along — and its grounding note travels
 * with it, so readers know the summary was extracted, not invented.
 * Fictional prototype only.
 */
import { LightningElement, api, track } from 'lwc';

export default class CaseSummaryPanel extends LightningElement {
    @api recordId; // Case Id
    @track summary = null;

    async handleGenerate() {
        // TODO: imperative Apex -> CaseSummarisationService.summariseCase,
        // then AuditLogService.logDecision. Pass redacted history only.
        // eslint-disable-next-line no-console
        console.log('TODO: wire handleGenerate to CaseSummarisationService for Case', this.recordId);
    }
}
