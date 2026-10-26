-- ==============================================================================
-- LUMIÈRE SUCRÉE — KREDİ BAKİYELERİ VE SATIN ALIMLAR İÇİN ÖZEL SQL ŞEMASI
-- ==============================================================================
-- Bu dosya; kullanıcıların kredi cüzdanlarını, Apple / Google Play / RevenueCat
-- satın alımlarını ve harcama defterini (audit ledger) sıfır açıkla yönetmek için
-- özel olarak tasarlanmıştır.
--
-- GÜVENLİK İLKESİ (ZERO-EXPLOIT / TAM GÜVENLİK):
-- - İstemci (mobil uygulama) bakiyeyi DOĞRUDAN DEĞİŞTİREMEZ (UPDATE yetkisi kapalıdır).
-- - Bakiyeler yalnızca "SECURITY DEFINER" olarak çalışan ve satır kilitleme (FOR UPDATE)
--   yapan veritabanı fonksiyonları (RPC) ile atomik olarak artırılabilir veya düşürülebilir.
-- - "Mükerrer Sipariş" (Replay Attack) koruması: Aynı mağaza sipariş kimliği (transaction_id)
--   sisteme iki kez işlenemez (UNIQUE constraint).
-- ==============================================================================

-- Gerekli uzantılar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. KULLANICI KREDİ CÜZDANI TABLOSU (public.user_wallets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0), -- hoş geldin kredisini tetikleyici verir
  lifetime_purchased INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_purchased >= 0),
  lifetime_spent INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  welcome_bonus_claimed BOOLEAN NOT NULL DEFAULT false,
  is_frozen BOOLEAN NOT NULL DEFAULT false, -- Şüpheli işlem/dolandırıcılık koruması
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.user_wallets IS 'Kullanıcıların sunucu denetimindeki resmi kredi cüzdanı ve harcama sayaçları';

-- ==============================================================================
-- 2. RESMİ SATIN ALIMLAR TABLOSU (public.credit_purchases)
-- ==============================================================================
-- Apple App Store (StoreKit), Google Play Billing ve RevenueCat makbuzlarını tutar.
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,                -- Örn: 'lumiere_credits_starter_200'
  credits_amount INTEGER NOT NULL CHECK (credits_amount > 0), -- Satın alınan kredi adedi (+200)
  price_paid DECIMAL(10, 2) NOT NULL,      -- Ödenen tutar (örn: 149.99)
  currency VARCHAR(10) NOT NULL DEFAULT 'TRY', -- Para birimi ('TRY', 'USD', 'EUR')
  store TEXT NOT NULL CHECK (store IN ('apple_app_store', 'google_play', 'revenuecat', 'stripe', 'sandbox')),
  transaction_id TEXT NOT NULL UNIQUE,     -- Apple/Google mağaza sipariş no (Mükerrerliği önler)
  original_transaction_id TEXT,            -- Abonelik veya Restore işlemleri için
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'revoked')),
  receipt_payload JSONB,                   -- RevenueCat webhook veya mağaza faturasının ham JSON verisi
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.credit_purchases IS 'Apple Store ve Google Play üzerinden onaylanmış gerçek kredi satın alımları';

-- ==============================================================================
-- 3. KREDİ HARCAMA VE HAREKET DEFTERİ (public.credit_ledger)
-- ==============================================================================
-- Cüzdanda meydana gelen her 1 kredilik değişimin bile çift taraflı muhasebe kaydıdır.
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,                 -- Harcama için negatif (-15), yükleme için pozitif (+200)
  balance_before INTEGER NOT NULL CHECK (balance_before >= 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'welcome_bonus',        -- Kayıt olduğunda verilen 30 ücretsiz kredi
      'store_purchase',       -- IAP mağaza satın alımı
      'cake_generation_std',  -- Standart pasta görseli üretimi (-10 kredi)
      'cake_generation_4k',   -- Ultra HD 4K pasta görseli üretimi (-20 kredi)
      'diy_recipe_generation',-- 10.000 tokenlık şef tarifi üretimi (-15 kredi)
      'technical_refund',     -- Hata durumunda sistemin krediyi iade etmesi (+kredi)
      'admin_adjustment'      -- Destek ekibi tarafından manuel hediye
    )
  ),
  reference_id TEXT,                      -- İlgili purchase_id veya cake_id
  description TEXT NOT NULL,              -- Kullanıcıya gösterilecek açıklama
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.credit_ledger IS 'Cüzdan hareketlerinin ve bakiye değişimlerinin denetim defteri (Audit Ledger)';

