# Execute the MustPayroll buggy UI Cases

This project runs only the **buggy application**. Its six browser cases are TC01, TC02 and TC05–TC08; Page Object Model (POM) classes perform the operator actions. TC03 and TC04 belong to the separate [API testing folder](../../API%20testing/api-test-suite.md).

[UI case definitions](../functional-test-suite.md) · [UI results](../functional-testing-results.md) · [API results](../../API%20testing/api-testing-results.md)

## Install Playwright

Requires Node.js 22.13 or later with npm. From the repository root:

~~~sh
node --version
npm --version
cd "QA/Quality Control/Buggy build/Functional testing/executed_functional_test_cases"
npm ci
npm ci --prefix "../../../../../MustPayroll/MustPayroll_buggy"
npx playwright install --no-shell chromium
~~~

Playwright, TypeScript and tsx install locally from the lockfile. On Linux, use `npx playwright install --with-deps --no-shell chromium` to install browser system dependencies too.

## Run this build

From this execution directory:

~~~sh
npm run verify
~~~

The command type-checks this project, rebuilds only `MustPayroll/MustPayroll_buggy` and runs its six UI cases once. The temporary server uses `http://127.0.0.1:4184` and this project’s isolated test database; normal application records are unchanged.

Expected Playwright outcomes: **2 passed / 4 failed (TC01, TC06, TC07 and TC08)**. Verification rejects unexpected failures, skips, timeouts or automatic retries. The buggy assertions remain failures; a successful verification command means that the expected defects were reproduced, not that the buggy application is ready for release.

To build and run Playwright directly:

~~~sh
npm run build:app
npm test
~~~

`npm test` exits with failure when the four expected defects are detected. Configuration paths resolve from this project, including when VS Code opens the repository root. No build selector or files from the other QC project are used.

## Prepare case data

This preparation is for manual browser review. It creates starting records and one-use service failures; it does not process payroll or add API test cases. Playwright prepares its own data when `npm run verify` runs.

1. From the repository root, start the buggy application with `npm --prefix MustPayroll/MustPayroll_buggy start`.
2. Import [this build’s Postman collection](../../API%20testing/postman/MustPayroll.postman_collection.json). In its **Variables** tab, set `baseUrl` to `http://127.0.0.1:4175` and save. Send `GET {{baseUrl}}/api/health` with no body; require HTTP `200` and `build.variant: faulty`.
3. Under **UI setup only**, choose the folder for the case below. Send `POST {{baseUrl}}/api/payroll-datasets` with that row’s Create body. For POST requests, use `Content-Type: application/json` and **Body → raw → JSON**. Require HTTP `201`; copy the top-level response `payrollDatasetId` into the collection variable `payrollDatasetId` and save.
4. For TC05 or TC06 only, send the Extra preparation request shown in the same row once; require HTTP `200`. Do not prepare the failure again before retry. Other cases need no extra request.
5. Open `http://127.0.0.1:4175/earnings?payrollDatasetId=PAYROLL_DATASET_ID` for TC01 or `http://127.0.0.1:4175/pay-runs?payrollDatasetId=PAYROLL_DATASET_ID` for the other cases. Replace `PAYROLL_DATASET_ID` with the returned value and follow the [UI case](../functional-test-suite.md). Use a new test dataset for each case.

Each test dataset is an isolated set of employees and payroll records. The API returns its identifier as `payrollDatasetId`; the browser link’s `payrollDatasetId` parameter loads those records. These are test-preparation parameters, not operator controls. `testDataPreset` selects the starting records described below. Each setup includes Amara, Daniel and Zara; it creates no payment. Processing simulates the selected Tuesday at 09:00 UTC, so no calendar wait is needed.

