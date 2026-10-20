# Earnings

**Route:** `/earnings`

**Purpose:** Record what an employee earned, then approve or reject Pending records before payroll.

An earning is an amount earned by a specific employee at a specific time. It is saved with the payroll records in the application being used. Recording and review precede payment through Pay runs.

## Inputs and scope

| Form field | Expected input |
|---|---|
| Employee | An employee already recorded in the application; an employee-detail link preselects this field |
| Description | Required, up to 160 characters |
| Amount (USD) | $0.01–$1,000,000.00 with up to two decimal places |
| Earning date and time (UTC) | When the earning occurred, entered as UTC |
| Approval status | Pending approval or Approved |

The earning timestamp determines the pay period. The form's UTC label is explicit: it does not convert a typed local time from the operator's timezone. Confirm the timestamp before submitting.

The earning-record list covers all employees and pay periods loaded in the application. Its **Status** filter offers All statuses, Approved, Pending and Rejected. It has no employee or pay-period filter.

## Record and review

1. Open Earnings directly or select **Record earnings** from an employee detail page.
2. Check Employee, then enter Description, Amount and Earning date and time (UTC).
3. Select Pending approval for later review or Approved to make it eligible for payroll. The application has no separate approver login.
4. Select **Record earnings** once and wait for completion.
5. Find the saved record by employee, description, timestamp, amount and earning ID. Check its status.
6. For a pending record in an open period, select **Approve earnings** to authorize payment, or **Reject earnings** to exclude the claim. Rejection opens a confirmation with the employee, description and amount. Cancel leaves it Pending; confirm changes it to Rejected. Check the saved status.
7. Open **Pay runs**, select the intended pay date and check the updated employee and total amounts before processing.

## State changes and connected modules

Recording creates a new permanent earning ID and does not trigger payment. Payments are processed separately through Pay runs at the selected simulated Tuesday instant. Repeating a form submission with a new ID is a new earning, even if its description and amount match another record. Identical-ID imports are handled separately by [EARN-02](../PRD.md#earn-02).

Approving or rejecting an earning changes its review status and records an audit event; neither action creates a payment. Only pending records in open periods offer these actions. An approved or rejected decision cannot be changed. The required payroll rule leaves Pending and Rejected earnings unpaid without blocking approved earnings in the same period. Approved totals update in that period's Overview and Pay runs.

## Validation and recovery

- Required fields and invalid amounts prevent submission. Correct the input and submit again.
- Past and future earning dates are accepted. A processed period is locked until reset in Settings. Without reset, a new earning, approval or rejection in that period is refused; record an approved adjustment in a later open period referencing the original earning.
- Approved earnings cannot be edited, deleted or moved through this interface.
- **No matching earnings** means the current status filter returned no records. Change Status before concluding that records are missing.
- On an uncertain request outcome, refresh and inspect the saved list before submitting again. A new ID would represent an additional earning.

## Build comparison

Both builds provide the same recording and review controls. Their payment selection differs: buggy can pay Pending and Rejected earnings despite their unchanged statuses; fixed selects only Approved earnings. The [approval defect report](../../QA/Quality%20Control/bug_report/UI%20functional%20bug%20reports/unapproved-earnings-paid-functional.md) shows that comparison, and the [build guide](../README.md#expected-behaviour-and-the-two-builds) explains why both versions are retained.

## Requirements and verification

[EARN-01](../PRD.md#earn-01), [EARN-02](../PRD.md#earn-02) and [PER-01](../PRD.md#per-01) define eligibility and identity. Browser test case TC01 covers entry, approval, rejection and approved-only payroll. Separate service-level cases TC03 and TC04 check timezone offsets and repeated IDs, which the form cannot submit directly. Their Postman requests and response expectations are in the [API suite](../../QA/Quality%20Control/Fixed%20build/API%20testing/api-test-suite.md). The suite does not cover every validation or locking path. Continue with [Pay runs](pay-runs.md).
