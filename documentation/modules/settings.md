# Settings

**Route:** `/settings`

**Purpose:** Clear one local pay week so its earning, payment and notification cycle can be repeated.

Both independent builds provide this control. It clears the selected week from the payroll records loaded in that application. Resetting buggy leaves fixed unchanged, and vice versa. The [build guide](../README.md#expected-behaviour-and-the-two-builds) explains why their records are kept separate.

## Select the pay week

Select the Tuesday **Pay date** for the cycle to clear. Past and future dates are supported; the calendar does not close a week. The screen shows the corresponding completed Monday-to-Monday earning window and the counts of earning, payment and notification records for that week.

For example, 13 October 2026 selects earnings from 5 October 00:00 UTC to 12 October 00:00 UTC. The opening Monday is included. The following Monday at 00:00 UTC is excluded, so a record at that closing instant belongs to the next week and must survive this reset.

## Reset the selected week

1. Check the selected pay date, earning window and record counts.
2. Select Reset selected pay week.
3. Review the confirmation. Cancel leaves every record unchanged.
4. Confirm Reset pay week to remove that week's earnings, payments, notifications, saved run, frozen totals and simulated notification-service receipts together.
5. Confirm zero counts and Open status. Record new earnings and process the same week again as needed.

Employees and other pay weeks remain intact. Audit history is retained and a reset entry is recorded. Confirmation deletes the selected local records and cannot be undone. It performs no external bank reversal. Reset is unavailable when the week has no records.

## Related requirements

[RESET-01](../PRD.md#reset-01) defines this control. [Pay runs](pay-runs.md) describes Tuesday simulation and recovery; [Earnings](earnings.md) describes recording and approval. Reset is separate from Retry pay run: retry preserves existing payments, while reset explicitly removes the selected local cycle.

Browser case TC02 checks the displayed boundaries for future pay dates. The reset action itself is described from the implementation and remains outside the eight-case assessment coverage.
