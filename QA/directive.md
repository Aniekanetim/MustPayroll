# Prevent duplicate payment during payroll recovery

**[Watch the Loom video](https://www.loom.com/share/d5cdf9681c7a419ca12605496202e27c)** — professional case, AI use and personal ownership.

## Objective

Reproduce and prevent a payroll retry that pays an employee twice after payment succeeds without its notification instruction being saved. In the controlled example, approved earnings are $1,500. Recovery must retain the original payment and complete notification delivery.

[Intent](Quality%20assurance/intent.md) ranks four possible failures and explains this selection.

## Business rule and scope

MustPayroll uses synthetic employees, approved earnings, a local payment ledger and simulated notification delivery. Payment success is a committed database record; no real funds move. Each earning contributes once, and each employee receives one approved total per weekly period.

The example pay date is 13 October 2026 at 09:00 UTC. Its earning window is 5 October 00:00 UTC, inclusive, to 12 October 00:00 UTC, exclusive. Retry preserves the original period and frozen approved totals. [Business rules and flow](Quality%20assurance/business_rules.md) define eligibility, account/admin assumptions and recovery.

## Before-and-after comparison

MUST Company's Quest assessment requires the selected regression to fail against faulty behavior and pass after correction. The repository retains two independently runnable applications so the reviewer can reproduce both sides of that comparison: [buggy](../MustPayroll/MustPayroll_buggy) preserves the controlled defects; [fixed](../MustPayroll/MustPayroll_fixed) implements their corrections.

Each application has its own server, payment policy and database, and each has a separate quality control folder with its own browser execution project, API collection and results. Equivalent starting data, the same eight cases and unchanged expected outcomes make the comparison meaningful. Retrying $1,500 of approved pay must preserve one $1,500 payment in both versions; buggy's $3,000 result is the failure the check detects.

The [build comparison](Quality%20assurance/business_rules.md#two-builds-one-business-rule) identifies both applications, what remains constant and how the [three controlled defects map to four failed cases](Quality%20assurance/business_rules.md#controlled-defects-and-their-checks). The selected investigation follows missing notification work into duplicate payment on retry; the additional approval defect is covered by TC01.

## Requirements and completion criteria

1. Keep inputs and business expectations identical in both builds. Simulate the selected Tuesday at 09:00 UTC explicitly; pay only approved earnings, leaving pending and rejected earnings unpaid without blocking approved pay.
2. Preserve a committed payment when notification fails; never notify an unpaid employee.
3. Save notification work for every committed payment; recover pending delivery without changing the original payment or adding another payment.
4. Verify the same eight cases against both builds: six UI journeys with Playwright POM and two API cases supplied for manual Postman review. Cover happy path, cut-off, timezone conversion, duplicate input, retry and partial failure. UI cases check browser outcomes; API cases specify requests and response fields. Keep technical UI setup and supporting identity checks in each build’s execution guide. The selected regression must fail on the buggy build and pass on the fixed build.
5. Provide the actionable defect report, release checklist, remaining limits and handoff linked below.

## Failure, cause and correction

The buggy policy omits notification creation and treats a Sent notification as proof of completed payment. The payment exists but the notification does not, so payroll retry pays again. The fixed policy checks committed employee-period payment identity and saves payment plus pending notification work atomically before attempting delivery. [PAY-001](Quality%20Control/bug_report/UI%20functional%20bug%20reports/duplicate-payment-on-pay-run-retry-functional.md) documents duplicate payment on retry; [PAY-003](Quality%20Control/bug_report/UI%20functional%20bug%20reports/payment-saved-without-notification-functional.md) documents the missing notification work. Their paired functional and API reports are linked from the [bug report index](Quality%20Control/bug_report/README.md), with separate reproduction steps, expected and actual results, and evidence. The defects were deliberately introduced for this investigation.

## Quality control results and verification evidence

Quality control is organized by [Buggy build](Quality%20Control/Buggy%20build) and [Fixed build](Quality%20Control/Fixed%20build). Each contains an API testing folder with two cases, results and a script-free Postman collection, plus a Functional testing folder with six browser cases, results and an independently runnable Playwright POM project. Functional testing here means browser/UI testing; the API cases also verify functional business rules. Both builds use identical inputs and expectations. UI setup requests and alternate defect reproductions do not add cases.

Buggy produced four passes and four failures; fixed passed all eight. TC01 detects $5,100 recorded against $4,350 approved. TC07 detects two $1,500 payments instead of preserving one. TC08 detects payment without notification work. TC06 also fails because no notification instruction exists to reach the required Pending-delivery state after the configured delivery failure. TC02, TC03, TC04 and TC05 pass their boundary, timezone, duplicate-input and payment-recovery checks. Four failing cases represent three controlled defects.

The [results/handoff appendix](#resultshandoff-appendix) links all four result tables and both execution projects. Run `npm run verify` separately in each project to repeat its six browser cases. Each command rebuilds and tests only its own application, using a separate test database. Supporting saved-record checks corroborate payment identity, selection and linked notification work.

API tables record the checked response fields. These observations were checked directly against the local service, rather than through the Postman app. The supplied collection lets the reviewer repeat those requests and reproduce all three documented defects independently.

## Release decision and verified scope

**Final release decision: the fixed build meets the defined local payroll release criteria. The buggy build is blocked.** The [release checklist](Quality%20assurance/release_readiness.md) connects each condition to its evidence.

The decision covers the six defined browser journeys, two API cases and supporting saved-record checks using local ledger records and simulated delivery in one Node/SQLite process with desktop Chromium at 1280 × 900. The applications have no authentication and remain on localhost. Other browser/device layouts, a complete UI audit, real banking, tax, external delivery, autonomous scheduling, mutable account/admin settings, concurrency and crash durability are outside the verified scope. Production frequency, loss and support reduction are unknown.

## Results/handoff appendix

The [public repository](https://github.com/Aniekanetim/MustPayroll) provides both applications and the following deliverables:

| Deliverable | Link |
|---|---|
| Intent | [Risk ranking and selection](Quality%20assurance/intent.md) |
| Business flow and assumptions | [Business rules](Quality%20assurance/business_rules.md) |
| Runnable test projects | [Buggy setup and execution](Quality%20Control/Buggy%20build/Functional%20testing/executed_functional_test_cases/README.md), [fixed setup and execution](Quality%20Control/Fixed%20build/Functional%20testing/executed_functional_test_cases/README.md) |
| API collections | [Buggy Postman collection](Quality%20Control/Buggy%20build/API%20testing/postman/MustPayroll.postman_collection.json), [fixed Postman collection](Quality%20Control/Fixed%20build/API%20testing/postman/MustPayroll.postman_collection.json) |
| Test cases | [Buggy UI](Quality%20Control/Buggy%20build/Functional%20testing/functional-test-suite.md), [buggy API](Quality%20Control/Buggy%20build/API%20testing/api-test-suite.md), [fixed UI](Quality%20Control/Fixed%20build/Functional%20testing/functional-test-suite.md), [fixed API](Quality%20Control/Fixed%20build/API%20testing/api-test-suite.md) |
| Results | [Buggy UI](Quality%20Control/Buggy%20build/Functional%20testing/functional-testing-results.md), [buggy API](Quality%20Control/Buggy%20build/API%20testing/api-testing-results.md), [fixed UI](Quality%20Control/Fixed%20build/Functional%20testing/functional-testing-results.md), [fixed API](Quality%20Control/Fixed%20build/API%20testing/api-testing-results.md) |
| Professional case, AI use and personal ownership | [Watch the Loom video](https://www.loom.com/share/d5cdf9681c7a419ca12605496202e27c) |
| Defect reports and root cause | [Bug report index](Quality%20Control/bug_report/README.md) — separate functional and API reports for PAY-001, PAY-002 and PAY-003; [failure, cause and correction](#failure-cause-and-correction) |
| Release checklist | [Conditions and decision](Quality%20assurance/release_readiness.md) |

| Observed state | Handoff action |
|---|---|
| Payment exists; notification pending | Retry delivery through Notifications, preserving the payment reference and amount. |
| Payment exists; no notification record | Retain the payment reference and escalate for notification repair without creating another payment. Notification-only retry cannot recreate missing work. |
| Employee remains unpaid | Retry the original pay run, retaining its period, frozen totals and successful payments. |
| Duplicate payments or an amount mismatch | Stop processing the affected pay period in that build. Retain payment references, counts, amounts, notification state and attempted recovery; escalate for reconciliation. |

## AI assistance and ownership

I used AI tools like Claude and Chatgpt for brainstorming, GitHub Copilot for boilerplate code, fixture and automation script generation, and documentation. I don't see AI as a replacement for critical thinking. I owned the QA scope, script review for correctness, execution, expected behavior and release judgment within the stated local limits.

## Loom walkthrough

**Video link:** [Watch the Loom video](https://www.loom.com/share/d5cdf9681c7a419ca12605496202e27c)

The recording covers the Octav wrong-chain case: what I found, how I investigated it, how I verified engineering’s correction and the regression checks. It also explains how I use AI in QA and what I personally owned.
