# MustPayroll Bug Reports

MustPayroll records employee earnings, processes approved pay for a selected period and tracks the resulting employee notifications. Testing confirmed three defects in the buggy build. Each has a browser report and an API report, giving six reports for the same three defects.

The [UI functional bug reports](UI%20functional%20bug%20reports/) and [API bug reports](API%20bug%20reports/) folders contain the reports linked below. **Functional reports** show operator actions in the browser. **API reports** give the methods, endpoints and JSON bodies to repeat in Postman. The reports assume the application is already running. Functional preconditions describe employee and pay-week state; reproduction uses only browser controls. API reports keep their Postman variables, endpoints and request bodies together.

| Defect | Functional report | API report | Verification coverage |
|---|---|---|---|
| PAY-001 — duplicate payment on payroll retry | [Browser reproduction](UI%20functional%20bug%20reports/duplicate-payment-on-pay-run-retry-functional.md) | [Postman reproduction](API%20bug%20reports/duplicate-payment-on-pay-run-retry-api.md) | Functional TC07; PAY-001 HTTP verification |
| PAY-002 — Pending and Rejected earnings paid | [Browser reproduction](UI%20functional%20bug%20reports/unapproved-earnings-paid-functional.md) | [Postman reproduction](API%20bug%20reports/unapproved-earnings-paid-api.md) | Functional TC01; PAY-002 HTTP verification |
| PAY-003 — payment saved without notification work | [Browser reproduction](UI%20functional%20bug%20reports/payment-saved-without-notification-functional.md) | [Postman reproduction](API%20bug%20reports/payment-saved-without-notification-api.md) | Functional TC06 and TC08; PAY-003 HTTP verification |

Every report moves from the rule and failure to the setup, test data and numbered reproduction steps. Expected result states the required behavior; Actual result states the observed failure. Each report ends with Evidence linking the buggy execution and fixed-build verification. The nine fields are Title, Bug description, Test case that verified the bug, Preconditions, Test data, Steps to reproduce, Expected result, Actual result and Evidence.

All employees and amounts are synthetic. A payment is a local database record; a Sent notification represents simulated delivery. No real funds move or external messages are sent.

TC06 and TC08 expose the same missing-notification defect. Consequently, four failed browser cases represent three unique defects. The API reproductions confirm those defects through another interface; they do not add cases to the eight-case assessment suite. TC03 (timezone handling) and TC04 (duplicate earning IDs) are separate passing API cases.

The [directive](../../directive.md) links the full submission, release decision and handoff.
