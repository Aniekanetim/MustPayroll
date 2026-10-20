# MustPayroll buggy: API Functional Test Suite — Postman

TC03 checks timezone conversion; TC04 checks duplicate earning IDs. Both cases should pass in this buggy build. For the known payment defects, use the PAY-001/PAY-003 and PAY-002 reproductions below.

Use this build’s TC03 or TC04 folder in the [Postman collection](postman/MustPayroll.postman_collection.json). Send its four requests in order. Copy `payrollDatasetId` from the create response into the collection variable `payrollDatasetId` before continuing. Dates are in 2026; amounts are integer USD cents: `amountCents: 150000` means $1,500.00. Expected HTTP status: `201` for create, `200` for the remaining requests. Use a new test dataset for each case; repeat independently using the other build’s QC folder.

Start with [Postman setup](#postman-setup) to run the application, import its collection and confirm the service identity.

[UI suite](../Functional%20testing/functional-test-suite.md) · [This build’s results](api-testing-results.md)

JSON blocks show the response fields being checked, rather than the complete response. Generated IDs are not fixed expectations; earning records are matched by earningId. Request bodies are ready to copy into Postman.

## Request variables and bodies

`baseUrl` is this build’s service address, shown in Preconditions. Each case uses an isolated test dataset containing employees and payroll records. `POST /api/payroll-datasets` creates that data and returns its internal identifier, `payrollDatasetId`. Save the value in the Postman collection variable before steps 2–4. Postman substitutes `{{baseUrl}}` and `{{payrollDatasetId}}` in the URLs. These are API setup names; the payroll interface has no dataset-management controls.

For each POST, choose **Body → raw → JSON** and use the named body from the same row’s Test Data. GET requests have no body. Steps show the method and full URL; Expected Result lists the required HTTP statuses and payroll fields.

| TC ID | Scenario | Test Case Desc<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Preconditions<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Steps<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Test Data<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Expected Result<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Actual Result<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC03 | Timezone offsets at the earning cut-off | Verify offset timestamps are converted to UTC before earnings are selected for payroll. | Postman is open; <code>baseUrl</code> = <code>http://127.0.0.1:4175</code>. <code>GET {{baseUrl}}/api/health</code> returns <code>200</code> with <code>build.variant: faulty</code>. Create a new test dataset in step 1; do not reuse a processed case. | 1. <code>POST {{baseUrl}}/api/payroll-datasets</code> — send Create body A. Save the response’s top-level <code>payrollDatasetId</code> as the Postman collection variable <code>payrollDatasetId</code>.<br>2. <code>POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/earnings</code> — send Import body B.<br>3. <code>POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs</code> — send Pay-run body C.<br>4. <code>GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z</code> — no body. Compare the response with Expected Result. | POST header: <code>Content-Type: application/json</code>. No authentication. <code>employeeId: emp-001</code> is Amara Okafor. Amounts are integer USD cents: <code>150000</code> = $1,500.00.<br><br><strong>Create body A</strong><pre lang="json"><code>{&#10;  "testDataPreset": "employeesOnly"&#10;}</code></pre><br><br><strong>Import body B</strong><pre lang="json"><code>{&#10;  "earnings": [&#10;    {&#10;      "earningId": "outside",&#10;      "employeeId": "emp-001",&#10;      "description": "Weekly project earnings",&#10;      "earnedAt": "2026-10-05T00:30:00+01:00",&#10;      "amountCents": 150000,&#10;      "approvalStatus": "approved"&#10;    },&#10;    {&#10;      "earningId": "inside",&#10;      "employeeId": "emp-001",&#10;      "description": "Weekly project earnings",&#10;      "earnedAt": "2026-10-05T01:00:00+01:00",&#10;      "amountCents": 150000,&#10;      "approvalStatus": "approved"&#10;    }&#10;  ]&#10;}</code></pre><br><br><strong>Pay-run body C</strong><pre lang="json"><code>{&#10;  "scheduledPayRunAt": "2026-10-13T09:00:00.000Z",&#10;  "simulatedProcessingAt": "2026-10-13T09:00:00.000Z"&#10;}</code></pre> | Only inside falls within the pay period after conversion to UTC.<br>Status codes: create <code>201</code>; import, process and inspection <code>200</code>.<br>Final response fields checked:<pre lang="json"><code>{&#10;  "currency": "USD",&#10;  "earnings": [&#10;    {&#10;      "earningId": "inside",&#10;      "earnedAt": "2026-10-05T00:00:00.000Z"&#10;    },&#10;    {&#10;      "earningId": "outside",&#10;      "earnedAt": "2026-10-04T23:30:00.000Z"&#10;    }&#10;  ],&#10;  "employeePayrollSummaries": [&#10;    {&#10;      "earningIds": [&#10;        "inside"&#10;      ]&#10;    }&#10;  ],&#10;  "approvedTotalCents": 150000,&#10;  "recordedPaymentTotalCents": 150000,&#10;  "payments": [&#10;    {&#10;      "amountCents": 150000,&#10;      "earningIds": [&#10;        "inside"&#10;      ]&#10;    }&#10;  ]&#10;}</code></pre> | See buggy and fixed results. | See results |
| TC04 | Duplicate earning IDs in an import | Verify reimporting identical earnings does not increase the earning count or payment amount. | Postman is open; <code>baseUrl</code> = <code>http://127.0.0.1:4175</code>. <code>GET {{baseUrl}}/api/health</code> returns <code>200</code> with <code>build.variant: faulty</code>. Create a new test dataset in step 1; do not reuse a processed case. | 1. <code>POST {{baseUrl}}/api/payroll-datasets</code> — send Create body A. Save the response’s top-level <code>payrollDatasetId</code> as the Postman collection variable <code>payrollDatasetId</code>.<br>2. <code>POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/earnings</code> — send Import body B. Inspect the import response before processing: one <code>earn-001</code> and no payment.<br>3. <code>POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs</code> — send Pay-run body C.<br>4. <code>GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z</code> — no body. Compare the response with Expected Result. | POST header: <code>Content-Type: application/json</code>. No authentication. <code>employeeId: emp-001</code> is Amara Okafor. Amounts are integer USD cents: <code>150000</code> = $1,500.00.<br><br><strong>Create body A</strong><pre lang="json"><code>{&#10;  "testDataPreset": "oneApprovedEarning"&#10;}</code></pre><br><br><strong>Import body B</strong><pre lang="json"><code>{&#10;  "earnings": [&#10;    {&#10;      "earningId": "earn-001",&#10;      "employeeId": "emp-001",&#10;      "description": "Weekly project earnings",&#10;      "earnedAt": "2026-10-08T12:00:00Z",&#10;      "amountCents": 150000,&#10;      "approvalStatus": "approved"&#10;    },&#10;    {&#10;      "earningId": "earn-001",&#10;      "employeeId": "emp-001",&#10;      "description": "Weekly project earnings",&#10;      "earnedAt": "2026-10-08T12:00:00Z",&#10;      "amountCents": 150000,&#10;      "approvalStatus": "approved"&#10;    }&#10;  ]&#10;}</code></pre><br><br><strong>Pay-run body C</strong><pre lang="json"><code>{&#10;  "scheduledPayRunAt": "2026-10-13T09:00:00.000Z",&#10;  "simulatedProcessingAt": "2026-10-13T09:00:00.000Z"&#10;}</code></pre> | Reimporting earn-001 leaves one earning and no payment before processing; that earning is paid once.<br>Status codes: create <code>201</code>; import, process and inspection <code>200</code>.<br>Final response fields checked:<pre lang="json"><code>{&#10;  "currency": "USD",&#10;  "earnings": [&#10;    {&#10;      "earningId": "earn-001"&#10;    }&#10;  ],&#10;  "employeePayrollSummaries": [&#10;    {&#10;      "earningIds": [&#10;        "earn-001"&#10;      ]&#10;    }&#10;  ],&#10;  "approvedTotalCents": 150000,&#10;  "recordedPaymentTotalCents": 150000,&#10;  "payments": [&#10;    {&#10;      "amountCents": 150000,&#10;      "earningIds": [&#10;        "earn-001"&#10;      ]&#10;    }&#10;  ]&#10;}</code></pre> | See buggy and fixed results. | See results |

## Postman setup

1. Start the buggy application from the repository root with `npm --prefix MustPayroll/MustPayroll_buggy start`.
2. Import [this build’s collection](postman/MustPayroll.postman_collection.json) into Postman. Open its **Variables** tab, set `baseUrl` to `http://127.0.0.1:4175`, then save.
3. Send **00. Check running build**, `GET {{baseUrl}}/api/health`, with no body. Require HTTP `200` and `build.variant` to be `faulty` and retain `build.id`.
4. Open TC03 or TC04 and send its four requests in order. Copy `payrollDatasetId` from the create response into the collection variable `payrollDatasetId`, then save before continuing.
5. Compare the response fields with the table above. Each folder is one test case; its four requests are its steps. The PAY folders reproduce existing UI findings, and **UI setup only** prepares browser data.

## Reproduce the known defects in Postman

Use these collection folders to reproduce the existing browser findings through HTTP requests. They do not add test cases.

### PAY-001 and PAY-003: payment without notification work, followed by duplicate payment

Open **PAY-001 and PAY-003 | Missing notification and duplicate payment** in the collection. Use this build’s `baseUrl` and POST header `Content-Type: application/json`. Create new records; creating returns HTTP `201`, and the remaining requests return `200`.

1. `POST {{baseUrl}}/api/payroll-datasets` — Send Create body D; save the returned `payrollDatasetId` in the collection variable `payrollDatasetId`.
2. `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs` — Send Pay-run body E.
3. `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z` — No body. Retain the first payment’s `paymentId`, amount and notification records.
4. `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/notifications/retry-pending` — Send raw JSON `{}` to retry existing pending delivery work.
5. `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z` — No body. Confirm notification recovery did not add or change a payment.
6. `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs` — Send Pay-run body E.
7. `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z` — No body. Compare payment count, total and original identities; stop after this payroll retry.

**Create body D**

~~~json
{
  "testDataPreset": "oneApprovedEarning"
}
~~~

**Pay-run body E**

~~~json
{
  "scheduledPayRunAt": "2026-10-13T09:00:00.000Z",
  "simulatedProcessingAt": "2026-10-13T09:00:00.000Z"
}
~~~

Compare with the table below. To check the other build, use its own collection and a new test dataset.

| Check | Business expectation / fixed | Buggy observation |
|---|---|---|
| After first processing | `recordedPaymentTotalCents: 150000`; one payment; one Sent notification linked by `paymentId` | Same payment amount, but `notifications: []` |
| After notification-only retry | Original payment and notification identities retained | One payment remains; notification instruction is still absent |
| After payroll retry | One original payment; `recordedPaymentTotalCents: 150000`; original linked notification retained | Two distinct payment IDs; `recordedPaymentTotalCents: 300000`; no notifications |

The [PAY-003 API report](../../bug_report/payment-saved-without-notification-api.md) documents notification creation and notification-only retry. Its paired functional report covers TC08 and TC06. The [PAY-001 API report](../../bug_report/duplicate-payment-on-pay-run-retry-api.md) documents duplicate payment after payroll retry; its paired functional report covers TC07. The [bug report index](../../bug_report/README.md) lists the separate functional and API reports.

### PAY-002: pending and rejected earnings included in payment

Open **PAY-002 | Earnings paid without approval** in the collection. Use this build’s `baseUrl` and POST header `Content-Type: application/json`. Create new records; creating returns HTTP `201`, and the remaining requests return `200`.

1. `POST {{baseUrl}}/api/payroll-datasets` — Send Create body D; save the returned `payrollDatasetId` in the collection variable `payrollDatasetId`.
2. `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/earnings` — Send Import body E, containing the seven approval-control records.
3. `POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/pay-runs` — Send Pay-run body F.
4. `GET {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}?scheduledPayRunAt=2026-10-13T09:00:00.000Z` — No body. Compare approved and recorded totals, employee payments and source earning approval statuses.

**Create body D**

~~~json
{
  "testDataPreset": "employeesOnly"
}
~~~

**Import body E**

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

**Pay-run body F**

~~~json
{
  "scheduledPayRunAt": "2026-10-13T09:00:00.000Z",
  "simulatedProcessingAt": "2026-10-13T09:00:00.000Z"
}
~~~

Compare with the table below. To check the other build, use its own collection and a new test dataset.

| Check | Business expectation / fixed | Buggy observation |
|---|---|---|
| Approved total, `approvedTotalCents` | `435000` ($4,350) | `435000` |
| Recorded total, `recordedPaymentTotalCents` | `435000` | `510000` ($5,100) |
| Amara’s payment | `150000` ($1,500) | `225000` ($2,250), including the pending bonus and rejected claim |
| Pending and rejected source records | Remain unchanged and unpaid | Remain unchanged even though their amounts were included in payment |

This is the approval defect covered by TC01. Read the [PAY-002 API report](../../bug_report/unapproved-earnings-paid-api.md) for its reproduction steps and observed outcome. The separate [results comparison](../../../directive.md#quality-control-results-and-verification-evidence) identifies the recorded builds and verification method.
