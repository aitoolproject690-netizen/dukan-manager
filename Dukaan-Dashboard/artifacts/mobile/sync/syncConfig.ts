export const SYNC_CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '',
  shopId: process.env.EXPO_PUBLIC_SHOP_ID?.trim() || '',
  token: process.env.EXPO_PUBLIC_SYNC_TOKEN?.trim() || '',
};

export function isSyncConfigured() {
  return Boolean(SYNC_CONFIG.apiUrl && SYNC_CONFIG.shopId && SYNC_CONFIG.token);
}
