# Product requirements

## Product and scope

MustPayroll lets an employer record employee earnings, approve eligible amounts, process weekly payroll and inspect payment and notification records. A pay run saves the earning selection and employee totals used for payment. A notification is the saved instruction to tell the employee about that payment. The [business requirements](BRD.md) explain the intended outcomes.

The requirements apply to both builds. The buggy version preserves deliberate violations; the fixed version supplies the corrected reference. Independent applications and databases let the reviewer repeat the same checks before and after correction. The [build guide](README.md#expected-behaviour-and-the-two-builds) explains the comparison.

The [business rules](../QA/Quality%20assurance/business_rules.md) define exact calculations and recovery policy. The [module guides](README.md#how-the-modules-connect) explain each screen's controls. Requirements are ordered from record setup through selection, processing, payment, delivery, recovery and local reset.

## Requirements and acceptance conditions

### WS-01

**Load and retain payroll records in the correct build.** The application automatically loads its employees, earnings, runs, payments and notifications. On first use, it creates the standard example. A test-preparation link can load a specific set of records in the matching build. Refreshing a page retains saved records; it does not reset a scenario.

Acceptance: all views use the same loaded payroll records; records belonging to the other build are rejected. The internal record identifier provides neither authentication nor authorization. The interface has no controls for creating or switching between sets of records.

### EMP-01

**Add employees and show their recorded destinations.** The directory opens employee details showing role, department, bank and masked account ending. The detail page links to Record earnings with that employee preselected. Payments retain the name and destination saved when they were created.

Acceptance: the operator can connect the employee, earning and receipt. Add employee accepts a name, role, department and bank (each 1–80 nonblank characters) and exactly four account-ending digits. The new employee appears in the directory and earning form. Existing destinations cannot be edited.

### EARN-01

**Record earnings and review Pending records before payroll.** Each earning belongs to an existing employee and carries a description, USD amount, UTC occurrence time and approval status.

Acceptance:

- Description is required and limited to 160 characters. Amount is $0.01–$1,000,000.00 with up to two decimal places.
- New records can be Pending approval or Approved. Recording and review actions create no payment.
- Pending records in open periods offer Approve earnings and Reject earnings. Rejection confirms employee, description and amount; Cancel leaves the record Pending.
- Decisions retain the earning ID and record `earning_approved` or `earning_rejected`. Approved and Rejected decisions are final; repeating a decision adds no audit event.
- Pending records in processed periods show Pay period locked; approval and rejection are blocked.
- Only Approved earnings contribute. Pending and Rejected amounts stay unpaid without blocking approved pay. The list filters all three statuses; the interface provides no earning edit or delete action.

### EARN-02

**Count a permanent earning ID once.** Reimporting the same ID with identical data retains one earning. Conflicting data for that ID is rejected. The form generates a new ID for each submission; TC04 checks identical-ID imports through API requests supplied for Postman reproduction.

Acceptance: repeated identical import does not increase pay. Re-entering the same description in the form creates a different ID and is not automatically deduplicated.

### PER-01

**Select earnings by their UTC occurrence time.** Tuesday at 09:00 UTC identifies the preceding completed Monday-to-Monday week, including its start and excluding its end. The form labels its date/time input UTC; imported timestamps must contain Z or an explicit offset.

Acceptance: for 13 October 2026, the window is 5 October 00:00 UTC through 12 October 00:00 UTC, exclusive. The interface displays both boundaries as 5 October 2026, 00:00 UTC → 12 October 2026, 00:00 UTC, with Start included · End excluded. The same formatting applies to future dates and month/year transitions. The Pay date input accepts past or future Tuesdays without a minimum or maximum based on the current date. Non-Tuesday selections are rejected while retaining the previous selection.

### RUN-02

**Combine approved earnings correctly.** Sum eligible earnings per employee using whole cents. Within the loaded payroll records, one employee-period payment must equal that employee's frozen approved total.

Acceptance: totals and employee breakdown agree with the saved earnings and payments. No deductions, tax or currency conversion are calculated. The buggy policy omits the approval filter and violates this requirement in TC01; see [PAY-002](../QA/Quality%20Control/bug_report/UI%20functional%20bug%20reports/unapproved-earnings-paid-functional.md).

### RUN-01

**Review and confirm the selected run before saving it.** Show the period, approved and recorded totals, unpaid amount and employee breakdown.

Acceptance:

- Pending approvals do not block approved pay. A period containing earnings can be submitted; when none are approved, the fixed service refuses processing without saving a run, locking the period or creating payments.
- Pay on Tuesday 09:00 UTC opens confirmation showing the modeled due time, approved total, employee count and lock consequence. Cancel changes no records.
- Confirmation supplies matching `scheduledPayRunAt` and `simulatedProcessingAt` values for the selected Tuesday at 09:00 UTC, independently of the workstation clock. An absent or mismatched simulated instant is rejected before processing.
- The first valid request saves the earning selection and employee totals. These frozen totals remain locked even if a later payment attempt fails.
- New earnings, approvals and rejections in that period are refused until a local Settings reset. Without reset, corrections use an approved adjustment in a later open period referencing the original earning.

### PAY-01

**Record payment before attempting notification.** A failed payment creates neither a payment record nor a notification. A successful payment retains its reference, employee, amount, destination and creation time.

Acceptance: notification attempts follow committed payment. When some employees remain unpaid, retrying the original run pays only the outstanding employees.

### REC-02

**Save payment and delivery work together.** A new payment and its pending notification must commit in one database transaction. Every committed payment has exactly one linked notification record, available for delivery or recovery.

Acceptance: ordinary processing with no failure setup creates one payment and one linked notification. Without a delivery fault, its status becomes Sent. Notification-only retry cannot reconstruct an absent instruction. The buggy build violates this requirement in TC08.

### NOT-01

**Recover notification independently of payment.** Successful delivery changes Pending to Sent. Failed delivery leaves Pending, records the error and attempt count, and preserves payment. Retry pending notifications attempts existing pending messages across all loaded pay periods; it does not create payments or missing notification records.

Acceptance: sent messages are not redelivered by this action. In the fixed build, pay-run recovery also attempts pending notifications across all loaded pay periods. Sent represents simulated service acceptance, not verified receipt in a real inbox.

### REC-01

**Preserve completed payment during retry.** Retrying the original pay run reuses successful payments and their notification identities. It must not create another payment for the same earnings, alter the payment object or change the pay period.

Acceptance: after a $1,500 payment, retry leaves one unchanged payment and its original notification record. Normal delivery is Sent; failed delivery remains recoverable without another payment. The buggy build violates this requirement in TC07.

### VIEW-01

**Display the records needed to assess payroll outcomes.** Overview and Pay runs use the selected period. Employee histories, Earnings, Payments and Notifications span all loaded pay periods.

Acceptance:

- Records identify their period. Pending-notification counts cover all loaded pay periods. Earnings filters by status; Payments filters by employee.
- A dismissible toast remains visible while scrolling. It reports recorded amounts, payment counts and notification totals. Expandable details identify employees, amounts, references and delivery states, including unpaid employees.
- Pay runs lists the selected period's payments as Paid. Approved totals, recorded amounts, source approval statuses and distinct references remain available for comparison.
- Paid describes a saved record. The interface uses ordinary statuses without diagnosing approval breaches or duplicate payments or blocking retry for those discrepancies. QA establishes defects by comparing the records with the business rule.
- Request errors, unrecorded approved amounts and Pending delivery receive operational feedback. Success feedback must not claim that a missing or Pending notification was sent.
- Settings clears local cycle records; reconciliation, refund and reversal editing are outside the available controls.

### RECEIPT-01

**Provide inspectable payment evidence.** A receipt shows reference, employee, amount, period start, recorded time, saved destination and notification status. Included earnings lists the run's frozen contributing earning IDs, amounts and approval statuses as ordinary record details. Earning edits, approvals and rejections are blocked after the run is saved. The operator can copy the reference or download a text receipt. Export payments downloads the currently employee-filtered history as CSV.

Acceptance: receipts and exports correspond to the visible saved records. A missing receipt reports Payment not found; failed clipboard access offers downloading the receipt instead.

### RESET-01

**Reset only the selected pay week.** Settings shows its earning, payment and notification counts. Reset selected pay week opens a confirmation naming the exact period and records affected. Cancel changes nothing. Confirm removes the period's earnings, payments, notifications, run, frozen employee payroll entries, notification-service receipts in one transaction, then reopens the week. Employees, other weeks and audit history remain; an audit entry records the reset.

Acceptance: the same week can accept earnings and run again without old payment or notification records. This is a local repeatability control, not an external bank reversal.

## State model

| Record or view | States and meaning |
|---|---|
| Earning | Pending → Approved or Rejected through review controls in an open period. Decisions are final; processed periods are locked. Only Approved is payable. |
| Run | Review before processing; saved and locked after confirmation. The badge then reflects recorded amounts, not notification completion. |
| Payment breakdown | Unpaid or Paid for an employee and period, based on whether a payment exists. |
| Pay-run badge | Review, Incomplete or Paid. Paid can coexist with a pending notification or an incorrect payment amount. |
| Notification | Pending → Sent after successful simulated delivery; a failed attempt remains Pending with an error. |
| Receipt notification status | Not available means no linked notification instruction exists. This is different from Pending delivery. |

## Controlled differences between builds

| Buggy deviation | Required correction in fixed | Cases and report |
|---|---|---|
| Pending and Rejected earnings contribute to pay | Select Approved earnings only: RUN-02 | TC01 · [Unapproved earnings paid](../QA/Quality%20Control/bug_report/UI%20functional%20bug%20reports/unapproved-earnings-paid-functional.md) |
| Payroll retry creates another payment | Check the saved payment and preserve its identity: REC-01 | TC07 · [Duplicate payment on retry](../QA/Quality%20Control/bug_report/UI%20functional%20bug%20reports/duplicate-payment-on-pay-run-retry-functional.md) |
| Payment has no linked notification instruction | Save both records together and retain failed delivery: REC-02, NOT-01 | TC08 and TC06 · [Payment without notification](../QA/Quality%20Control/bug_report/UI%20functional%20bug%20reports/payment-saved-without-notification-functional.md) |

Missing notification work leads into duplicate payment because the buggy completion check relies on a Sent notification. TC06 and TC08 expose the same absent instruction under different delivery conditions. Three defects therefore produce four failed cases. The [defect mapping](../QA/Quality%20assurance/business_rules.md#controlled-defects-and-their-checks) explains the comparison.

## Existing verification and its limits

The same eight cases apply to each build: six browser journeys automated with Playwright and two API (service request/response) cases supplied for manual Postman reproduction. TC denotes a test-case identifier.

| Existing case | Requirements supported by its checks |
|---|---|
| TC01 | EARN-01, RUN-01, RUN-02, VIEW-01: browser entry, approval and rejection, exclusion without blocking approved pay, explicit due-time simulation, totals, Overview and approved-only payment checks; notification creation is assessed separately |
| TC02 | PER-01, RUN-02: opening/closing boundary selection and the following period |
| TC03 / API | PER-01: request offsets, returned UTC normalization and selected earning IDs |
| TC04 / API | EARN-02, RUN-02: identical-ID imports leave one earning and one payable amount |
| TC05 | PAY-01, REC-01: failed payment, no notification, then successful recovery |
| TC06 | PAY-01, NOT-01: payment remains after notification failure; commit precedes delivery attempt |
| TC07 | REC-01, NOT-01, RECEIPT-01: payroll retry preserves payment/notification identity, receipt and amount |
| TC08 | REC-02: ordinary processing saves notification work linked to the payment; no fault setup |

The table identifies the checks performed; other acceptance conditions remain requirements rather than verified outcomes. The suite does not fully cover payroll record loading and retention, employee-directory navigation, all invalid inputs, conflicting-ID rejection, every locking/cancellation path, the notification-only retry button, exports, downloads or clipboard behaviour. Employee creation and the local reset are operator controls outside the eight-case assessment suite. Those controls are described from the implementation and application review; the [UI suite](../QA/Quality%20Control/Fixed%20build/Functional%20testing/functional-test-suite.md), [API suite](../QA/Quality%20Control/Fixed%20build/API%20testing/api-test-suite.md) and [recorded results](../QA/directive.md#quality-control-results-and-verification-evidence) define executed coverage.

## Operating limits and implementation references

The recorded release decision covers six local desktop Chromium journeys and two direct HTTP response checks in one Node/SQLite process. TC03 and TC04 are supplied as individual Postman requests, outside the Playwright suite. Authentication, external banking or messaging, other browsers/devices, concurrent processing and crash durability are outside that verified scope. See the [release checklist](../QA/Quality%20assurance/release_readiness.md).

Both applications package their own equivalent interface and service files. References here point to fixed: [App.tsx](../MustPayroll/MustPayroll_fixed/src/App.tsx) defines the screens, [payroll.tsx](../MustPayroll/MustPayroll_fixed/src/payroll.tsx) handles record loading and pay-date selection, and the [service](../MustPayroll/MustPayroll_fixed/server/payroll.mjs) enforces eligibility and saved records. The [fixed payment policy](../MustPayroll/MustPayroll_fixed/server/payment-policy.mjs) implements recovery; the [defect register](../QA/Quality%20Control/bug_report/README.md) links all three controlled failures and their recorded evidence.
