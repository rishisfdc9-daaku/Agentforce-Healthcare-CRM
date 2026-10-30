# Data Model — Agentforce in Healthcare CRM (Proposed, NOT deployed)

Author: Rishi Gullapalli (rishisfdc9-daaku)
Fictional prototype only. No real patient data. Field names below are
proposed for a future Salesforce org — nothing here is deployed.

## Design principle
I keep clinical, support, and governance data in separate objects on
purpose. A Case is a support record, not a medical record. Care details
belong in care objects, decisions belong in audit objects, and nothing
should be readable just because someone can see a Case. That separation
is what makes consent, redaction, and audit enforceable instead of
aspirational.

## Case (standard object, extended)
| Field | Type | Notes |
|---|---|---|
| Subject, Description | Text / Long Text | Description stored REDACTED. Original free text, if retained at all, lives only in a restricted field with audit access. |
| Description_Redacted__c | Long Text | The text agents actually see and triage on. |
| Urgency__c | Picklist | P1 Critical / P2 High / P3 Medium / P4 Low |
| Category__c | Picklist | Benefits / Claims / Appointment / Care Coordination / General Enquiry |
| Triage_Confidence__c | Number (0–100) | Below 70 → Human Review Queue (see EscalationService). |
| Triage_Reasons__c | Long Text | Keywords/reasons, so any decision can be explained later. |
| Routing_Queue__c | Text | Queue name + routing reason. |
| Requires_Human_Review__c | Checkbox | True for P1, low confidence, or sensitive topics. |
| SLA_Target_Minutes__c | Number | P1: 15, P2: 60, P3: 480, P4: 1440. |
| Flagged_Emergency__c | Checkbox | Caller-flagged emergency — forces P1. |
| Member_Requested_Human__c | Checkbox | Member asked for a human — forces escalation. |
| Consent_On_File__c | Checkbox | Consent recorded before profile/integration access. |
| AccountId | Lookup → Account | Member (Person Account — see below). |
| Care_Plan__c | Lookup → Care_Plan__c | Optional link when care coordination is involved. |

## Account / Person Account (member)
| Field | Type | Notes |
|---|---|---|
| Person Account record type | — | One member = one Person Account in this design. |
| Display_Name_Masked__c | Text | Masked display name for agent views (e.g. first name + masked ID). |
| Member_Id_Masked__c | Text | Only last 4 shown (see RedactionService.maskMemberId). Never store a full SSN. |
| Consent_On_File__c | Checkbox | Governs Data Cloud profile + integration access. |
| Preferred_Contact__c | Picklist | Phone / Email / Portal — member preference, not agent convenience. |

Never store: full SSN, full member ID in clear text in agent-visible
fields, passwords, or credentials. Those do not belong in this model.

## Care Plan (Care_Plan__c, custom)
| Field | Type | Notes |
|---|---|---|
| Name | Text | e.g. "Fictional Care Plan — Diabetes Follow-up" (mock only). |
| Account__c | Lookup → Account | Member. |
| Coordinator__c | Lookup → User | Care coordinator owner. |
| Goals__c | Long Text | Member goals in plain language. |
| Next_Steps__c | Long Text | Next appointments / referrals (process info, not clinical orders). |
| Status__c | Picklist | Active / On Hold / Completed. |

Care Plan is deliberately process-focused: coordination, appointments,
and follow-ups. Clinical orders and diagnoses belong in the EHR, not
in this CRM scaffolding.

## Audit Log (Audit_Log__c, custom — append-only in spirit)
| Field | Type | Notes |
|---|---|---|
| Case__c | Lookup → Case | The case the decision belongs to. |
| Timestamp__c | DateTime | When the decision happened. |
| Actor__c | Text | e.g. "Triage Agent", "Conversational Agent", "Human Agent — name". |
| Action__c | Text | e.g. "Case triaged", "Answered from knowledge base", "Human override applied". |
| Detail__c | Long Text | Confidence, queue, citations, override reason. Redacted text only. |
| Agent_Name__c | Text | Agent/model identifier, so evals can compare versions. |

Access: create for agents/system, read for supervisors/auditors, edit/
delete restricted to admins only. Audit records are never edited to
"fix" history — corrections are new entries.

## Knowledge Article (standard Knowledge, mock content in demo)
| Field | Notes |
|---|---|
| Article ID (KB-101 … KB-106 in demo) | Stable ID cited in every conversational answer. |
| Title, Body | Plain-language process answers only. No medical advice. |
| Review_Date__c | Owner + freshness date — stale articles must not be cited blindly. |

## Relationships (summary)
```
Person Account (member) ──< Case ──< Audit_Log__c
        │                    │
        └──< Care_Plan__c ────┘ (optional, care coordination cases)
Case ──< Case Comments / Chat Transcript (handoff preserved on escalation)
Knowledge Article ── cited by ── Conversational Agent answers on Case
```
