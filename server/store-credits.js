/**
 * Credits a store purchase reported by the RevenueCat webhook to the buyer's Supabase wallet.
 *
 * The wallet change itself happens in public.process_store_purchase (supabase/credits_and_purchases.sql),
 * which locks the wallet row, skips transaction ids it has already seen, and writes the ledger.
 * It only runs for service_role, so this needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

/** Credits per store product. Must match IAP_PACKAGES in src/types/iap.ts and the store products. */
const CREDIT_PACKS = {
  lumiere_credits_single_15: 15,
  lumiere_credits_starter_200: 200,
  lumiere_credits_popular_1000: 1000,
  lumiere_credits_offer_200: 200,
};

/** RevenueCat event types that mean a consumable was bought. */
const PURCHASE_EVENTS = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function supabaseConfig(env) {
  const url = (env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
  return url && key ? { url, key } : null;
}

async function supabase(config, path, init = {}, fetchImpl = fetch) {
  const res = await fetchImpl(`${config.url}${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(`Supabase ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

/**
 * The app sets the RevenueCat user to the signed-in id: a Supabase user id (UUID) for Google,
 * or Apple's own user id for Sign in with Apple, which public.apple_accounts maps to a Supabase user.
 */
async function resolveUserId(config, event, fetchImpl) {
  const ids = [event.app_user_id, event.original_app_user_id, ...(event.aliases || [])].filter(
    (id) => typeof id === 'string' && id && !id.startsWith('$RCAnonymousID'),
  );
  const uuid = ids.find((id) => UUID.test(id));
  if (uuid) return uuid;

  for (const appleId of ids) {
    const rows = await supabase(
      config,
      `/rest/v1/apple_accounts?select=id&apple_user_id=eq.${encodeURIComponent(appleId)}&limit=1`,
      {},
      fetchImpl,
    );
    if (Array.isArray(rows) && rows[0]?.id) return rows[0].id;
  }
  return null;
}

function storeName(event) {
  if (event.environment === 'SANDBOX') return 'sandbox';
  if (event.store === 'APP_STORE' || event.store === 'MAC_APP_STORE') return 'apple_app_store';
  if (event.store === 'PLAY_STORE') return 'google_play';
  return 'revenuecat';
}

/**
 * Handles one webhook event. Returns { status, body } for the HTTP reply.
 * A 5xx makes RevenueCat retry later; 200 means "done" (credited, already credited, or nothing to do).
 */
async function creditStorePurchase(event, env = process.env, fetchImpl = fetch) {
  if (!PURCHASE_EVENTS.has(event.type)) {
    return { status: 200, body: { received: true, credited: false, reason: 'IGNORED_EVENT_TYPE' } };
  }

  const credits = CREDIT_PACKS[event.product_id];
  if (!credits) {
    console.warn(`[RevenueCat Webhook] Bilinmeyen ürün: ${event.product_id}`);
    return { status: 200, body: { received: true, credited: false, reason: 'UNKNOWN_PRODUCT' } };
  }

  const transactionId = event.transaction_id || event.id;
  if (!transactionId) {
    return { status: 400, body: { error: 'MISSING_TRANSACTION_ID' } };
  }

  const config = supabaseConfig(env);
  if (!config) {
    console.error('[RevenueCat Webhook] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil; kredi tanımlanamadı.');
    return { status: 503, body: { error: 'CREDITS_BACKEND_NOT_CONFIGURED' } };
  }

  try {
    const userId = await resolveUserId(config, event, fetchImpl);
    if (!userId) {
      // Retrying won't help: the buyer has no Supabase account to credit. Kept in RevenueCat's history.
      console.warn(`[RevenueCat Webhook] Kullanıcı bulunamadı: ${event.app_user_id} (işlem ${transactionId})`);
      return { status: 200, body: { received: true, credited: false, reason: 'USER_NOT_FOUND' } };
    }

    const price = Number(event.price_in_purchased_currency);
    const result = await supabase(
      config,
      '/rest/v1/rpc/process_store_purchase',
      {
        method: 'POST',
        body: JSON.stringify({
          p_user_id: userId,
          p_package_id: event.product_id,
          p_credits_amount: credits,
          p_price_paid: Number.isFinite(price) ? Math.round(price * 100) / 100 : 0,
          p_currency: event.currency || 'USD',
          p_store: storeName(event),
          p_transaction_id: String(transactionId),
          p_receipt_payload: event,
        }),
      },
      fetchImpl,
    );

    if (!result?.success) {
      console.error(`[RevenueCat Webhook] Kredi tanımlanamadı: ${result?.error} (işlem ${transactionId})`);
      return { status: 500, body: { error: result?.error || 'CREDIT_FAILED' } };
    }

    console.log(
      `[RevenueCat Webhook] ${userId} kullanıcısına +${credits} kredi` +
        (result.status === 'ALREADY_PROCESSED' ? ' (zaten tanımlıydı)' : '') +
        ` — işlem ${transactionId}`,
    );
    return { status: 200, body: { received: true, credited: true, credits, status: result.status || 'CREDITED' } };
  } catch (err) {
    console.error('[RevenueCat Webhook] Supabase hatası:', err.message);
    return { status: 502, body: { error: 'CREDITS_BACKEND_ERROR' } };
  }
}

module.exports = { CREDIT_PACKS, creditStorePurchase };
