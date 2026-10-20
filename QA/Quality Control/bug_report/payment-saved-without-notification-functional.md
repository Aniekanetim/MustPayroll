# Payment saved without notification — Functional bug report (PAY-003)

## Title

A successful payment has no employee-notification record.

## Bug description

Every recorded payment must have a linked employee-notification record. Delivery should be attempted only after payment succeeds. If delivery fails, the notification record should remain Pending for recovery.

The buggy application records a Paid payment but creates no notification record. Its receipt shows **Not available**, and **Notifications** contains no matching entry. This is missing delivery work, rather than a failed delivery waiting to be retried.

**Severity: High. Priority: P1.** Notification recovery cannot find any saved work. Retrying payroll can also cause the separate [PAY-001 duplicate-payment defect](duplicate-payment-on-pay-run-retry-functional.md).

## Test case that verified the bug

[TC08 — Notification creation for a successful payment](../Buggy%20build/Functional%20testing/functional-test-suite.md) verifies the normal UI flow reproduced below. The recorded TC06 browser run also exposed the same missing-notification defect under a simulated delivery failure.

## Preconditions

- The buggy application is running at `http://127.0.0.1:4175`.
- Amara Okafor exists with destination **Meridian Bank · •••• 4821**.
- The 13 October 2026 pay week is open, with no earnings or payments.
- Notification history is empty, and the notification service is available.

## Test data

| Employee | Description | Amount | Earned at | Approval status | Destination |
|---|---|---|---|---|---|
| Amara Okafor | Weekly project earnings | $1,500 | 8 October 2026, 12:00 UTC | Approved | Meridian Bank · •••• 4821 |

Pay date: **13 October 2026, 09:00 UTC**. It covers earnings from **5 October 00:00 UTC (included) to 12 October 00:00 UTC (excluded)**. The processing button simulates that pay date; no calendar wait is needed. All amounts are USD. Payment records are local test data; no real funds move.

## Steps to reproduce

1. Open `http://127.0.0.1:4175/earnings`. Record the Test data earning for Amara with **Approval status: Approved**.
2. Open **Pay runs**, select **13 October 2026**, then click **Pay on Tuesday 09:00 UTC** and confirm once.
3. Open **Payments → View receipt** for Amara's period starting 5 October. Note the payment reference, amount, payment status and notification status.
4. Open **Notifications**. Look for the notification linked to that payment and check the **Sent** and **Pending delivery** counts. Stop without retrying payroll or notifications.

## Expected result

One Paid $1,500 payment has one linked Sent notification. Its receipt shows **Sent**; Notifications shows one Sent and zero Pending.

## Actual result

One Paid $1,500 payment exists, but its receipt shows **Not available** for Notification. Notifications shows **No notifications yet**, zero Sent and zero Pending. No notification was created for the successful payment.

## Evidence

- **Buggy execution:** [TC06 and TC08 functional results](../Buggy%20build/Functional%20testing/functional-testing-results.md), recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-faulty-7e767f8a7ab2`.
- **Fix verification:** [TC06 and TC08 fixed results](../Fixed%20build/Functional%20testing/functional-testing-results.md), same inputs and expectations; recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-fixed-34f51cb851c0`. The fixed TC08 run saved a linked Sent notification; fixed TC06 preserved the payment and its linked Pending notification.
