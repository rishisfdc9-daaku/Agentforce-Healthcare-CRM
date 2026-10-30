/**
 * RedactionService — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why redaction runs first: a helpful answer that leaks a phone number
 * or member ID is a breach, not a success. Every free-text field passes
 * through here before triage, summarisation, chat context, or audit
 * detail. Patterns mirror core/redaction.js so demo and Apex agree.
 * Fictional prototype only.
 */
public with sharing class RedactionService {

    public static String redact(String text) {
        if (String.isBlank(text)) return text;
        String out = text;
        // SSN-like: 123-45-6789
        out = out.replaceAll('\\b\\d{3}-\\d{2}-\\d{4}\\b', '[SSN REDACTED]');
        // Phone-like: 555-123-4567 (and common variants)
        out = out.replaceAll('\\b\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b', '[PHONE REDACTED]');
        // Email
        out = out.replaceAll('[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}', '[EMAIL REDACTED]');
        // Fictional member IDs: MEM-123456 / MBR1234567
        out = out.replaceAll('(?i)\\b(?:MEM|MBR)[- ]?\\d{6,10}\\b', '[MEMBER ID REDACTED]');
        return out;
    }

    public static String maskMemberId(String memberId) {
        if (String.isBlank(memberId) || memberId.length() <= 4) return '****';
        return '****' + memberId.right(4);
    }
}
