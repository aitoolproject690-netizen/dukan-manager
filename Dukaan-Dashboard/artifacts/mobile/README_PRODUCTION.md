# Dukaan Manager production checklist

## Accounting
- Sales, payments, credit and stock changes are handled locally in SQLite transactions.
- Do not ship with negative stock or payment mismatch validation disabled.
- Keep regular Backup/Restore exports.

## Multi-device
Set `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SHOP_ID`, and `EXPO_PUBLIC_SYNC_TOKEN` in the mobile build. Set the matching strong `SYNC_TOKEN` on the API server. Apply the PostgreSQL/Drizzle schema before testing two devices.

## WhatsApp
The monthly statement helper prepares purchases, monthly billed total, monthly payments and current Khata due, then opens WhatsApp with the message. Automatic scheduled WhatsApp Business messages require an approved Meta/WhatsApp Business integration and credentials.

## Security
`shopId` and a shared token are only a sync transport guard. Production should add real user authentication and server-side authorization so one customer cannot access another shop's data.
