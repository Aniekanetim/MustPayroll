# MustPayroll — buggy build

MustPayroll is a local payroll application. An operator records employee earnings, reviews them for approval, processes weekly payments and checks whether employees were notified about those payments.

All employees, bank destinations and amounts are synthetic. Amounts are in US dollars (USD). **Paid** means a payment was recorded in the local database; **Sent** means simulated notification delivery succeeded. No real funds move or external messages are sent.

## Why there are two builds

MUST Company's Quest assessment asks for a regression check that fails against faulty behavior and passes after correction. A regression check is a repeatable test that detects a defect returning after a change.

This folder contains the **buggy build**, which preserves three deliberate defects so a reviewer can reproduce them. The [fixed build](../MustPayroll_fixed/README.md) corrects those defects. Both are tested with equivalent starting records and the same expected business outcomes; the expected result is not changed to accommodate a defect.

Each build has its own interface, server, payment policy, build tools and database. They can run independently or side by side. Processing or resetting payroll in one leaves the other unchanged. Resetting records does not switch a build's policy.

## Understand the required payroll flow

An **earning** records an amount proposed for an employee's pay. Approval determines whether it can be paid. A **pay run** groups eligible earnings for a weekly period and records each employee's payment. The following journey describes the required behavior, implemented by the fixed build; the next section explains where this build departs from it.

1. **Overview — choose the period.** Select a Tuesday **Pay date** and review the earning window and totals. The application accepts past and future Tuesdays.
2. **Employees — check who will be paid.** Review the employee and masked bank destination, or use **Add employee**. **Record earnings** opens the earning form with that employee selected.
3. **Earnings — establish what is payable.** Record the amount and when it was earned. Approve authorized earnings, reject invalid claims or leave undecided records Pending. Only Approved earnings should contribute to pay. Recording or approving earnings alone creates no payment.
4. **Pay runs — review and process.** Check the period and approved employee totals, then select **Pay on Tuesday 09:00 UTC** and confirm. This simulates the selected due time without waiting for the calendar or changing the workstation clock. Processing freezes the selected earnings and employee totals, locking the period against new earnings and approval changes.
5. **Payments — verify the recorded payment.** Open **View receipt** and compare its amount, reference, destination and contributing earnings with the approved payroll.
6. **Notifications — verify delivery separately.** Every successful payment should have one linked notification. Successful delivery becomes Sent; failed delivery remains Pending while the payment stays Paid. Return to Overview to reconcile approved and recorded pay for the same period.

The earning window uses Coordinated Universal Time (UTC): Monday at 00:00, included, through the next Monday at 00:00, excluded. For a pay date of **13 October 2026**, include earnings from **5 October at 00:00 UTC** up to, but not including, **12 October at 00:00 UTC**. An earning exactly at the closing boundary belongs to the following period.

If a payment fails, retry the original pay run using its frozen totals. If only notification delivery fails, retry the existing Pending notification. Neither action should create a second payment for an employee already paid for that period. The [business rules](../../QA/Quality%20assurance/business_rules.md) define the full requirements; the [application documentation](../../documentation/README.md) explains each module and its connections.

## What goes wrong in this build

The buggy build violates three parts of that flow. The PAY labels identify the defect reports; TC identifies the test case that checks the behavior.

| Defect | What this build does | Check and report |
|---|---|---|
| Pays earnings without approval | Includes Pending and Rejected earnings in the period's payment calculation | TC01 · [PAY-002: unapproved earnings paid](../../QA/Quality%20Control/bug_report/UI%20functional%20bug%20reports/unapproved-earnings-paid-functional.md) |
| Loses notification work | Saves a payment without saving its linked instruction to notify the employee | TC08 during normal processing; TC06 when delivery failure is configured · [PAY-003: payment without notification](../../QA/Quality%20Control/bug_report/UI%20functional%20bug%20reports/payment-saved-without-notification-functional.md) |
| Pays again on retry | Treats the employee as unpaid because it checks for a Sent notification instead of the saved payment | TC07 · [PAY-001: duplicate payment on retry](../../QA/Quality%20Control/bug_report/UI%20functional%20bug%20reports/duplicate-payment-on-pay-run-retry-functional.md) |

The selected investigation connects the last two defects. A payment succeeds, but its notification instruction is missing. The completion check therefore treats the employee as unpaid, and retry records another payment. This happens during ordinary processing; no service failure or internet disconnection is needed.