| UI case | Postman setup folder | Create body | Extra preparation | Starting state |
|---|---|---|---|---|
| TC01 | TC01 &#124; Earnings entry and approval | <pre lang="json"><code>{&#10;  "testDataPreset": "employeesOnly"&#10;}</code></pre> | None. | Three employees; empty earnings. Enter the seven TC01 records through Earnings before approving or rejecting them. |
| TC02 | TC02 &#124; Period boundaries | <pre lang="json"><code>{&#10;  "testDataPreset": "payPeriodBoundaryEarnings"&#10;}</code></pre> | None. | Four Approved boundary earnings for Amara: $200 before opening, $100 at opening, $300 before closing and $400 at closing. Exact timestamps are in TC02 Test Data. |
| TC05 | TC05 &#124; Payment failure | <pre lang="json"><code>{&#10;  "testDataPreset": "oneApprovedEarning"&#10;}</code></pre> | <code>POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/test-controls/next-failure</code><pre lang="json"><code>{&#10;  "failureType": "paymentRecording"&#10;}</code></pre> | Amara’s Approved $1,500 earning dated 8 Oct 2026, 12:00 UTC; first payment attempt fails once. |
| TC06 | TC06 &#124; Delivery failure | <pre lang="json"><code>{&#10;  "testDataPreset": "oneApprovedEarning"&#10;}</code></pre> | <code>POST {{baseUrl}}/api/payroll-datasets/{{payrollDatasetId}}/test-controls/next-failure</code><pre lang="json"><code>{&#10;  "failureType": "notificationDelivery"&#10;}</code></pre> | Amara’s Approved $1,500 earning dated 8 Oct 2026, 12:00 UTC; first notification attempt fails once. |
| TC07 and TC08 | TC07 and TC08 &#124; Normal payment | <pre lang="json"><code>{&#10;  "testDataPreset": "oneApprovedEarning"&#10;}</code></pre> | None. | Amara’s Approved $1,500 earning dated 8 Oct 2026, 12:00 UTC; no service failure. Create separate test datasets for TC07 and TC08. |

## TC01 earning data

Create an empty TC01 test dataset using its single Postman setup request. In **Earnings**, enter all seven records below as **Pending approval**. Select **Reject earnings** on Amara’s $250 claim and confirm. Approve only the four records marked Approved; leave the other two pending. All timestamps are UTC.

Both review controls apply only to pending records in an unprocessed period. Rejection changes the record to **Rejected** and shows **Earnings rejected.** It does not create a payment. Check four Approved, two Pending and one Rejected before processing.

| Employee | Description | Amount USD | Earned at (2026) | Final status |
|---|---|---|---|---|
| Amara Okafor | Weekly project earnings | $1,200 | 8 Oct 12:00 | Approved |
| Amara Okafor | Approved delivery bonus | $300 | 9 Oct 15:00 | Approved |
| Daniel Mensah | Weekly project earnings | $2,000 | 9 Oct 12:00 | Approved |
| Zara Bello | Weekly project earnings | $850 | 10 Oct 12:00 | Approved |
| Zara Bello | Next period project earnings | $850 | 12 Oct 08:00 | Pending |
| Amara Okafor | Unapproved bonus | $500 | 9 Oct 16:00 | Pending |
| Amara Okafor | Rejected claim | $250 | 8 Oct 12:00 | Rejected |

## Read and maintain the results

The [functional results](../functional-testing-results.md) record this build’s six browser outcomes. `npm run verify` prints outcomes and saves diagnostics under this project’s ignored `data/playwright` folder. It does not rewrite the submitted Markdown table. Review the run before updating observations, execution time and build ID.

Technical requests prepare data and corroborate saved payment identities; they are not additional API cases. Repeat the two API cases separately using the [Postman instructions](../../API%20testing/api-test-suite.md#postman-setup). Their results remain in the API testing folder.

## Reproduce PAY-001 manually

With this application running, use `npm run scenario` from this execution directory. It creates unpaid records only in the buggy application and prints a pay-run URL. Open it, process once, inspect the payment and notification, then retry the same pay run. No failure setup is needed. The command does not process payroll itself.

The **TC07 and TC08 &#124; Normal payment** Postman setup folder provides the same starting data. For HTTP reproduction, use **PAY-001 and PAY-003 | Missing notification and duplicate payment** in this build’s collection. Steps 1–5 check missing notification work ([PAY-003](../../../bug_report/API%20bug%20reports/payment-saved-without-notification-api.md)); steps 6–7 check duplicate payment on payroll retry ([PAY-001](../../../bug_report/API%20bug%20reports/duplicate-payment-on-pay-run-retry-api.md)). These reproduce TC08 and TC07 without adding cases.
