-- ==============================================================================
-- KREDİ DÜŞME GÜVENLİK YAMASI — 23 Ekim 2026
-- ==============================================================================
-- Kapatılan açıklar (docs/guvenlik-denetimi-2026-10-23.md):
--   K3: deduct_user_credits eksi tutarla çağrılınca bakiyeye kredi ekliyordu
--       (-1.000.000 "harcayan" kullanıcı 1.000.000 kredi kazanıyordu).
--   K2: Kullanıcı profiles tablosunda kendi credits_balance / role / is_banned
--       sütunlarını doğrudan değiştirebiliyordu.
--
-- Kurallar (bu yamadan sonra):
--   1. Harcanacak tutarı istemci değil veritabanı belirler (generation_cost).
--   2. Bakiye hiçbir yoldan 0'ın altına inemez (CHECK kısıtı + fonksiyon kontrolü).
--   3. Bakiye 0 veya altındaysa ya da yetmiyorsa harcama reddedilir; reddedilen
--      harcamadan sonra görsel üretilmez.
--   4. Kullanıcı bakiyesini, rolünü ve ban durumunu elle değiştiremez.
--
-- Nasıl çalıştırılır: Supabase Dashboard > SQL Editor > bu dosyanın tamamını
-- yapıştırıp "Run". Tekrar çalıştırmak güvenlidir. Hangi şema dosyası kurulmuş
-- olursa olsun (schema.sql, credits_and_purchases.sql veya ikisi) çalışır.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Fiyat listesi: her işlemin kaç kredi tuttuğunu veritabanı belirler
-- ------------------------------------------------------------------------------
-- Uygulamadaki fiyatlarla aynı olmalı (src/context/CreditsContext.tsx).
-- Bilinmeyen işlem türü için NULL döner ve harcama reddedilir.
CREATE OR REPLACE FUNCTION public.generation_cost(p_action_type TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_action_type
    -- schema.sql (profiles / credit_transactions) adları
    WHEN 'generation_standard' THEN 20
    WHEN 'generation_4k' THEN 20
    WHEN 'generation_diy' THEN 20
    -- credits_and_purchases.sql (user_wallets / credit_ledger) adları
    WHEN 'cake_generation_std' THEN 20
    WHEN 'cake_generation_4k' THEN 20
    WHEN 'diy_recipe_generation' THEN 20
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.generation_cost(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generation_cost(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. deduct_user_credits (profiles tabanlı bakiye) — açıklı sürümü kaldır
-- ------------------------------------------------------------------------------
-- Eski imza (p_cost INTEGER, ...) silinmezse "CREATE OR REPLACE" yeni bir
-- kopya ekler ve açıklı sürüm çağrılabilir kalır. Bu yüzden önce DROP.
DROP FUNCTION IF EXISTS public.deduct_user_credits(INTEGER, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_cake_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cost INTEGER := public.generation_cost(p_action_type);
  v_balance INTEGER;
  v_banned BOOLEAN;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- Tutar istemciden gelmez; bilinmeyen işlem türü = harcama yok.
  IF v_cost IS NULL OR v_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;

  -- Aynı anda gelen harcamalar sıraya girer (satır kilidi).
  SELECT credits_balance, is_banned
    INTO v_balance, v_banned
    FROM public.profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  IF v_banned THEN
    RETURN jsonb_build_object('success', false, 'error', 'ACCOUNT_BANNED');
  END IF;

  -- Bakiye 0 veya altındaysa (olmaması gerekir ama yine de) ya da yetmiyorsa üretim yok.
  IF v_balance IS NULL OR v_balance <= 0 OR v_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_CREDITS',
      'current_balance', COALESCE(v_balance, 0),
      'required', v_cost
    );
  END IF;

  v_new_balance := v_balance - v_cost;

  -- Başkasının pastasını kendi hareketine bağlayamaz.
  IF p_cake_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cakes WHERE id = p_cake_id AND user_id = v_user_id
  ) THEN
    p_cake_id := NULL;
  END IF;

  UPDATE public.profiles
     SET credits_balance = v_new_balance
   WHERE id = v_user_id;

  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, action_type, description, cake_id
  ) VALUES (
    v_user_id,
    -v_cost,
    v_new_balance,
    p_action_type,
    LEFT(COALESCE(NULLIF(TRIM(p_description), ''), 'Pasta üretimi'), 200),
    p_cake_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'deducted', v_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_user_credits(TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deduct_user_credits(TEXT, TEXT, UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. spend_user_credits (user_wallets tabanlı bakiye) — aynı kurallar
-- ------------------------------------------------------------------------------
-- Eski sürüm eksi tutarı zaten reddediyordu, ama tutarı ve işlem türünü
-- istemciden alıyordu (ör. 'technical_refund' türünde kayıt yazılabiliyordu).
DROP FUNCTION IF EXISTS public.spend_user_credits(INTEGER, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.spend_user_credits(
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cost INTEGER := public.generation_cost(p_transaction_type);
  v_wallet RECORD;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF p_transaction_type NOT IN ('cake_generation_std', 'cake_generation_4k', 'diy_recipe_generation')
     OR v_cost IS NULL OR v_cost <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;

  SELECT * INTO v_wallet
    FROM public.user_wallets
   WHERE user_id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'WALLET_NOT_FOUND');
  END IF;

  IF v_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'WALLET_FROZEN');
  END IF;

  IF v_wallet.balance IS NULL OR v_wallet.balance <= 0 OR v_wallet.balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_CREDITS',
      'current_balance', COALESCE(v_wallet.balance, 0),
      'required', v_cost
    );
  END IF;

  v_new_balance := v_wallet.balance - v_cost;

  UPDATE public.user_wallets
     SET balance = v_new_balance,
         lifetime_spent = lifetime_spent + v_cost,
         updated_at = timezone('utc'::text, now())
   WHERE user_id = v_user_id;

  INSERT INTO public.credit_ledger (
    user_id, amount, balance_before, balance_after,
    transaction_type, reference_id, description
  ) VALUES (
    v_user_id,
    -v_cost,
    v_wallet.balance,
    v_new_balance,
    p_transaction_type,
    LEFT(p_reference_id, 100),
    LEFT(COALESCE(NULLIF(TRIM(p_description), ''), 'Pasta üretimi'), 200)
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'deducted', v_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.spend_user_credits(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_user_credits(TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. Tablo kuralları: bakiye eksiye inemez, harcama kaydı artı olamaz
-- ------------------------------------------------------------------------------
-- NOT VALID: mevcut satırlar kontrol edilmez (eski bir istismar kaydı yüzünden
-- yama yarıda kalmasın), ama bundan sonraki her ekleme/güncelleme kontrol edilir.
-- Eski kayıtları dosyanın sonundaki kontrol sorgularıyla inceleyin.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_credits_balance_not_negative') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_credits_balance_not_negative
      CHECK (credits_balance >= 0) NOT VALID;
  END IF;

  IF to_regclass('public.user_wallets') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_wallets_balance_not_negative') THEN
    ALTER TABLE public.user_wallets
      ADD CONSTRAINT user_wallets_balance_not_negative
      CHECK (balance >= 0) NOT VALID;
  END IF;

  IF to_regclass('public.credit_transactions') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_transactions_spend_is_negative') THEN
    ALTER TABLE public.credit_transactions
      ADD CONSTRAINT credit_transactions_spend_is_negative
      CHECK (action_type NOT IN ('generation_standard', 'generation_4k', 'generation_diy') OR amount < 0) NOT VALID;
  END IF;

  IF to_regclass('public.credit_ledger') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_spend_is_negative') THEN
    ALTER TABLE public.credit_ledger
      ADD CONSTRAINT credit_ledger_spend_is_negative
      CHECK (transaction_type NOT IN ('cake_generation_std', 'cake_generation_4k', 'diy_recipe_generation') OR amount < 0) NOT VALID;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Bakiyeyi elle değiştirme yolunu kapat (K2)
-- ------------------------------------------------------------------------------
-- Kullanıcı profilinde sadece ad, avatar, dil ve bildirim belirtecini değiştirebilir.
-- credits_balance, role, is_banned yalnızca veritabanı fonksiyonlarıyla değişir.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
    GRANT UPDATE (full_name, avatar_url, preferred_language, push_token, last_active_at)
      ON public.profiles TO authenticated;

    DROP POLICY IF EXISTS "Kullanıcılar kendi profillerini güncelleyebilir" ON public.profiles;
    CREATE POLICY "Kullanıcılar kendi profillerini güncelleyebilir"
      ON public.profiles FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  -- Cüzdan ve hareket tabloları zaten yalnızca okunabilir; yetkiyi de açıkça kaldır.
  IF to_regclass('public.user_wallets') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.user_wallets FROM anon, authenticated;
  END IF;
  IF to_regclass('public.credit_ledger') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM anon, authenticated;
  END IF;
  IF to_regclass('public.credit_transactions') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM anon, authenticated;
  END IF;
END;
$$;

COMMIT;

-- ==============================================================================
-- KONTROL SORGULARI (yamadan sonra ayrıca çalıştırın)
-- ==============================================================================
-- Açık daha önce kullanıldı mı? Aşağıdaki sorgular boş dönmeli.
--
-- 1) Harcama türünde ama ARTI tutarlı kayıtlar (eksi tutarla kredi kazanma izi):
--    SELECT * FROM public.credit_transactions
--     WHERE action_type IN ('generation_standard', 'generation_4k', 'generation_diy') AND amount >= 0;
--    SELECT * FROM public.credit_ledger
--     WHERE transaction_type IN ('cake_generation_std', 'cake_generation_4k', 'diy_recipe_generation') AND amount >= 0;
--
-- 2) Olağandışı yüksek bakiyeler (satın aldığından fazlası):
--    SELECT id, email, credits_balance FROM public.profiles WHERE credits_balance > 5000 ORDER BY credits_balance DESC;
--
-- 3) Rolünü kendisi yönetici yapmış olabilecek hesaplar:
--    SELECT id, email, role FROM public.profiles WHERE role <> 'user';
--
-- 4) Eski açıklı fonksiyon gerçekten silindi mi? (yalnızca 3 parametreli sürüm görünmeli)
--    SELECT oid::regprocedure FROM pg_proc WHERE proname IN ('deduct_user_credits', 'spend_user_credits');