The interface shows ordinary amounts, references and delivery states. Establish the defects by comparing those records with the rules above; a Paid status alone does not establish that an amount was approved or paid only once.

## Start this application

Requires Node.js 22.13 or later with npm. From the repository root:

~~~sh
cd MustPayroll/MustPayroll_buggy
npm start
~~~

Open the [buggy application](http://127.0.0.1:4175/overview). Its compiled interface is included, so starting it requires no dependency installation. First use loads example employees and earnings; inspect those records before adding more.

This build stores payroll records in its own `data/payroll-usd.sqlite` file. Browser storage remembers which set of records and pay date to reopen. Keep the server on localhost: it has no authentication.

On upgrade, the server migrates the legacy data-isolation tables and columns automatically while preserving earning IDs, payments, notifications and audit history. Saved browser references and older review links carry forward to `payrollDatasetId`. Restart the application and refresh the page after updating; no payroll reset is required.

## Reproduce the selected failure

Use the [manual preparation instructions](../../QA/Quality%20Control/Buggy%20build/Functional%20testing/executed_functional_test_cases/README.md#reproduce-pay-001-manually) to create a separate set of unpaid records containing only Amara's Approved **$1,500** earning for the **13 October 2026** pay run. Open the pay-run URL produced by that preparation. This isolates the example from any existing payments.

1. In **Pay runs**, confirm the date and $1,500 approved total. Select **Pay on Tuesday 09:00 UTC** and confirm once.
2. In **Payments**, retain the $1,500 payment reference and open its receipt. Notification is **Not available**. **Notifications** contains no linked record, so there is no Pending instruction to retry.
3. Return to the same pay date. For this controlled reproduction, confirm **Retry pay run** once. Recorded pay increases to **$3,000 across two payments**, violating the required one-payment rule. Retain both references rather than retrying again.

Repeat the same preparation and actions in the [fixed build](../MustPayroll_fixed/README.md#verify-the-correction). It should retain one $1,500 payment, its original reference and one linked Sent notification. In an operational system, a payment with missing notification work would require repair while preserving the payment; repeating payment is not a recovery action.

## Review or repeat the checks

The recorded eight-case comparison contains **four passes and four failures** for buggy, followed by **eight passes** for fixed. Each build has six browser cases automated with Playwright and two application programming interface (API) cases checking service requests and responses. The [browser results](../../QA/Quality%20Control/Buggy%20build/Functional%20testing/functional-testing-results.md) and [API results](../../QA/Quality%20Control/Buggy%20build/API%20testing/api-testing-results.md) identify the executed build and observed outcomes.

Use this build's [execution guide](../../QA/Quality%20Control/Buggy%20build/Functional%20testing/executed_functional_test_cases/README.md#run-this-build) to rerun the browser checks. Repeat the two API cases separately using the [Postman instructions](../../QA/Quality%20Control/Buggy%20build/API%20testing/api-test-suite.md#postman-setup). The [final directive](../../QA/directive.md) connects the investigation, evidence and release decision. The buggy build is blocked from release because it violates the payment and notification rules.

## Start another local payroll cycle

To repeat a week from an empty state, open **Settings**, select its Tuesday pay date and confirm **Reset selected pay week**. Reset removes that week's earnings, payments, notifications, delivery receipts and saved run. It preserves employees, other weeks and audit history, then reopens the week for new earnings.

Reset clears the records needed to investigate the original cycle. Retain the evidence first. Use **Retry pay run** for recovery of an existing run; use reset only to start a new local cycle. Resetting this build leaves its buggy policy in place.

## Source, rebuild and development

The behavior described above is implemented in [server/payment-policy.mjs](server/payment-policy.mjs). This application folder contains everything needed to run the build; the linked QA records and product documentation remain elsewhere in the repository.

To rebuild from source, run the following from this application folder:

~~~sh
npm ci
npm run build
npm start
~~~

Building compiles the interface and refreshes `build-manifest.json` and `server/build-info.mjs`, which identify the packaged source and runtime files. The fingerprint includes this README, so a documentation change also changes the build ID. Building preserves the local database. For development, `npm run dev` starts the API server on port 4175 and the Vite interface on port 5175.

Licensing is documented in [LICENSE](LICENSE).
