# Duplicate payment on pay-run retry — API bug report (PAY-001)

## Title

Repeating the pay-run request creates a second employee payment.

## Bug description

A repeated pay-run request for the same employee, earnings and pay period must preserve the payment already saved. The buggy endpoint returns HTTP `200` but creates a second payment when the request is repeated.

**Severity: High. Priority: P1.** Recorded pay doubles from $1,500 to $3,000 without additional earnings.

## Test case that verified the bug

[PAY-001 HTTP verification — payment identity after payroll retry](../Buggy%20build/API%20testing/api-test-suite.md#pay-001-and-pay-003-payment-without-notification-work-followed-by-duplicate-payment).

## Preconditions

- The buggy service is running at `http://127.0.0.1:4175`.
- The [buggy Postman collection](../Buggy%20build/API%20testing/postman/MustPayroll.postman_collection.json) is imported, with collection variable `baseUrl` set to `http://127.0.0.1:4175`.
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

**Pay-run body B — process the selected pay period at its simulated due time.** Send this same body for the first run and its retry.

~~~json
{
  "scheduledPayRunAt": "2026-10-13T09:00:00.000Z",
  "simulatedProcessingAt": "2026-10-13T09:00:00.000Z"
}
~~~

## Steps to reproduce

1. Send `POST {{baseUrl}}/api/payroll-datasets` with **Create body A**. Expect HTTP `201`. Copy the response's top-level `payrollDatasetId` into the collection's **Variables → payrollDatasetId** and save. Later `{{payrollDatasetId}}` values refer to this new test dataset.
2. Send `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs` with **Pay-run body B**. Expect HTTP `200`.
3. Send `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z`. Expect HTTP `200`. Retain the first `payments` entry, including its `paymentId`, amount and destination, and note `recordedPaymentTotalCents`.
4. Send `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs` once more with the unchanged **Pay-run body B**. Expect HTTP `200`; do not import or change earnings.
5. Send `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z` again. Expect HTTP `200`. Compare `payments` and `recordedPaymentTotalCents` with step 3.

## Expected result

After retry, `payments` still contains one entry with `amountCents: 150000`. Its original `paymentId`, amount and destination are unchanged. `recordedPaymentTotalCents` remains `150000` ($1,500).

## Actual result

The original payment remains, but `payments` contains a second entry for `150000` cents with a different `paymentId`. `recordedPaymentTotalCents` increases from `150000` to `300000` ($3,000).

## Evidence

- **Buggy observation:** [PAY-001 response check](../Buggy%20build/API%20testing/api-testing-results.md#known-defect-response-checks), recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-faulty-7e767f8a7ab2`.
- **Fix verification:** [PAY-001 fixed response check](../Fixed%20build/API%20testing/api-testing-results.md#known-defect-response-checks); recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-fixed-34f51cb851c0`. The repeated request retained one $1,500 payment and the original payment and linked notification identities.
