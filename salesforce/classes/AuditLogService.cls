/**
 * AuditLogService — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why audit is non-negotiable: if you cannot show who or what decided
 * something, when, and with what confidence, you cannot defend it or
 * fix it. In production this writes to a custom Audit_Log__c object
 * (see data-model.md) with restricted edit access — append-only in
 * spirit. Human overrides are logged exactly like agent decisions so
 * neither side of the partnership is invisible.
 * Fictional prototype only. Object/field names are proposed, not deployed.
 */
public with sharing class AuditLogService {

    /**
     * Log a decision. In this scaffolding the write is shown as a
     * debug + a Case comment pattern; wire it to Audit_Log__c insert
     * when deploying to a real org (see TODO.md).
     */
    public static void logDecision(Id caseId, String actor, String action, String detail) {
        String entry = '[' + Datetime.now().format() + '] ' + actor + ' — ' + action +
            (String.isNotBlank(detail) ? ' — ' + detail : '');
        System.debug(entry);
        // TODO (production): insert new Audit_Log__c(
        //   Case__c = caseId, Actor__c = actor, Action__c = action,
        //   Detail__c = detail, Timestamp__c = Datetime.now());
    }

    public static void logHumanOverride(Id caseId, String overriddenBy, String reason, String newQueue) {
        logDecision(caseId, overriddenBy, 'Human override applied',
            'New queue: ' + newQueue + ' | Reason: ' + reason);
    }
}
