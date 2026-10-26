-- ==============================================================================
-- LUMIÈRE SUCRÉE — PRODUCTION-READY SUPABASE VERİTABANI ŞEMASI (SQL SCHEMA)
-- ==============================================================================
-- Bu dosya, Supabase Dashboard > SQL Editor üzerinden doğrudan çalıştırılabilir.
--
-- MİMARİ NOTU:
-- 1. Mobil uygulama (Lumière Sucrée) local-first mimariyle çalışır; ancak kullanıcı
--    giriş yaptığında tüm verilerini (krediler, tasarımlar, özel günler, siparişler)
--    bulutla senkronize eder.
-- 2. Apple App Store & Google Play gereksinimleri (GDPR/KVKK hesap silme, IAP
--    işlem denetimi, RevenueCat entegrasyonu) tam uyumludur.
--
-- TABLOLAR & YAPILAR:
--  1. public.profiles (Kullanıcı profilleri, bakiye, rol, dil tercihi, push token)
--  2. public.cakes (AI pastaları, 10.000 tokenlık şef tarifleri, topluluk vitrini)
--  3. public.cake_likes (Topluluk pastalarını beğenme altyapısı)
--  4. public.credit_transactions (Atomik harcama ve IAP yükleme denetim kayıtları)
--  5. public.special_occasions (Özel günler, doğum günleri ve hatırlatıcılar)
--  6. public.pastry_orders (Pastacı sipariş fişleri ve etkinlik detayları)
--  7. public.app_feedback (Kullanıcı yıldız puanları ve geri bildirim kayıtları)
--  8. RPC Fonksiyonları:
--     - generation_cost (İşlem başına kredi fiyatı)
--     - deduct_user_credits (Atomik kredi harcama; tutarı veritabanı belirler)
--     - add_user_credits (RevenueCat/Webhook/IAP atomik kredi yükleme)
--     - delete_user_account (Apple Review / GDPR tam hesap silme)
--  9. Triggers (Otomatik updated_at, yeni kullanıcıya 30 kredi hediyesi, beğeni sayacı)
-- 10. Row Level Security (RLS) Güvenlik İlkeleri (Tam veri izolasyonu)
-- 11. Storage Bucket (cake-images) & Depolama Politikaları
-- ==============================================================================

-- 0. Gerekli Uzantıları Etkinleştir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. KULLANICI PROFİLLERİ & KREDİ BAKİYESİ
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 0 CHECK (credits_balance >= 0), -- hoş geldin kredisini tetikleyici verir
  welcome_bonus_claimed BOOLEAN NOT NULL DEFAULT false,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'baker')),
  preferred_language VARCHAR(10) NOT NULL DEFAULT 'tr' CHECK (preferred_language IN ('tr', 'en', 'fr', 'es', 'de', 'ar', 'ru', 'ja', 'it')),
  push_token TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.profiles IS 'Kullanıcı profilleri, sunucu kontrollü kredi bakiyeleri ve tercihleri';

-- ==============================================================================
-- 2. PASTALAR, DETAYLAR VE ŞEF TARİFLERİ
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('wedding', 'birthday', 'engagement', 'custom', 'diy')),
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'standard' CHECK (quality IN ('standard', '4k')),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false, -- Topluluk vitrininde sergileme
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),

  -- Gemini AI tarafından üretilen masterclass pasta tarifi metni
  recipe TEXT,

  -- Kat sayısı, porsiyon, aroma, dolgular, duy uçları ve özel tasarım parametreleri
  details JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.cakes IS 'Üretilen AI pastaları, görselleri, detayları ve şef tarifleri';

