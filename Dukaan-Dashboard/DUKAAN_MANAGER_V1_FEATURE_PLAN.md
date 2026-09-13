# Dukaan Manager V1 — Simple for Family, Powerful for Business

## Product principles
- Designed so a papa/dada can use it without training.
- Hindi-first, plain labels, large tap targets, clear icons, minimal typing.
- Keep advanced controls available without cluttering the daily workflow.
- Existing data and core flows must remain safe during upgrades.

## 1. Multi-device account
- One shop/account should work on 3–4 phones/devices.
- All devices must see the same customers, khata, products, stock, sales, expenses and settings.
- Use a shop/account identity plus authenticated device/session records.
- Changes must sync safely; avoid duplicate invoices and conflicting stock updates.
- Allow the owner to see/revoke connected devices.
- Offline sales should queue locally and sync when internet returns.
- Never rely on a single device's SQLite database as the long-term source of truth once cloud sync is enabled.

## 2. Monthly customer statement on WhatsApp
For customers with a mobile number and consent:
- Generate a monthly khata statement automatically.
- Include customer name, month, opening balance, purchases/invoices, each purchased item and quantity, payments received, current due, and total amount.
- Include a payment QR for the amount due.
- Send through an approved WhatsApp Business/API integration; do not automate through an unofficial WhatsApp client.
- Provide manual "Send on WhatsApp" and a monthly auto-send setting.
- Track sent/failed/pending status and allow retry.
- Customer can receive a simple readable message plus statement/receipt document where supported.

## 3. QR payment
- Shop owner can configure UPI ID/payment details.
- QR should be generated from the configured payment details and exact due amount when supported.
- Validate the configured UPI/payment address before showing it as active.
- Never store payment credentials or secret API tokens in the mobile app.

## 4. Easy daily workflow
Primary home actions should be large and obvious:
- Bill Banao
- Customer/Khata
- Samaan/Stock
- Aaj ki Sale
- Paisa Aaya
- Kharcha
- Report

Use familiar Hindi/Hinglish labels where useful, optional language setting, large numbers, confirmation dialogs for destructive actions, and friendly empty/error states.

## 5. Business features to include in the roadmap
- Product search/barcode support.
- Low-stock alerts.
- Purchase/stock-in records.
- Sales invoice history and reprint/share.
- Customer-wise purchase history.
- Khata payment history and monthly statement.
- Cash/UPI/credit split payments.
- Daily/monthly profit and sales reports.
- Expense tracking.
- Backup and restore with validation.
- Owner settings, shop profile and UPI configuration.
- Connected-device management.
- Audit/activity history for important account changes.

## Delivery order
1. Premium, simple UI/UX without breaking existing navigation.
2. Harden stock, sale, invoice and khata transactions.
3. Multi-device/cloud sync foundation.
4. UPI QR configuration and payment flow.
5. Monthly WhatsApp statement workflow with an approved provider.
6. Reports, device management and final reliability pass.

## Important constraint
Do not fake cloud sync or WhatsApp delivery. If an external service/account is required, build the integration boundary and clear setup screen, and keep the app fully usable offline where possible.
