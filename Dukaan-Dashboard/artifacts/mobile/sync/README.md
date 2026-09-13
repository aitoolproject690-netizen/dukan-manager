# Multi-device sync

The mobile app keeps shop data in local SQLite first. Sync is designed to push an outbox to the API and pull persisted operations back to each device.

Required runtime values:
- `EXPO_PUBLIC_API_URL`: API server base URL
- `EXPO_PUBLIC_SHOP_ID`: shared shop/account identifier used by all devices belonging to the same shop

Important: these values identify a shop, but production authentication/authorization must be added before exposing the sync API publicly.

The sync engine must only report a successful online sync after the server confirms persistence. Remote operations are applied idempotently using their operation IDs.