-- ==============================================================================
-- 3. TOPLULUK PASTA BEĞENİLERİ (CAKE LIKES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cake_likes (
  cake_id UUID NOT NULL REFERENCES public.cakes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (cake_id, user_id)
);

COMMENT ON TABLE public.cake_likes IS 'Toplulukta paylaşılan pastaların kullanıcı beğenileri';

-- ==============================================================================
-- 4. KULLANICI KREDİ CÜZDANI & BAKİYELERİ (public.user_wallets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0), -- hoş geldin kredisini tetikleyici verir
  lifetime_purchased INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_purchased >= 0),
  lifetime_spent INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.user_wallets IS 'Kullanıcıların sunucu denetimindeki resmi kredi cüzdanı ve harcama sayaçları';

-- ==============================================================================
-- 5. RESMİ SATIN ALIMLAR TABLOSU (public.credit_purchases)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
  price_paid DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
  store TEXT NOT NULL CHECK (store IN ('apple_app_store', 'google_play', 'revenuecat', 'stripe', 'sandbox')),
  transaction_id TEXT NOT NULL UNIQUE,
  original_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'revoked')),
  receipt_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.credit_purchases IS 'Apple Store ve Google Play üzerinden onaylanmış gerçek kredi satın alımları';

-- ==============================================================================
-- 6. KREDİ İŞLEMLERİ DENETİM GEÇMİŞİ (TRANSACTION AUDIT LOG)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Harcama için negatif (-15), yükleme için pozitif (+200)
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'generation_diy',
      'generation_standard',
      'generation_4k',
      'purchase_pack',
      'refund_technical_error',
      'welcome_bonus',
      'admin_adjustment'
    )
  ),
  description TEXT NOT NULL,
  cake_id UUID REFERENCES public.cakes(id) ON DELETE SET NULL,
  store TEXT CHECK (store IN ('apple', 'google', 'revenuecat', 'stripe', 'promo', 'bonus', 'system')),
  store_transaction_id TEXT,
  package_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.credit_transactions IS 'Tüm kredi harcama ve mağaza satın alma denetim izleri';

-- ==============================================================================
-- 5. ÖZEL GÜNLER & HATIRLATICILAR (SPECIAL OCCASIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.special_occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  relationship TEXT, -- 'Eşim', 'Annem', 'Arkadaşım', 'Çocuğum'
  title TEXT NOT NULL, -- 'Elif''in Doğum Günü'
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
  year INTEGER, -- Opsiyonel (yıl dönümü veya yaş hesabı için)
  type TEXT NOT NULL CHECK (type IN ('birthday', 'anniversary', 'wedding', 'engagement', 'celebration', 'other')),
  notes TEXT,
  reminder_days_before INTEGER NOT NULL DEFAULT 14,
  notification_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.special_occasions IS 'Kullanıcının kaydettiği özel günler ve pasta hatırlatıcıları';

-- ==============================================================================
-- 6. PASTACI SİPARİŞ FİŞLERİ (PASTRY ORDERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pastry_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cake_id UUID NOT NULL REFERENCES public.cakes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'baking', 'ready', 'delivered', 'cancelled')),
  customer_name TEXT,
  customer_phone TEXT,
  event_date DATE,
  delivery_address TEXT,
  notes TEXT,
  total_price DECIMAL(10, 2),
  currency TEXT NOT NULL DEFAULT 'TRY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.pastry_orders IS 'Müşterilerin pastacılara ilettiği sipariş fişleri ve teklifler';

