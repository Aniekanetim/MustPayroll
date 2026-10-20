# MustPayroll Release Readiness

**Decision: the fixed build meets the defined local payroll criteria. The buggy build is blocked.**

MustPayroll combines approved employee earnings into weekly payments and linked notifications. This checklist compares both builds against the same [business rules](business_rules.md), using identical cases and inputs. A pass requires the specified payment and notification outcomes.

## Purpose of the two-build comparison

The buggy build preserves the faulty implementation so the checks can demonstrate the defects. The fixed build applies the corrections so those same checks can verify the required behavior. Both are assessed against the same business rules; a buggy result that violates a rule remains a failed case.

Each build has its own application database, browser execution project, API collection and results. Equivalent starting data are prepared independently. The [comparison design and controlled-defect mapping](business_rules.md#two-builds-one-business-rule) explains the separation and connects each behavior to its checks.

## Evidence used for the decision

Six cases exercise the browser user interface (UI) through Playwright automation. Two cases check application programming interface (API) requests and responses. The recorded API observations came from direct HTTP checks; the supplied Postman requests allow independent reproduction.

| Evidence | Buggy build | Fixed build |
|---|---|---|
| Six browser cases | [UI results](../Quality%20Control/Buggy%20build/Functional%20testing/functional-testing-results.md) | [UI results](../Quality%20Control/Fixed%20build/Functional%20testing/functional-testing-results.md) |
| Two API cases | [API results](../Quality%20Control/Buggy%20build/API%20testing/api-testing-results.md) | [API results](../Quality%20Control/Fixed%20build/API%20testing/api-testing-results.md) |

The tables identify the executed builds and observations. Use the [UI execution guide](../Quality%20Control/Fixed%20build/Functional%20testing/executed_functional_test_cases/README.md) to repeat browser checks, or the [directive](../directive.md#quality-control-results-and-verification-evidence) to review both test channels together.

## Release conditions and results

Each TC identifier names one of the eight test cases. A failed condition blocks release of the affected payroll flow.

| Required outcome | Case / suite | Buggy | Fixed |
|---|---|---|---|
| Pay only approved, current-period employee totals | TC01 / UI · [Unapproved earnings paid](../Quality%20Control/bug_report/UI%20functional%20bug%20reports/unapproved-earnings-paid-functional.md) | FAIL: $5,100 recorded against $4,350 approved | PASS |
| Include the opening boundary; pay closing-boundary earnings only in the following period | TC02 / UI | PASS | PASS |
| Convert timezone offsets to UTC before selecting earnings | TC03 / API | PASS | PASS |
| Count an identical earning ID once | TC04 / API | PASS | PASS |
| A failed payment creates no notification; one retry records the unpaid amount once | TC05 / UI | PASS | PASS |
| Keep successful payment and a Pending notification when delivery fails | TC06 / UI · [Payment without notification](../Quality%20Control/bug_report/UI%20functional%20bug%20reports/payment-saved-without-notification-functional.md) | FAIL: notification instruction absent; delivery failure not reached | PASS |
| Retry preserves the original payment, amount and linked notification identity | TC07 / UI · [Duplicate payment on retry](../Quality%20Control/bug_report/UI%20functional%20bug%20reports/duplicate-payment-on-pay-run-retry-functional.md) | FAIL: a second payment increases recorded pay to $3,000 | PASS |
| Save linked notification work for every successful payment | TC08 / UI · [Payment without notification](../Quality%20Control/bug_report/UI%20functional%20bug%20reports/payment-saved-without-notification-functional.md) | FAIL: payment exists without notification work | PASS |

| Build | Browser results | API results | Overall |
|---|---|---|---|
| Buggy | 2 passed / 4 failed | 2 passed / 0 failed | 4 passed / 4 failed |
| Fixed | 6 passed / 0 failed | 2 passed / 0 failed | 8 passed / 0 failed |

Four buggy failures represent three defects: unapproved payment (TC01), duplicate payment on retry (TC07), and missing notification work exposed under normal delivery and delivery-failure conditions (TC08 and TC06). The [defect mapping](business_rules.md#controlled-defects-and-their-checks) explains why the missing instruction causes both notification cases to fail.

TC02, TC03, TC04 and TC05 pass in both builds because their period-boundary, timezone, duplicate-input and payment-retry rules remain correct. They are judged on those rules; notification creation is checked separately. This produces four passes and four failures in buggy, followed by eight passes in fixed.

Unapproved payment, duplicate payment, lost notification work, notification before successful payment or a changed successful payment blocks release. Passing other cases cannot compensate for these failures.

## Verified scope and remaining limits

Verification covers desktop Chromium at 1280 × 900 and direct API response checks in one Node.js/SQLite process. Payments are local ledger records; Sent means simulated delivery succeeded, without external receipt confirmation.

Real banking, external messaging, authentication, concurrency, crash durability, other browsers/devices and complete UI/accessibility coverage remain unverified. The decision applies to the defined local payroll flow; the [directive](../directive.md#release-decision-and-verified-scope) records these limits.

## Handoff

Recovery depends on what was saved:

- **Payment exists and notification is Pending:** retry the existing notification, keeping the payment reference and amount unchanged.
- **Employee has no payment:** retry the original pay run using its frozen totals—the earning selection and employee amounts saved when processing began.
- **Payment exists without notification work:** preserve its reference and escalate for notification repair; do not create another payment.
- **Payment totals or counts disagree with approved payroll:** retain the records and escalate for repair and reconciliation.

The [handoff appendix](../directive.md#resultshandoff-appendix) links supporting work. Changed behavior or expectations require corresponding verification evidence before this decision is revised.
