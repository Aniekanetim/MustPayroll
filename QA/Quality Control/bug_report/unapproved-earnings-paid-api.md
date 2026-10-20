# Pending and Rejected earnings paid — API bug report (PAY-002)

## Title

The pay-run endpoint includes Pending and Rejected earnings in payment.

## Bug description

Only Approved earnings within the selected period should contribute to payment. The buggy endpoint returns HTTP `200` and records $5,100 against $4,350 approved. The extra $750 comes from a Pending bonus and Rejected claim; their approval statuses remain unchanged.

**Severity: High. Priority: P1.** The service records payments for earnings that have not passed approval.

## Test case that verified the bug

[PAY-002 HTTP verification — approval-controlled payroll](../Buggy%20build/API%20testing/api-test-suite.md#pay-002-pending-and-rejected-earnings-included-in-payment).

## Preconditions

- The buggy service is running at `http://127.0.0.1:4175`.
- The [buggy Postman collection](../Buggy%20build/API%20testing/postman/MustPayroll.postman_collection.json) is imported, with collection variable `baseUrl` set to `http://127.0.0.1:4175`.
- POST requests use **Body → raw → JSON** and `Content-Type: application/json`. GET requests have no body. Authentication is not required.

The first request creates a fresh test dataset. Its `payrollDatasetId` is the internal identifier used by subsequent API requests. Save it as instructed in step 1 before continuing.

## Test data

All dates are UTC. Pay date: **13 October 2026, 09:00**. It covers earnings from **5 October 00:00 (included) to 12 October 00:00 (excluded)**. Both pay-run timestamps below use that due instant, so no calendar wait is needed. Amounts are integer USD cents: `150000` = $1,500.00. Payments are local records; no real funds move.

**Create body A — employees with no earnings or payments.** The preset supplies these IDs for the earning import:

| Employee ID | Employee |
|---|---|
| `emp-001` | Amara Okafor |
| `emp-002` | Daniel Mensah |
| `emp-003` | Zara Bello |

~~~json
{
  "testDataPreset": "employeesOnly"
}
~~~

**Import body B — seven earnings with their final approval statuses.** Four Approved earnings total $4,350. The $500 Pending bonus and $250 Rejected claim fall within this period. Zara's Pending $850 earning falls after its closing boundary.

~~~json
{
  "earnings": [
    {
      "earningId": "rejected-claim",
      "employeeId": "emp-001",
      "description": "Rejected claim",
      "earnedAt": "2026-10-08T12:00:00Z",
      "amountCents": 25000,
      "approvalStatus": "rejected"
    },
    {
      "earningId": "amara-weekly",
      "employeeId": "emp-001",
      "description": "Weekly project earnings",
      "earnedAt": "2026-10-08T12:00:00Z",
      "amountCents": 120000,
      "approvalStatus": "approved"
    },
    {
      "earningId": "amara-bonus",
      "employeeId": "emp-001",
      "description": "Approved delivery bonus",
      "earnedAt": "2026-10-09T15:00:00Z",
      "amountCents": 30000,
      "approvalStatus": "approved"
    },
    {
      "earningId": "daniel-weekly",
      "employeeId": "emp-002",
      "description": "Weekly project earnings",
      "earnedAt": "2026-10-09T12:00:00Z",
      "amountCents": 200000,
      "approvalStatus": "approved"
    },
    {
      "earningId": "zara-weekly",
      "employeeId": "emp-003",
      "description": "Weekly project earnings",
      "earnedAt": "2026-10-10T12:00:00Z",
      "amountCents": 85000,
      "approvalStatus": "approved"
    },
    {
      "earningId": "zara-next",
      "employeeId": "emp-003",
      "description": "Next period project earnings",
      "earnedAt": "2026-10-12T08:00:00Z",
      "amountCents": 85000,
      "approvalStatus": "pending"
    },
    {
      "earningId": "amara-pending",
      "employeeId": "emp-001",
      "description": "Unapproved bonus",
      "earnedAt": "2026-10-09T16:00:00Z",
      "amountCents": 50000,
      "approvalStatus": "pending"
    }
  ]
}
~~~

**Pay-run body C — process the selected period at its simulated due time.**

~~~json
{
  "scheduledPayRunAt": "2026-10-13T09:00:00.000Z",
  "simulatedProcessingAt": "2026-10-13T09:00:00.000Z"
}
~~~

## Steps to reproduce

1. Send `POST {{baseUrl}}/api/payroll-datasets` with **Create body A**. Expect HTTP `201`. Copy the response's top-level `payrollDatasetId` into the collection's **Variables → payrollDatasetId** and save. Later `{{payrollDatasetId}}` values refer to this new test dataset.
2. Send `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/earnings` with **Import body B**. Expect HTTP `200`.
3. Send `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs` with **Pay-run body C**. Expect HTTP `200`.
4. Send `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z`. Expect HTTP `200`. Compare `approvedTotalCents`, `recordedPaymentTotalCents` and each employee's `payments` entry with Expected result. Check the source records in `earnings` for their `approvalStatus`. Stop without retrying payroll.

## Expected result

Both `approvedTotalCents` and `recordedPaymentTotalCents` are `435000` ($4,350). Three payments contain Amara `150000`, Daniel `200000` and Zara `85000` cents. Pending and Rejected amounts remain unpaid, their statuses are unchanged and Zara's next-period earning is excluded.

## Actual result

`approvedTotalCents` is `435000`, but `recordedPaymentTotalCents` is `510000` ($5,100). Amara's payment is `225000` cents, including the `50000`-cent Pending bonus and `25000`-cent Rejected claim. Their source statuses are unchanged. Daniel and Zara receive their expected amounts; the next-period earning is excluded.

## Evidence

- **Buggy observation:** [PAY-002 response check](../Buggy%20build/API%20testing/api-testing-results.md#known-defect-response-checks), recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-faulty-7e767f8a7ab2`.
- **Fix verification:** [PAY-002 fixed response check](../Fixed%20build/API%20testing/api-testing-results.md#known-defect-response-checks); recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-fixed-34f51cb851c0`. Approved and recorded totals both remained 435000 cents; Amara received 150000 cents and unapproved amounts were excluded.
