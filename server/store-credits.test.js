// Çalıştırmak için (server klasöründe):  node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { creditStorePurchase } = require('./store-credits');

const ENV = { SUPABASE_URL: 'https://db.example.com/', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };
const USER = '7f9c2b1e-3d4a-4c5b-9e8f-0a1b2c3d4e5f';

/** Fake Supabase: answers apple_accounts lookups and the purchase RPC, and records every call. */
function fakeSupabase({ appleRows = [], rpc = { success: true, new_balance: 215 }, status = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
    const payload = url.includes('/rpc/') ? rpc : appleRows;
    return { ok: status < 400, status, text: async () => JSON.stringify(payload) };
  };
  return { calls, fetchImpl };
}

const purchase = (overrides = {}) => ({
  type: 'NON_RENEWING_PURCHASE',
  app_user_id: USER,
  product_id: 'lumiere_credits_starter_200',
  transaction_id: '2000000123456789',
  price_in_purchased_currency: 24.99,
  currency: 'USD',
  store: 'APP_STORE',
  environment: 'PRODUCTION',
  ...overrides,
});

test('Supabase kullanıcısına doğru paketi tanımlar', async () => {
  const db = fakeSupabase();
  const res = await creditStorePurchase(purchase(), ENV, db.fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.body.credited, true);
  assert.equal(db.calls.length, 1);
  const { url, init, body } = db.calls[0];
  assert.equal(url, 'https://db.example.com/rest/v1/rpc/process_store_purchase');
  assert.equal(init.headers.Authorization, 'Bearer service-key');
  assert.equal(body.p_user_id, USER);
  assert.equal(body.p_credits_amount, 200);
  assert.equal(body.p_price_paid, 24.99);
  assert.equal(body.p_store, 'apple_app_store');
  assert.equal(body.p_transaction_id, '2000000123456789');
});

test('Apple ile giriş yapan kullanıcıyı apple_accounts üzerinden bulur', async () => {
  const db = fakeSupabase({ appleRows: [{ id: USER }] });
  const res = await creditStorePurchase(purchase({ app_user_id: '001234.abcdef.0987' }), ENV, db.fetchImpl);
  assert.equal(res.body.credited, true);
  assert.match(db.calls[0].url, /apple_accounts\?select=id&apple_user_id=eq\.001234\.abcdef\.0987/);
  assert.equal(db.calls[1].body.p_user_id, USER);
});

test('eşleşen hesap yoksa kredi tanımlamaz', async () => {
  const db = fakeSupabase({ appleRows: [] });
  const res = await creditStorePurchase(purchase({ app_user_id: '$RCAnonymousID:abc' }), ENV, db.fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.body.reason, 'USER_NOT_FOUND');
  assert.ok(db.calls.every((c) => !c.url.includes('/rpc/')));
});

test('TestFlight / sandbox satın alımı sandbox olarak kaydedilir', async () => {
  const db = fakeSupabase();
  await creditStorePurchase(purchase({ environment: 'SANDBOX' }), ENV, db.fetchImpl);
  assert.equal(db.calls[0].body.p_store, 'sandbox');
});

test('satın alma dışındaki olaylar ve bilinmeyen ürünler yok sayılır', async () => {
  const db = fakeSupabase();
  assert.equal((await creditStorePurchase(purchase({ type: 'TEST' }), ENV, db.fetchImpl)).body.credited, false);
  assert.equal((await creditStorePurchase(purchase({ type: 'CANCELLATION' }), ENV, db.fetchImpl)).body.credited, false);
  assert.equal((await creditStorePurchase(purchase({ product_id: 'baska_urun' }), ENV, db.fetchImpl)).body.credited, false);
  assert.equal(db.calls.length, 0);
});

test('Supabase ayarı yoksa 503 döner ki RevenueCat sonra tekrar denesin', async () => {
  const db = fakeSupabase();
  const res = await creditStorePurchase(purchase(), {}, db.fetchImpl);
  assert.equal(res.status, 503);
  assert.equal(db.calls.length, 0);
});

test('Supabase hata verirse 5xx döner (tekrar denenir)', async () => {
  const down = fakeSupabase({ status: 500 });
  assert.equal((await creditStorePurchase(purchase(), ENV, down.fetchImpl)).status, 502);
  const failed = fakeSupabase({ rpc: { success: false, error: 'WALLET_FROZEN' } });
  assert.equal((await creditStorePurchase(purchase(), ENV, failed.fetchImpl)).status, 500);
});

test('aynı işlem ikinci kez gelirse yine 200 döner', async () => {
  const db = fakeSupabase({ rpc: { success: true, status: 'ALREADY_PROCESSED' } });
  const res = await creditStorePurchase(purchase(), ENV, db.fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ALREADY_PROCESSED');
});
