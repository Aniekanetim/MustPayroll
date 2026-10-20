# Payment saved without notification — API bug report (PAY-003)

## Title

The pay-run endpoint records payment without its linked notification.

## Bug description

A successful payment should have a saved notification record linked by `paymentId`. That record tells the service which payment to notify the employee about and retains its delivery status.

The buggy endpoint returns HTTP `200` and saves a $1,500 payment without that record. Retrying pending notifications also returns HTTP `200`, but no notification appears: the retry has no saved instruction to process.

**Severity: High. Priority: P1.** The payment exists, but the service cannot deliver or recover its missing employee notification.

## Test case that verified the bug

[PAY-003 HTTP verification — notification creation and notification-only retry](../../Buggy%20build/API%20testing/api-test-suite.md#pay-001-and-pay-003-payment-without-notification-work-followed-by-duplicate-payment), steps 1–5. These requests check normal processing followed by notification-only retry.

## Preconditions

- The buggy service is running at `http://127.0.0.1:4175`.
- The [buggy Postman collection](../../Buggy%20build/API%20testing/postman/MustPayroll.postman_collection.json) is imported, with collection variable `baseUrl` set to `http://127.0.0.1:4175`.
- POST requests use **Body → raw → JSON** and `Content-Type: application/json`. GET requests have no body. Authentication is not required.

The first request creates a fresh test dataset. Its `payrollDatasetId` is the internal identifier used by subsequent API requests. Save it as instructed in step 1 before continuing.

## Test data

All dates are UTC. Pay date: **13 October 2026, 09:00**. It covers earnings from **5 October 00:00 (included) to 12 October 00:00 (excluded)**. Both pay-run timestamps below use that due instant, so no calendar wait is needed. Amounts are integer USD cents: `150000` = $1,500.00. Payments are local records; no real funds move.

**Create body A — one unpaid Approved earning.** This preset creates three employees. Only Amara Okafor (`emp-001`) has an earning: $1,500, dated 8 October 2026 at 12:00 UTC. No payments or notifications exist.

~~~json
{
  "testDataPreset": "oneApprovedEarning"
}
~~~

**Pay-run body B — process the selected period at its simulated due time.**

~~~json
{
  "scheduledPayRunAt": "2026-10-13T09:00:00.000Z",
  "simulatedProcessingAt": "2026-10-13T09:00:00.000Z"
}
~~~

**Notification-retry body C — retry existing Pending notifications.** This request retries delivery rather than processing payroll.

~~~json
{}
~~~

`Sent` means simulated delivery succeeded. `Pending` means a notification exists but delivery needs retry. An empty `notifications` array means no instruction was saved.

## Steps to reproduce

1. Send `POST {{baseUrl}}/api/payroll-datasets` with **Create body A**. Expect HTTP `201`. Copy the response's top-level `payrollDatasetId` into the collection's **Variables → payrollDatasetId** and save. Later `{{payrollDatasetId}}` values refer to this new test dataset.
2. Send `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs` with **Pay-run body B**. Expect HTTP `200`.
3. Send `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z`. Expect HTTP `200`. Retain `payments[0].paymentId` and `recordedPaymentTotalCents`. Check whether `notifications` contains an entry for that payment.
4. Send `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/notifications/retry-pending` with **Notification-retry body C**. Expect HTTP `200`.
5. Send `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z` again. Expect HTTP `200`. Compare `notifications`, the original `paymentId` and the recorded total with step 3. Do not send another pay-run request.

## Expected result

First processing saves one $1,500 payment and one notification whose `paymentId` matches it. With no delivery failure configured, `deliveryStatus` is `sent`. Notification-only retry retains the original `paymentId`, `notificationId` and $1,500 total.

## Actual result

The payment exists and `recordedPaymentTotalCents` is `150000`, but `notifications` is `[]`. After notification-only retry, the original $1,500 payment remains and `notifications` is still `[]`.

## Evidence

- **Buggy observation:** [PAY-003 response check](../../Buggy%20build/API%20testing/api-testing-results.md#known-defect-response-checks), recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-faulty-f4ce4b794698`.
- **Fix verification:** [PAY-003 fixed response check](../../Fixed%20build/API%20testing/api-testing-results.md#known-defect-response-checks); recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-fixed-4c4c2fec65d0`. Processing saved one linked Sent notification. Notification-only retry preserved that notification and its original payment.
