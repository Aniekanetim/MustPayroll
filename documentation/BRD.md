# Business requirements

MustPayroll models weekly payroll for an employer: an operator reviews employee earnings, authorizes eligible amounts and records payment before notifying the employee. It uses local test records and simulated delivery; no real funds move.

## Business problem

Payroll operations must turn approved employee earnings into accurate payment records. A processing problem becomes more serious when recovery repeats work that already succeeded. In particular, failure to send a payment notification must not make the employee eligible for another payment.

MustPayroll models this problem using weekly earnings, a local payment ledger and simulated notification delivery. It makes the relationship between approval, payment and recovery visible to the operator.

## People and responsibilities

| Participant | Responsibility or interest |
|---|---|
| Payroll operator | Review employee destinations and earnings, resolve approvals, process the correct period and investigate unfinished or inconsistent records. |
| Employee | The person whose earnings and payment destination are represented in the records. There is no employee self-service portal. |
| Quality assurance reviewer | Check business expectations against the reproducible application behaviour and recorded verification. |

These are business responsibilities. The local application has no authenticated user roles.

## Required business outcomes

| Outcome | What must be true |
|---|---|
| Accurate entitlement | Only approved earnings in the selected period contribute; each earning ID contributes once. |
| Accurate employee payment | Approved earnings are combined into one payment per employee and period in the loaded payroll records. |
| Clear approval control | Pending and rejected earnings stay unpaid without preventing approved earnings in the same period from being paid. |
| Stable processed payroll | Processing freezes the selected earnings and totals. Later adjustments belong in a later open period. |
| Safe recovery | Retrying preserves successful payment references, amounts and destinations while completing outstanding work. |
| Reliable notification state | Notification follows successful payment. Failed delivery leaves the payment intact and recoverable delivery work saved. |
| Traceable reconciliation | The operator can compare approved totals, recorded amounts, receipts and notification status. A mismatch requires investigation before further processing. |

Each build keeps its own payroll records. The [product requirements](PRD.md) turn these outcomes into acceptance conditions. Exact period and identity policies are defined in the existing [business rules](../QA/Quality%20assurance/business_rules.md).

## Business flow

1. Identify the employee and inspect their recorded payment destination.
2. Record the amount and when it was earned, then approve or reject Pending records.
3. Select the Tuesday pay date and review the preceding completed week's approved earnings.
4. Confirm processing. Save the selected earnings and employee totals, then record payments and attempt their notifications.
5. Compare the saved amounts and references with approved payroll. Recover only unpaid amounts or Pending delivery.

Payment and notification have separate outcomes. A payment can be complete while delivery remains pending. Its notification instruction must still exist; a payment with no notification record cannot be recovered through notification retry. The operator therefore checks both before deciding whether payroll needs recovery or only notification delivery needs retrying. The [user flows](user-flows.md) explain those decisions step by step.

## Scope and operating assumptions

The current application provides seven modules: Overview, Employees, Earnings, Pay runs, Payments, Notifications and Settings. It uses one fixed currency, USD, and one weekly UTC period policy. Three employees are seeded. Additional employees can be added with a bank name and four-digit account ending; existing employee destinations are view-only.

Processing is manual. Pay on Tuesday 09:00 UTC models the selected due instant without waiting or changing the workstation clock; it does not start a background payment schedule. Past and future pay weeks can be selected. Settings can reset one local week for a repeatable cycle while preserving employees, other weeks and audit history. Both builds run independently on localhost, without authentication, using synthetic records and a local database.

Bank transfers, external email or SMS delivery, tax, deductions, full HR onboarding, bank-detail changes, administrator overrides and permission management are outside the current product scope. The recorded assessment does not establish production concurrency or crash-durability guarantees.

## Risks the product must address

- **Unapproved payment:** Pending or Rejected earnings contribute to payroll.
- **Duplicate payment:** recovery can make recorded pay exceed approved earnings.
- **Wrong-period payment:** an incorrect boundary or timezone conversion can omit earnings or pay them early.
- **Misleading notification:** sending confirmation before payment succeeds misrepresents the financial record.
- **Lost recovery work:** saving payment without its notification leaves delivery incomplete with nothing to retry.
- **Hidden disagreement:** a status label alone can conceal a mismatch between approved totals and payment records.

Acceptance depends on observable records and the defined rules. Production loss, incident frequency and measured support reduction are not established by this local application.

## Business acceptance

The Quest assessment requires a check to detect faulty behavior and pass after correction. The buggy build retains controlled defects; the fixed build corrects them. Independent application records let a reviewer repeat both observations using equivalent inputs and unchanged expectations. The [build guide](README.md#expected-behaviour-and-the-two-builds) identifies the versions.

For the selected recovery example, $1,500 of approved pay must remain one $1,500 payment after retry, with the original reference and linked notification preserved. Buggy records $3,000 across two payments; fixed retains the required outcome. The [paired results](../QA/directive.md#quality-control-results-and-verification-evidence) record the buggy and fixed outcomes. The [release checklist](../QA/Quality%20assurance/release_readiness.md) records which conditions passed and the limits of that decision.
