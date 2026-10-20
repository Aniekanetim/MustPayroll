# Notifications

**Route:** `/notifications`

**Purpose:** Inspect delivery attempts and recover Pending notifications while preserving payment.

A notification is a saved instruction linked to a payment. This screen handles the notification outcome; Payments and receipts establish what was paid.

## Status and scope

The screen covers all pay periods loaded in the application. **Pending delivery** counts pending messages; **Sent** counts messages accepted by the simulated notification service. Each history entry shows employee, period start, attempt count, delivery error when present and **View payment receipt**.

Sent does not establish receipt in an external email or SMS inbox. Delivery is simulated locally. The application attempts initial delivery during payroll processing; opening this screen does not send messages.

## State changes and module connections

In the required flow implemented by the fixed build, a payment is saved together with its Pending notification work. Delivery changes notification state and records attempts; failure leaves it Pending with an error. Neither result changes the payment amount, reference or destination.

Successful recovery updates the receipt's notification status and Overview's pending count across all loaded pay periods. It does not alter that period's approved or recorded pay. The fixed build's **Retry pay run** also recovers pending messages after dealing with unpaid employees; that broader action is described in [Pay runs](pay-runs.md).

## Retry delivery

1. Open Notifications and inspect the employee, pay-period start, status, attempt count and any delivery error.
2. Select **View payment receipt** to confirm that the payment already exists. Retain its reference and amount.
3. Return to Notifications and select **Retry pending notifications**.
4. Wait for completion. The action attempts all existing pending messages in the loaded payroll records, including messages for periods other than the selected pay date.
5. Check that successful delivery becomes Sent, the attempt count increases and the previous delivery error clears.
6. Reopen the receipt. Its original payment must remain unchanged.

The retry control is disabled while a request is in progress or no pending notifications remain. There is no individual-message retry control. Messages already Sent are skipped by recovery.

## Empty, failed and missing records

- **No notifications yet** offers **Review pay run**. A payment failure legitimately creates no notification.
- A delivery error leaves the saved payment intact. Review the error, retry delivery and inspect the result.
- A payment without any notification record is different from a Pending notification. This action retries existing messages; it cannot recreate missing work omitted during ordinary processing in the buggy build.

## Build comparison

Buggy saves payment without its notification instruction. There is therefore no matching record to deliver or retry, even though payment is Paid. Fixed saves both records together, then produces Sent after successful delivery or retains Pending after failure.

Keeping both versions available lets the same expected notification rule expose the bug and verify its correction. The [browser comparison flow](../user-flows.md#payment-recorded-without-notification-work) demonstrates the missing instruction and subsequent payroll retry. The [functional report](../../QA/Quality%20Control/bug_report/payment-saved-without-notification-functional.md) supplies the browser reproduction; the [build guide](../README.md#expected-behaviour-and-the-two-builds) explains the separate applications.

## Requirements and verification

[NOT-01](../PRD.md#not-01), [PAY-01](../PRD.md#pay-01) and [REC-01](../PRD.md#rec-01) define the relationship. Browser case TC06 checks failed delivery after committed payment; TC07 checks payment and notification identity when payroll is retried; TC08 checks that ordinary processing creates linked notification work. The six browser cases do not automate the notification-only retry button. Separate [API response checks](../../QA/Quality%20Control/Fixed%20build/API%20testing/api-testing-results.md#known-defect-response-checks) check that notification-only retry preserves the payment; they do not establish browser-button coverage or add cases to the eight-case suite. See [user flows](../user-flows.md#successful-payment-failed-notification) for that operator journey.