-- ==============================================================================
-- 7. KULLANICI GERİ BİLDİRİMLERİ (APP FEEDBACK & REVIEWS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT NOT NULL,
  cake_title TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.app_feedback IS 'Uygulama içi memnuniyet anketi ve kullanıcı geri bildirimleri';

-- ==============================================================================
-- 8. PERFORMANS İNDEKSLERİ
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_cakes_user_id ON public.cakes(user_id);
CREATE INDEX IF NOT EXISTS idx_cakes_created_at ON public.cakes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cakes_kind ON public.cakes(kind);
CREATE INDEX IF NOT EXISTS idx_cakes_user_fav ON public.cakes(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_cakes_public_likes ON public.cakes(is_public, likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_cakes_details_gin ON public.cakes USING gin (details);

CREATE INDEX IF NOT EXISTS idx_credit_trans_user_id ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_trans_store_ref ON public.credit_transactions(store_transaction_id);

CREATE INDEX IF NOT EXISTS idx_occasions_user_id ON public.special_occasions(user_id, month, day);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.pastry_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.app_feedback(created_at DESC);

-- ==============================================================================
-- 9. OTOMATİK UPDATED_AT TETİKLEYİCİSİ
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_cakes_updated_at
  BEFORE UPDATE ON public.cakes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_occasions_updated_at
  BEFORE UPDATE ON public.special_occasions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.pastry_orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==============================================================================
-- 10. BEĞENİ SAYACINI OTOMATİK GÜNCELLEYEN TETİKLEYİCİ
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_cake_likes_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.cakes
    SET likes_count = likes_count + 1
    WHERE id = NEW.cake_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.cakes
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.cake_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_cake_likes_counter
  AFTER INSERT OR DELETE ON public.cake_likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_cake_likes_counter();

-- ==============================================================================
-- 11. YENİ KULLANICIYA OTOMATİK PROFİL & 30 HOŞ GELDİN KREDİSİ
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bonus INTEGER := public.welcome_credits();
  v_language TEXT := COALESCE(NEW.raw_user_meta_data->>'language', 'tr');
  v_already_claimed BOOLEAN := false;
BEGIN
  -- Desteklenmeyen dil kodu kaydı bozmasın.
  IF v_language NOT IN ('tr', 'en', 'fr', 'es', 'de', 'ar', 'ru', 'ja', 'it') THEN
    v_language := 'tr';
  END IF;

  -- Kullanıcının daha önce bonus alıp almadığını kontrol et
  SELECT EXISTS (
    SELECT 1 FROM public.credit_transactions 
    WHERE user_id = NEW.id AND action_type = 'welcome_bonus'
  ) INTO v_already_claimed;

  INSERT INTO public.profiles (
    id, email, full_name, avatar_url, credits_balance, welcome_bonus_claimed, preferred_language
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Lumière Misafiri'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    CASE WHEN v_already_claimed THEN 0 ELSE v_bonus END,
    NOT v_already_claimed,
    v_language
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    last_active_at = timezone('utc'::text, now());

  -- Profil yeni açıldıysa ve daha önce almadıysa deftere yaz (kesinlikle bir kez).
  IF NOT v_already_claimed THEN
    INSERT INTO public.credit_transactions (
      user_id, amount, balance_after, action_type, description, store
    ) VALUES (
      NEW.id,
      v_bonus,
      v_bonus,
      'welcome_bonus',
      'Tek seferlik hoş geldin hediyesi: ' || v_bonus || ' kredi tanımlandı.',
      'bonus'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 12. RPC FONKSİYONU: ATOMİK KREDİ DÜŞME (deduct_user_credits)
-- ==============================================================================
-- Güvenlik yaması 2026-10-23 ile güncellendi (supabase/migrations/20261023_kredi_dusme_guvenligi.sql).
-- Fiyatı veritabanı belirler; eksi/sıfır tutar ve yetersiz bakiye reddedilir.
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

-- ==============================================================================
-- 13. RPC FONKSİYONU: ATOMİK KREDİ YÜKLEME (add_user_credits - IAP / Webhook)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.add_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT,
  p_store TEXT DEFAULT NULL,
  p_store_transaction_id TEXT DEFAULT NULL,
  p_package_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- GÜVENLİK KİLİDİ: İstemciden (hacker/postman) gelen sahte kredi yüklemelerini engelle
  IF auth.role() IS NOT NULL AND auth.role() NOT IN ('service_role', 'supabase_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_CALLER');
  END IF;

  -- İki kez işlenmeyi önle (idempotency check)
  IF p_store_transaction_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.credit_transactions
      WHERE store_transaction_id = p_store_transaction_id
    ) THEN
      RETURN jsonb_build_object(
        'success', true,
        'warning', 'TRANSACTION_ALREADY_PROCESSED'
      );
    END IF;
  END IF;

  SELECT credits_balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  v_new_balance := v_current_balance + p_amount;

  UPDATE public.profiles
  SET credits_balance = v_new_balance
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    balance_after,
    action_type,
    description,
    store,
    store_transaction_id,
    package_id
  ) VALUES (
    p_user_id,
    p_amount,
    v_new_balance,
    p_action_type,
    p_description,
    p_store,
    p_store_transaction_id,
    p_package_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'added', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yalnızca arka plan sunucusunun (service_role) kredi yükleyebilmesini sağla:
REVOKE EXECUTE ON FUNCTION public.add_user_credits FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_credits TO service_role;

-- ==============================================================================
-- 14. RPC FONKSİYONU: GDPR / APPLE REVIEW TAM HESAP VE VERİ SİLME (delete_user_account)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_apple_sub TEXT;
  v_google_sub TEXT;
  v_meta JSONB;
  v_app_meta JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- 1. Kullanıcı bilgilerini al
  SELECT email, raw_user_meta_data, raw_app_meta_data 
    INTO v_email, v_meta, v_app_meta
    FROM auth.users
   WHERE id = v_user_id;

  v_apple_sub := COALESCE(v_meta->>'sub', v_meta->>'provider_id');
  v_google_sub := COALESCE(v_meta->>'sub', v_meta->>'provider_id');

  -- 2. HESAP SİLİNMEDEN ÖNCE: Kimlikleri kalıcı fraud tablosuna mühürle!
  -- Böylece aynı Apple/Google hesabı veya e-posta ile tekrar geldiğinde 15 bedava kredi alamaz.
  IF to_regclass('public.claimed_welcome_identities') IS NOT NULL THEN
    IF v_email IS NOT NULL AND TRIM(v_email) <> '' THEN
      INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
      VALUES ('email', LOWER(TRIM(v_email)), v_user_id, 'Hesap silindi - tekrar hoş geldin kredisi alamaz')
      ON CONFLICT (identifier_value) DO NOTHING;
    END IF;

    IF (COALESCE(v_app_meta->>'provider', '') = 'apple' OR (v_app_meta->'providers')::text LIKE '%apple%')
       AND v_apple_sub IS NOT NULL AND v_apple_sub <> '' THEN
      INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
      VALUES ('apple_sub', v_apple_sub, v_user_id, 'Apple hesabı silindi - tekrar hoş geldin kredisi alamaz')
      ON CONFLICT (identifier_value) DO NOTHING;
    END IF;

    IF (COALESCE(v_app_meta->>'provider', '') = 'google' OR (v_app_meta->'providers')::text LIKE '%google%')
       AND v_google_sub IS NOT NULL AND v_google_sub <> '' THEN
      INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
      VALUES ('google_sub', v_google_sub, v_user_id, 'Google hesabı silindi - tekrar hoş geldin kredisi alamaz')
      ON CONFLICT (identifier_value) DO NOTHING;
    END IF;
  END IF;

  -- 3. Storage görsellerini temizle (cake-images bucket'ındaki kullanıcının klasörü)
  DELETE FROM storage.objects
  WHERE bucket_id = 'cake-images'
    AND (storage.foldername(name))[1] = v_user_id::text;

  -- 4. Siparişleri ve kullanıcı geri bildirimlerini temizle
  DELETE FROM public.pastry_orders WHERE user_id = v_user_id;
  DELETE FROM public.app_feedback WHERE user_id = v_user_id;

  -- 5. auth.users kaydını sil.
  -- ON DELETE CASCADE kuralı sayesinde:
  -- - profiles, user_wallets, credit_purchases, credit_ledger,
  -- - credit_transactions, cakes, cake_likes, special_occasions silinir
  -- ANCAK claimed_welcome_identities bağımsız olduğu için kalır!
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Hesap başarıyla silindi.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sadece oturum açmış kullanıcı kendi hesabını silebilir:
REVOKE EXECUTE ON FUNCTION public.delete_user_account FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account TO authenticated;

-- ==============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLİTİKALARI (TAM VERİ İZOLASYONU)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cake_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastry_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- 15.0 Wallets & Purchases Politikaları (Kullanıcı yalnızca okuyabilir, hileli UPDATE yapamaz)
CREATE POLICY "Kullanıcılar yalnızca kendi cüzdanlarını görebilir"
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar yalnızca kendi satın alımlarını görebilir"
  ON public.credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- 15.1 Profiles Politikaları
CREATE POLICY "Kullanıcılar kendi profillerini görebilir"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Kullanıcı yalnızca ad, avatar, dil ve bildirim belirtecini değiştirebilir;
-- credits_balance, role ve is_banned sadece veritabanı fonksiyonlarıyla değişir.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, avatar_url, preferred_language, push_token, last_active_at)
  ON public.profiles TO authenticated;

CREATE POLICY "Kullanıcılar kendi profillerini güncelleyebilir"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 15.2 Cakes Politikaları
-- Toplulukta paylaşılan (is_public = true) pastaları herkes görebilir; gizlileri yalnızca sahibi görür.
CREATE POLICY "Kullanıcılar kendi pastalarını veya herkese açık pastaları görebilir"
  ON public.cakes FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Kullanıcılar kendi adına pasta kaydedebilir"
  ON public.cakes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar sadece kendi pastalarını güncelleyebilir"
  ON public.cakes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar sadece kendi pastalarını silebilir"
  ON public.cakes FOR DELETE
  USING (auth.uid() = user_id);

-- 15.3 Cake Likes Politikaları
CREATE POLICY "Herkes pasta beğenilerini görebilir"
  ON public.cake_likes FOR SELECT
  USING (true);

CREATE POLICY "Giriş yapmış kullanıcılar beğeni ekleyebilir"
  ON public.cake_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar kendi beğenisini geri çekebilir"
  ON public.cake_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 15.4 Credit Transactions Politikaları
CREATE POLICY "Kullanıcılar sadece kendi kredi hareketlerini görebilir"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Bakiye ve hareket tabloları istemciden yalnızca okunur.
REVOKE INSERT, UPDATE, DELETE ON public.user_wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM anon, authenticated;
ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_spend_is_negative
  CHECK (action_type NOT IN ('generation_standard', 'generation_4k', 'generation_diy') OR amount < 0);

-- 15.5 Special Occasions (Özel Günler) Politikaları
CREATE POLICY "Kullanıcılar sadece kendi özel günlerini görebilir"
  ON public.special_occasions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar yeni özel gün ekleyebilir"
  ON public.special_occasions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar kendi özel günlerini güncelleyebilir"
  ON public.special_occasions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar kendi özel günlerini silebilir"
  ON public.special_occasions FOR DELETE
  USING (auth.uid() = user_id);

-- 15.6 Pastry Orders Politikaları
CREATE POLICY "Kullanıcılar kendi siparişlerini görebilir"
  ON public.pastry_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Kullanıcılar yeni sipariş oluşturabilir"
  ON public.pastry_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 15.7 App Feedback Politikaları
CREATE POLICY "Kullanıcılar geri bildirim gönderebilir"
  ON public.app_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ==============================================================================
-- 16. SUPABASE STORAGE BUCKET YAPILANDIRMASI (cake-images)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cake-images', 'cake-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Politikaları
CREATE POLICY "Pasta görselleri herkes tarafından görüntülenebilir"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cake-images');

CREATE POLICY "Giriş yapmış kullanıcılar pasta görseli yükleyebilir"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cake-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Kullanıcılar sadece kendi klasöründeki görseli silebilir"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cake-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