-- ==============================================================================
-- 4. PERFORMANS İNDEKSLERİ
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.credit_purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_tx_id ON public.credit_purchases(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON public.credit_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_ref_id ON public.credit_ledger(reference_id);

-- ==============================================================================
-- 5. YENİ KULLANICIYA CÜZDAN AÇMA VE 30 HOŞ GELDİN KREDİSİ (TRIGGER)
-- ==============================================================================
-- Hoş geldin kredisi 2026-10-23'te 30 yapıldı (supabase/migrations/20261023_hosgeldin_kredisi_30.sql).
CREATE OR REPLACE FUNCTION public.welcome_credits()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT 15;
$$;

CREATE OR REPLACE FUNCTION public.handle_create_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bonus INTEGER := public.welcome_credits();
  v_already_claimed BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.credit_ledger 
    WHERE user_id = NEW.id AND transaction_type = 'welcome_bonus'
  ) INTO v_already_claimed;

  INSERT INTO public.user_wallets (
    user_id,
    balance,
    lifetime_purchased,
    lifetime_spent,
    welcome_bonus_claimed
  ) VALUES (
    NEW.id,
    CASE WHEN v_already_claimed THEN 0 ELSE v_bonus END,
    0,
    0,
    NOT v_already_claimed
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Cüzdan yeni açıldıysa ve daha önce bonus almadıysa deftere yaz (kesinlikle bir kez).
  IF NOT v_already_claimed THEN
    INSERT INTO public.credit_ledger (
      user_id, amount, balance_before, balance_after, transaction_type, description
    ) VALUES (
      NEW.id,
      v_bonus,
      0,
      v_bonus,
      'welcome_bonus',
      'Tek seferlik hoş geldin hediyesi: ' || v_bonus || ' kredi tanımlandı.'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Auth kullanıcısı oluştuğunda cüzdanı hazırla
DROP TRIGGER IF EXISTS on_auth_create_user_wallet ON auth.users;
CREATE TRIGGER on_auth_create_user_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_create_user_wallet();

-- ==============================================================================
-- 6. RPC: ATOMİK SATIN ALMA İŞLEME (process_store_purchase)
-- ==============================================================================
-- Apple / Google Play / RevenueCat ödemesi doğrulandığında çağrılır.
CREATE OR REPLACE FUNCTION public.process_store_purchase(
  p_user_id UUID,
  p_package_id TEXT,
  p_credits_amount INTEGER,
  p_price_paid DECIMAL(10, 2),
  p_currency TEXT,
  p_store TEXT,
  p_transaction_id TEXT,
  p_receipt_payload JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_wallet RECORD;
  v_new_balance INTEGER;
  v_purchase_id UUID;
BEGIN
  -- 0. GÜVENLİK KİLİDİ: İstemciden (hacker/postman) gelen doğrudan yetkisiz çağrıları engelle.
  -- Yalnızca arka plan servisiniz (service_role) veya webhook bu fonksiyonu çalıştırabilir.
  IF auth.role() IS NOT NULL AND auth.role() NOT IN ('service_role', 'supabase_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_CALLER');
  END IF;

  -- 1. Mükerrer İşlem Kontrolü (Aynı transaction_id önceden işlenmiş mi?)
  IF EXISTS (SELECT 1 FROM public.credit_purchases WHERE transaction_id = p_transaction_id) THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'ALREADY_PROCESSED',
      'message', 'Bu sipariş daha önce hesabınıza tanımlanmış.'
    );
  END IF;

  -- 2. Cüzdanı kilitli modda (FOR UPDATE) oku
  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Cüzdan henüz yoksa oluştur
    INSERT INTO public.user_wallets (user_id, balance, lifetime_purchased, lifetime_spent)
    VALUES (p_user_id, 0, 0, 0)
    RETURNING * INTO v_wallet;
  END IF;

  IF v_wallet.is_frozen THEN
    RETURN jsonb_build_object('success', false, 'error', 'WALLET_FROZEN');
  END IF;

  v_new_balance := v_wallet.balance + p_credits_amount;

  -- 3. Satın alım kaydını oluştur
  INSERT INTO public.credit_purchases (
    user_id,
    package_id,
    credits_amount,
    price_paid,
    currency,
    store,
    transaction_id,
    receipt_payload,
    status
  ) VALUES (
    p_user_id,
    p_package_id,
    p_credits_amount,
    p_price_paid,
    p_currency,
    p_store,
    p_transaction_id,
    p_receipt_payload,
    'completed'
  ) RETURNING id INTO v_purchase_id;

  -- 4. Cüzdan bakiyesini ve toplam satın alım sayacını güncelle
  UPDATE public.user_wallets
  SET
    balance = v_new_balance,
    lifetime_purchased = lifetime_purchased + p_credits_amount,
    updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id;

  -- 5. Kredi defterine (Ledger) yaz
  INSERT INTO public.credit_ledger (
    user_id,
    amount,
    balance_before,
    balance_after,
    transaction_type,
    reference_id,
    description
  ) VALUES (
    p_user_id,
    p_credits_amount,
    v_wallet.balance,
    v_new_balance,
    'store_purchase',
    v_purchase_id::text,
    p_credits_amount || ' Kredi Paketi Satın Alımı (' || p_store || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'new_balance', v_new_balance,
    'credits_added', p_credits_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İstemcilerden (anon ve authenticated) çalıştırma yetkisini tamamen kaldır:
REVOKE EXECUTE ON FUNCTION public.process_store_purchase FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_store_purchase TO service_role;

-- ==============================================================================
-- 7. RPC: ATOMİK KREDİ HARCAMA (spend_user_credits)
-- ==============================================================================
-- Pasta görseli veya şef tarifi üretilirken güvenle çağrılır.
-- Güvenlik yaması 2026-10-23 ile güncellendi (supabase/migrations/20261023_kredi_dusme_guvenligi.sql).
-- Fiyatı veritabanı belirler; yalnızca üretim türleri harcanabilir.
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

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ==============================================================================
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- 8.1 Cüzdan Politikaları (Kullanıcı sadece OKUYABİLİR, hileli UPDATE/INSERT yapamaz!)
DROP POLICY IF EXISTS "Kullanıcılar yalnızca kendi cüzdanlarını görebilir" ON public.user_wallets;
CREATE POLICY "Kullanıcılar yalnızca kendi cüzdanlarını görebilir"
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id);

-- 8.2 Satın Alımlar Politikaları (Kullanıcı sadece geçmiş satın alımlarını görebilir)
DROP POLICY IF EXISTS "Kullanıcılar kendi satın alımlarını görebilir" ON public.credit_purchases;
CREATE POLICY "Kullanıcılar kendi satın alımlarını görebilir"
  ON public.credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- 8.3 Kredi Defteri Politikaları (Kullanıcı sadece kendi harcama geçmişini görebilir)
DROP POLICY IF EXISTS "Kullanıcılar kendi harcama defterini görebilir" ON public.credit_ledger;
CREATE POLICY "Kullanıcılar kendi harcama defterini görebilir"
  ON public.credit_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Cüzdan ve defter istemciden yalnızca okunur.
REVOKE INSERT, UPDATE, DELETE ON public.user_wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM anon, authenticated;
ALTER TABLE public.credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_spend_is_negative;
ALTER TABLE public.credit_ledger
  ADD CONSTRAINT credit_ledger_spend_is_negative
  CHECK (transaction_type NOT IN ('cake_generation_std', 'cake_generation_4k', 'diy_recipe_generation') OR amount < 0);

-- ==============================================================================
-- 9. RPC: GDPR / APPLE REVIEW TAM HESAP VE CÜZDAN SİLME (delete_user_account)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- ON DELETE CASCADE kuralı sayesinde:
  -- auth.users silindiğinde user_wallets, credit_purchases, credit_ledger silinir
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.delete_user_account FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account TO authenticated;
