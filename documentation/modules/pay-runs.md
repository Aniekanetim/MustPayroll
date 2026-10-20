# Pay runs

**Route:** `/pay-runs`

**Purpose:** Review approved totals, confirm processing and recover unfinished payroll while preserving successful payments.

A pay run saves the employee amounts and earning IDs selected for a weekly period. These frozen totals are reused on retry. This guide describes required behavior, implemented by the fixed build; the controlled buggy differences are identified below. Each application keeps its own payroll records.

The selected period and pay-run history show the opening and closing Monday at 00:00 UTC. Start included · End excluded distinguishes the earning window from its Tuesday pay date.

## What the screen shows

The Pay date input accepts any past or future Tuesday and identifies its 09:00 UTC run. Passing the current calendar date does not prevent processing. The selected period, approved pay, recorded pay, unpaid amount and employee breakdown all concern that period. History lists saved runs across periods; **Review period** selects the corresponding pay date.

Unpaid amount stops at $0; it does not measure an overpayment. Compare Approved pay and Recorded pay directly.

The run badge is Review before processing, Incomplete when a saved run has unpaid amounts, or Paid when recorded amounts cover the displayed approved total. Paid describes the recorded outcome; it does not validate eligibility or payment uniqueness. Paid can coexist with failed notification delivery.

## Review and process

1. Select **Pay date** and confirm the earning window. For 13 October 2026 it is 5 October 00:00 UTC through 12 October 00:00 UTC, exclusive.
2. Review Approved pay, Recorded pay, Unpaid amount and each employee's earnings and payment status.
3. Review pending approvals through **Review earnings**. The business rule excludes pending and rejected earnings without blocking approved pay. Processing is disabled only for a period without earning records or a request in progress. If no records are approved, the fixed service rejects processing without saving a run or payment.
4. Select **Pay on Tuesday 09:00 UTC**. Read the **Pay this Tuesday’s payroll?** dialog, including the simulated Tuesday 09:00 UTC time, approved amount, employee count, exclusion of pending/rejected earnings and lock consequence. The simulation is independent of the current date; recorded timestamps retain the actual action time.
5. Select **Cancel** to return without processing, or **Pay on Tuesday 09:00 UTC** to confirm.
6. Inspect the toast, which stays in the viewport while scrolling and remains until dismissed or replaced by another action. It confirms how many payments were recorded successfully, with amounts and notification totals. **Outstanding work** reports unrecorded approved amounts or pending delivery. Expand **View employee payment statuses** or select **View recorded payments** to inspect references and delivery states.

After processing, **Recorded payments for this period** lists each payment's amount, Paid status, reference and notification status. The receipt lists the contributing earning IDs, amounts and ordinary approval statuses. The employee breakdown shows approved earnings, approved pay, recorded pay and payment status. These records support independent comparison; the application does not diagnose approval breaches, flag duplicate payments or disable retry because of them. The QA cases and defect reports establish those failures.

Confirmation saves the pay run and freezes approved totals and contributing earning IDs before employee payment attempts. This lock remains if a payment later fails. It protects the original entitlement during recovery; it is not proof that every payment succeeded.

## Retry an original run

1. Retain the original pay date and inspect existing payment references and amounts.
2. Select **Retry pay run**, review **Retry this pay run?**, then confirm **Retry pay run**.
3. In the fixed build, unpaid employees receive their frozen totals once. Successful payments remain unchanged. Pending notifications across all loaded pay periods are also attempted.
4. Inspect the retry-result toast, then recheck Payments, receipts, notification states and the selected period's Overview. The Payments table includes each payment's current notification status.

For an existing payment with only delivery pending, [Notifications](notifications.md) offers the more specific delivery action. A payroll retry and a notification retry are different operations.

## Failures and safeguards

| Observation | Meaning and next action |
|---|---|
| Pending-approval warning | Review the held earnings. Approve eligible records before processing, or pay the approved total while leaving them unpaid. After processing, late approvals require an adjustment in a later open period. |
| No approved earnings | Check pay date and earning timestamps; record and approve eligible earnings. |
| Some payments remain unrecorded | The saved run is incomplete. Inspect successful payments and retry the original run. |
| Recorded amount or payment count disagrees with the business rule | Identify the discrepancy by comparing earnings, payments and receipts. Retain references and escalate for reconciliation; the application does not automatically stop further processing. |
| Payment complete, notification Pending | Preserve payment and recover delivery. |

## Build comparison

The same payroll flow is packaged in two independent applications so a reviewer can reproduce the failures and verify their corrections using equivalent inputs and unchanged expectations.

| Behavior | Buggy | Fixed |
|---|---|---|
| Approval selection | Includes Pending and Rejected earnings | Pays only Approved earnings |
| Notification creation | Saves payment without its delivery instruction | Saves payment and notification work together |
| Payroll retry | Creates another payment because completion depends on a missing Sent notification | Checks the saved payment and preserves its identity |

The [defect mapping](../../QA/Quality%20assurance/business_rules.md#controlled-defects-and-their-checks) connects these behaviors to the reports and checks. The [build guide](../README.md#expected-behaviour-and-the-two-builds) identifies the applications. Each keeps separate records, so processing or resetting one does not change the other.

## Requirements and verification

[RUN-01](../PRD.md#run-01), [RUN-02](../PRD.md#run-02), [PAY-01](../PRD.md#pay-01), [REC-01](../PRD.md#rec-01) and [REC-02](../PRD.md#rec-02) define this flow. The six UI cases process payroll through this screen. TC03 and TC04 process through individual Postman requests and are documented separately from the browser suite. TC05 checks payment-failure recovery, TC07 checks payroll retry and TC08 checks notification creation after ordinary processing. See the [complete flows](../user-flows.md#recovery-decision) before choosing an action.
