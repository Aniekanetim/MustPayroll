# Intent: prevent duplicate payment during payroll recovery

MustPayroll combines approved weekly earnings into employee payments, then notifies each employee. I selected a recovery failure: payroll is retried after payment succeeds without a saved notification instruction, and the employee is paid again. In the controlled example, approved pay is $1,500; retry increases recorded pay to $3,000 without additional earnings.

## Risk comparison

I ranked four possible failures by user and operational impact first, then trigger plausibility and investigation/prevention effort. These are relative assessments for this local project. Production frequency, affected volume and actual loss are unknown.

| Rank | Possible failure | User and operational impact | Likelihood or uncertainty | Effort |
|---|---|---|---|---|
| 1 | Retry after missing notification work creates another payment | Recorded pay exceeds approved earnings and requires reconciliation | Retry is a plausible response to partial failure; frequency is unknown | Medium: preserve payment identity and separate notification recovery |
| 2 | Unapproved earnings are paid at the scheduled time | Payment exceeds authorized earnings and requires reconciliation | Pending records can coexist with approved records; production frequency is unknown | Low to medium: enforce approval during selection without blocking approved pay |
| 3 | A timezone or cut-off error assigns earnings to the wrong period | Pay is missing, delayed or included too early | Boundary inputs are predictable; affected volume is unknown | Low to medium: define and test UTC boundaries |
| 4 | Notification is sent before payment succeeds | The employee receives confirmation without a payment record | Plausible ordering failure; frequency is unknown | Low to medium: require committed payment before notification |

## Selection rationale

The first risk makes recovery itself unsafe: an operator responding to an incomplete outcome can create another payment simply by retrying. The investigation therefore focuses on preserving a successful payment while recovering its notification.

A payment records the employee's amount. A notification instruction is the saved work needed to tell the employee about it. Missing or failed notification work must not make the application treat that employee as unpaid.

Payroll gives this rule a concrete context: approved earnings belong to a weekly period, and each employee receives one payment for that period. The project uses synthetic records and deliberately introduced defects in a local ledger; no real funds move.

## Why both builds are retained

MUST Company's Quest assessment asks for a regression that fails on faulty behavior and passes after correction. I retained two independent builds to make both observations repeatable: **buggy** preserves the failure, and **fixed** provides the corrected implementation. Separate application databases and test execution projects keep one run's changes from affecting the other.

Both builds receive equivalent starting records and the same eight cases. The business expectation remains one payment per employee and period. For example, TC07 expects $1,500 after retry in both builds: $3,000 is a failure in buggy; $1,500 with the original reference is a pass in fixed. The [build comparison](business_rules.md#two-builds-one-business-rule) identifies the applications and the conditions held constant.

## Investigation and completion criteria

The investigation follows this sequence:

1. Establish that payment succeeds without a saved notification. **TC08** checks normal processing; **TC06** checks the notification requirement when delivery is set to fail.
2. Retry the unchanged pay run. **TC07** checks whether its original payment reference and amount survive without another payout.
3. Verify that the fixed build saves payment and notification work together and preserves their identities on retry.

The failure sequence involves two controlled defects: the missing notification instruction (**PAY-003**) and the incorrect completion check that permits another payment (**PAY-001**). An additional approval defect (**PAY-002**) is checked by TC01. The [defect-and-check mapping](business_rules.md#controlled-defects-and-their-checks) shows each buggy behavior, its correction and the relevant cases.

The full assessment contains eight cases per build: six browser journeys automated with Playwright's Page Object Model (POM), and two application programming interface (API) cases supplied for manual Postman review. Boundary, timezone, duplicate-input and payment-failure checks also establish which rules continue to work. Each case keeps its own expectations; the buggy build can pass unaffected checks while failing the checks that expose its controlled defects.

Completion requires the same duplicate-payment check to fail on the buggy build and pass on the fixed build, preserving the original payment and its linked notification work. The [business rules](business_rules.md) define the expectations; the [directive](../directive.md) links the results and handoff; the [release checklist](release_readiness.md) records the decision and limits.
