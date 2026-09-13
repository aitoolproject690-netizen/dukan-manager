# Dukaan Manager UI V1 — Design System

## Visual goal
Premium retail-management app: clean, modern, confident, compact enough for daily shop use. Avoid decorative clutter.

## Layout
- Use safe-area aware screens and consistent horizontal padding.
- Primary actions should be reachable with one hand.
- Use consistent 12–16px card radius and 12–20px screen spacing.
- Keep important totals above the fold.

## Components
- Primary action: visually dominant filled button with clear label and icon.
- Secondary action: outlined/tonal button.
- Metric card: label → large value → small contextual change/status.
- List row: icon/avatar → title → secondary detail → value/status → optional action.
- Empty state: icon/illustration → one-line explanation → one useful CTA.
- Error state: concise problem + retry/fix action; never expose raw stack traces.

## Interaction
- Comfortable touch targets (about 44dp or larger).
- Disable submit while an operation is in progress.
- Show success feedback after create/update/delete operations.
- Confirm destructive actions.
- Keep forms keyboard-friendly and preserve entered values when validation fails.

## Data safety
- Quantities, prices, discounts and payments must reject invalid/negative values where inappropriate.
- Stock cannot become negative.
- Sale, stock deduction and customer credit changes should be treated as one logical operation.

## Navigation
Preserve the existing app's navigation structure. Improve screen presentation before introducing new navigation patterns.
