/**
 * CaseSummarisationService — Agentforce in Healthcare CRM (SCAFFOLDING, NOT DEPLOYED)
 * Author: Rishi Gullapalli (rishisfdc9-daaku)
 *
 * Why extractive first: a summary that invents a detail is dangerous in
 * healthcare. This scaffolding mirrors core/summarisation.js — select
 * sentences from the case history, never generate new claims. A future
 * Prompt Builder version must keep the same grounding rule and be
 * checked by the hallucination check before any summary is shared.
 * Fictional prototype only.
 */
public with sharing class CaseSummarisationService {

    public class SummaryResult {
        public String summary;
        public List<String> bulletPoints;
        public String note;
    }

    public static SummaryResult summariseCase(Case c, List<String> historyLines) {
        SummaryResult out = new SummaryResult();
        out.bulletPoints = new List<String>();
        List<String> lines = new List<String>();
        if (c.Subject != null) lines.add(c.Subject);
        if (c.Description != null) lines.add(c.Description);
        if (historyLines != null) lines.addAll(historyLines);

        if (lines.isEmpty()) {
            out.summary = 'No case details provided yet.';
            out.note = 'Empty case — no summary generated.';
            return out;
        }
        // Take up to the first 3 substantive lines, verbatim.
        for (String line : lines) {
            if (out.bulletPoints.size() >= 3) break;
            if (String.isNotBlank(line)) out.bulletPoints.add(line.trim());
        }
        out.summary = String.join(out.bulletPoints, ' ');
        out.note = 'Extractive summary: every sentence is copied from the case history, nothing was invented.';
        return out;
    }
}
