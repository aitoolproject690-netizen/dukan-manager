# Dukaan Manager — Family-Friendly UX Specification

## Core goal
A first-time user should be able to make a bill, find a customer, receive a khata payment, and check today's sales without reading a manual.

## UI direction
- Premium but familiar Indian retail-app feel.
- Large touch targets and readable typography.
- High contrast and clear visual hierarchy.
- Keep important totals visually prominent.
- One primary action per screen; avoid crowded toolbars.
- Use icons with text, never icon-only for critical actions.
- Support Hindi/Hinglish-friendly labels and a language setting.
- Preserve existing useful screens and navigation rather than replacing the app with a new unrelated design.

## Dashboard
Show at a glance:
- Aaj ki sale
- Aaj ka munafa (when cost data is available)
- Udhaar/khata due
- Cash + UPI received
- Low-stock count
- Quick Bill button
- Quick Customer button
- Quick Payment button

## Billing
Flow: customer (optional) -> items -> quantity -> discount -> payment -> save -> receipt/share.
- Calculator-like quantity and amount entry.
- Clear stock availability before final save.
- Large total and payment buttons.
- Support cash, UPI, credit and split payment.
- Show a clear success receipt and easy share action.

## Customer / Khata
- Search by name or phone.
- Customer card: current due, recent purchase, last payment.
- Large "Paisa Jama" action.
- Monthly statement button.
- WhatsApp statement button when a valid mobile number exists.

## Stock
- Search and barcode where available.
- Stock count, unit, selling price, purchase price and low-stock threshold.
- Simple stock-in and stock adjustment flows.
- Prevent negative stock unless an explicit owner setting permits it.

## Accessibility / family use
- Avoid tiny text and small hit areas.
- Confirmation before deleting records.
- Plain-language validation messages.
- Don't expose technical errors to the user.
- Make destructive actions visually distinct and require confirmation.
- Keep advanced settings behind a separate Settings/Advanced area.
