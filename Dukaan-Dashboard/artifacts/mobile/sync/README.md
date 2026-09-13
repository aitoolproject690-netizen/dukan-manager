# Multi-device sync

The mobile app is local-first: shop data is written to SQLite immediately, while an SQLite outbox records local business mutations for later synchronization.

## Runtime configuration

Mobile:
- `EXPO_PUBLIC_API_URL`: API server base URL
- `EXPO_PUBLIC_SHOP_ID`: shared shop/account identifier used by all devices belonging to the same shop
- `EXPO_PUBLIC_SYNC_TOKEN`: shared sync token

API server:
- `SYNC_TOKEN`: must exactly match the mobile sync token

All devices for one shop use the same `SHOP_ID` and `SYNC_TOKEN`. The device ID is generated and persisted locally, so one shop can have multiple phones/tablets without sharing a device identifier.

## What is now automatic

- Customer, product, expense and Khata mutations are captured by SQLite outbox triggers.
- Sales are captured after their line items are written, with the complete sale + item payload.
- Remote apply temporarily suppresses outbox triggers, preventing sync echo loops.
- The app runs sync on startup, when returning to the foreground, and every 30 seconds while active.
- Server operations use a monotonic per-shop cursor and idempotent operation IDs.
- The API rejects sync requests without the server-side token.

## Production note

The shared token is a protection layer, not full user authentication. A production multi-tenant deployment should eventually bind shop access to authenticated user/device credentials and server-side authorization rather than relying on a public Expo environment variable alone.
