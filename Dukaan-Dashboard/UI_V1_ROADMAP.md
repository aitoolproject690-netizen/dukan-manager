# Dukaan Manager — UI V1 Roadmap

## Product direction
A premium, fast, practical mobile-first dukaan manager. Keep the existing navigation and business logic intact; improve hierarchy, spacing, cards, typography, empty/loading/error states, and touch targets instead of doing a risky redesign.

## Priority modules
1. Dashboard — sales, profit, cash/UPI/credit, pending credit, monthly trend, quick actions, low-stock alerts.
2. Billing / Sales — fast item search, cart, quantity controls, discount/tax, cash/UPI/credit split, customer selection, invoice preview/print/share.
3. Products & Stock — add/edit product, stock adjustment, low-stock threshold, purchase price/selling price, unit, search/filter/sort.
4. Customers / Khata — customer balance, credit/debit history, payment entry, reminders, clear transaction timeline.
5. Expenses — quick expense entry, categories, date filters, totals.
6. Reports — daily/monthly sales, profit, expenses, outstanding credit, payment-method breakdown.
7. Backup / Restore — clear export/import flow with confirmation and validation.
8. Settings — shop profile, invoice preferences, currency/tax options, data controls.

## UI quality bar
- Consistent design tokens for spacing, radius, typography, elevation and icon sizing.
- Strong visual hierarchy and polished dashboard cards.
- Accessible contrast and minimum comfortable touch targets.
- Loading, empty, error and success states for every data-heavy screen.
- Confirmation for destructive actions.
- Validation preventing negative quantities, prices, amounts and invalid stock operations.
- No silent data loss; sales/stock/customer-credit updates should remain consistent.
- Preserve existing features and navigation unless a change is required to fix a bug.

## Next implementation pass
Start with shared UI primitives and the dashboard, then billing, products/stock, khata, reports and settings. Keep changes on the `ui-overhaul-v1` branch until reviewed.
