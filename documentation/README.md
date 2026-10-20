# MustPayroll application documentation

MustPayroll helps a payroll operator turn approved employee earnings into weekly payments, then notify each employee. Northstar Studio is the example employer shown in the application.

The application uses synthetic data. **Paid** means a payment was saved locally; **Sent** means simulated notification delivery succeeded. No real funds move or external messages are sent. Payment and notification have separate outcomes: delivery can fail while payment remains complete.

## Expected behaviour and the two builds

MUST Company's Quest assessment asks for a regression check that fails on faulty behavior and passes after correction. Two independently runnable builds keep both sides available for review.

| Build | Purpose | Local application |
|---|---|---|
| [Buggy](../MustPayroll/MustPayroll_buggy) | Preserves deliberate approval, notification-creation and payroll-retry defects so the checks can detect them | [localhost:4175](http://127.0.0.1:4175/overview) |
| [Fixed](../MustPayroll/MustPayroll_fixed) | Applies the corrections so the same checks can verify the required outcomes | [localhost:4176](http://127.0.0.1:4176/overview) |

Each build has its own interface files, server, payment policy, database and quality control folder. Equivalent starting data and unchanged expectations support the comparison. Changes in one build do not alter the other's records.

The requirements apply to both versions. The fixed build supplies the working reference; relevant guides identify the buggy deviations. The [controlled-defect mapping](../QA/Quality%20assurance/business_rules.md#controlled-defects-and-their-checks) connects the three defects to their checks and corrections. The [bug report index](../QA/Quality%20Control/bug_report/README.md) provides separate browser and API reproductions.

## Reading order

| Read | Question it answers |
|---|---|
| [Business requirements](BRD.md) | What business problem does MustPayroll address, and what outcomes matter? |
| [Product requirements](PRD.md) | What must the application do, and what constitutes acceptance? |
| [User flows](user-flows.md) | How does the operator complete payroll and choose the appropriate recovery action? |
| Module guides below | What does each screen show, change and connect to? |

Use the [repository startup instructions](../README.md#run-the-applications) to run the applications. Test preparation and execution are documented in the separate [buggy quality control folder](../QA/Quality%20Control/Buggy%20build) and [fixed quality control folder](../QA/Quality%20Control/Fixed%20build).

## Terms used throughout

| Term | Meaning |
|---|---|
| Payroll operator | The person reviewing earnings and processing payroll. This is a responsibility; the application has no login or permission roles. |
| Payroll records | The employees, earnings, pay runs, payments and notifications loaded in the application. Each build keeps its records separately. |
| Earning | An employee's amount earned at a specific time, with a permanent earning ID. |
| Approval | The decision making an earning eligible for payroll. Pending and Rejected earnings remain unpaid without blocking approved pay. |
| Pay period | The completed Monday-to-Monday week selecting earnings; the opening instant is included and the closing instant excluded. |
| Pay date | The following Tuesday at 09:00 UTC. The operator simulates that due instant without waiting. |
| Pay run / frozen totals | The saved selection of earning IDs and employee amounts for a period. Retry reuses this selection. |
| Payment | A saved local record containing the employee, amount, reference and destination. |
| Notification | A saved delivery instruction linked to a payment. Failed delivery leaves it Pending for retry. |
| Not available | No linked notification record exists. This differs from a Pending notification whose delivery can be retried. |
| Recovery | Completing unpaid amounts or pending delivery while preserving successful payments. |
| UTC / USD | Coordinated Universal Time / US dollars. Amounts are stored in whole cents; 100 cents equals $1. |

## How the modules connect

The normal journey runs from employee and earning review through payroll processing to payment and notification inspection. Overview helps reconcile the result. Settings is a separate control for repeating a local cycle.

| Module guide | Role in that journey |
|---|---|
| [Overview](modules/overview.md) | Select the pay date, compare period totals and locate outstanding work. |
| [Employees](modules/employees.md) | Identify the employee and inspect their recorded destination before entering earnings. |
| [Earnings](modules/earnings.md) | Record amounts and occurrence times, then approve or reject Pending records. |
| [Pay runs](modules/pay-runs.md) | Review eligible totals, confirm processing and retry unfinished payroll. |
| [Payments](modules/payments.md) | Inspect saved references, amounts, destinations and receipts. |
| [Notifications](modules/notifications.md) | Review delivery attempts and retry existing Pending instructions. |
| [Settings](modules/settings.md) | Reset one local pay week while preserving employees and other weeks. |

Processing creates payment records and, in the fixed build, their notification instructions and initial delivery attempts. Opening Payments or Notifications displays those records.

The [business rules](../QA/Quality%20assurance/business_rules.md) define period calculations and recovery policy. The [directive](../QA/directive.md) links assessment evidence, and the [release checklist](../QA/Quality%20assurance/release_readiness.md) states the decision and verified limits.
