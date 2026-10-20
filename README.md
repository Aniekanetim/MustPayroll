# MustPayroll

**[Loom video](https://www.loom.com/share/d5cdf9681c7a419ca12605496202e27c)** · [intent.md](QA/Quality%20assurance/intent.md) · [Directive.md](QA/directive.md) · [Portfolio.md](portfolio.md) · [Business rules](QA/Quality%20assurance/business_rules.md) · [Release-readiness checklist](QA/Quality%20assurance/release_readiness.md)

[![Watch Aniekan Etim's Loom video: professional QA case, AI use and personal ownership](documentation/assets/loom-video-preview.svg)](https://www.loom.com/share/d5cdf9681c7a419ca12605496202e27c)

MustPayroll is a local payroll application for recording and reviewing employee earnings, processing payments and tracking notifications. This repository contains a quality assurance (QA) investigation for MUST Company's assessment: reproducing a duplicate-payment defect, identifying its cause and verifying the correction.

The repository provides two versions of the same application: a **buggy build** that preserves deliberately introduced defects and a **fixed build** that corrects them. Both let you add employees, select any past or future Tuesday and reset one pay week from Settings to repeat its cycle. Payment and employee-notification statuses are reported separately.

All employees and amounts are test data. Amounts are in US dollars (USD); API amounts use integer cents. Payments are local database records; no real money moves.

## Understand the application

Start with the [application documentation](documentation/README.md) to learn the business purpose, product requirements, complete payroll journey and the role of each module. It explains how employee records, earnings, pay runs, payments and notifications connect.

## The payroll recovery rule

An employer approves an employee's earnings and processes payroll. The application must save the payment together with its notification instruction, then attempt delivery.

If notification delivery fails, the payment remains valid. Retrying the same pay run must send the pending notification without creating another payment.

## Why there are two builds

MUST Company's Quest assessment asks for an automated regression check that fails against faulty behavior and passes after correction. Keeping both builds available makes that comparison independently repeatable:

- **Buggy build:** preserves the failure so the reviewer can confirm that the check detects the broken business rule.
- **Fixed build:** applies the correction so the same check can confirm that the business rule is satisfied.

Each application has its own compiled interface, server, payment policy, build tools and database. Each also has a separate quality control (QC) folder containing its test tooling and results. Processing or resetting a pay week in one build leaves the other build's records unchanged.

Both receive equivalent starting employees, earnings, approval statuses, pay dates and failure conditions. The eight cases and their expected outcomes stay the same. This lets the reviewer attribute the changed result to the correction while keeping the original failure available for comparison.

## What the two builds demonstrate

The selected investigation starts with **$1,500 of approved earnings** for one employee. The required outcome is one payment for that employee and pay period, including after retry.

In the buggy build, processing records the payment without its notification instruction. The application then uses notification success to decide whether payment is complete. Because the notification is missing, retry creates another $1,500 payment. In the fixed build, processing saves the payment with its notification work and checks the saved payment before paying again. Retry preserves the original payment reference and amount.

| Build | Outcome after retry | Eight-case results |
|---|---|---|
| [Buggy](MustPayroll/MustPayroll_buggy) | $3,000 across two payments | **4 passed, 4 failed** · [UI](QA/Quality%20Control/Buggy%20build/Functional%20testing/functional-testing-results.md) · [API](QA/Quality%20Control/Buggy%20build/API%20testing/api-testing-results.md) |
| [Fixed](MustPayroll/MustPayroll_fixed) | $1,500 across one payment; the original reference is preserved and the notification is sent | **8 passed, 0 failed** · [UI](QA/Quality%20Control/Fixed%20build/Functional%20testing/functional-testing-results.md) · [API](QA/Quality%20Control/Fixed%20build/API%20testing/api-testing-results.md) |

The expectation remains $1,500 in both versions. Buggy's $3,000 result fails that expectation; fixed's unchanged $1,500 payment passes it.

Each build is evaluated using six browser user-interface (UI) cases automated with Playwright's Page Object Model (POM), plus two application programming interface (API) cases supplied for manual Postman reproduction. The [buggy QC folder](QA/Quality%20Control/Buggy%20build) and [fixed QC folder](QA/Quality%20Control/Fixed%20build) contain their respective suites, results and execution tools. Both offer **Pay on Tuesday 09:00 UTC** to simulate the selected pay date without waiting.

The TC labels below identify the checks exposing the three controlled defects:

| Controlled defect | Checks that expose it |
|---|---|
| Duplicate payment on payroll retry | TC07: the same $1,500 pay run produces two payments totaling $3,000 |
| Payment of Pending and Rejected earnings | TC01: $5,100 is recorded against $4,350 approved |
| Payment saved without notification work | TC08: normal processing creates no notification. TC06: the configured delivery failure is never reached because no notification instruction exists |

Missing notification work leads into the selected duplicate-payment investigation; approval bypass is an additional check. TC06 and TC08 expose the same missing-record defect, so four failed cases represent three defects. TC02–TC05 pass their period-boundary, timezone, duplicate-input and payment-recovery expectations in both builds.

The [controlled-defect mapping](QA/Quality%20assurance/business_rules.md#controlled-defects-and-their-checks) explains each correction. The [execution comparison](QA/directive.md#quality-control-results-and-verification-evidence) links the recorded build identities and results. Use the [Playwright execution guide](QA/Quality%20Control/Fixed%20build/Functional%20testing/executed_functional_test_cases/README.md#run-this-build) to repeat the automated checks.

The buggy build is blocked from release. The fixed build meets the defined criteria for the six local Chromium workflows and two direct API response checks. API cases and defect reproductions can be repeated in Postman. Real banking, external notification delivery and concurrent processing remain outside the verified scope.

## Review the assessment

Start with the [final directive](QA/directive.md) for the objective, requirements, supporting documents, release decision and handoff. Then use:

- The [buggy QC folder](QA/Quality%20Control/Buggy%20build) and [fixed QC folder](QA/Quality%20Control/Fixed%20build) to review each build’s UI/API suites, results and execution instructions.
- The [bug report index](QA/Quality%20Control/bug_report/README.md) to review separate functional and API reports for each of the three confirmed defects, including reproduction, expected and actual results, and evidence.

The separate [professional portfolio](portfolio.md) presents three case reports covering blockchain network accuracy, portfolio valuation and betting settlement.

## Run the applications

Requires Node.js 22.13 or later. After cloning or downloading this repository, open two terminals in its root folder. The compiled applications are included, so starting them requires no dependency installation.

In the first terminal, start the buggy build:

~~~sh
npm --prefix MustPayroll/MustPayroll_buggy start
~~~

Open the [buggy application](http://127.0.0.1:4175/overview).

In the second terminal, start the fixed build:

~~~sh
npm --prefix MustPayroll/MustPayroll_fixed start
~~~

Open the [fixed application](http://127.0.0.1:4176/overview).

Use the [buggy execution guide](QA/Quality%20Control/Buggy%20build/Functional%20testing/executed_functional_test_cases/README.md) or [fixed execution guide](QA/Quality%20Control/Fixed%20build/Functional%20testing/executed_functional_test_cases/README.md) to prepare data and run that build’s six Playwright UI cases. Each QC folder’s API testing section contains its Postman collection and two API cases. Keep both applications on localhost; they have no authentication.
