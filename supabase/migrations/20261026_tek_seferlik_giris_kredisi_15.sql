-- ==============================================================================
-- HOŞ GELDİN KREDİSİ: TEK SEFERLİK 15 KREDİ & HESAP SİLME SUİSTİMAL KALKANI
-- ==============================================================================
-- 🛡️ SUİSTİMAL ÖNLEME MİMARİSİ (ANTI-EXPLOIT SHIELD):
-- 1. Kullanıcı 15 krediyi alıp pastasını üretip ardından "Hesabımı Sil" dese bile,
--    aynı Apple ID, Google hesabı veya e-posta ile tekrar geldiğinde KESİNLİKLE
--    tekrar 15 kredi ALAMAZ (0 bakiye ile açılır).
-- 2. "claimed_welcome_identities" tablosu bağımsızdır; "auth.users ON DELETE CASCADE"
--    ile SİLİNMEZ. Hesap silinse dahi Apple Sub ID ve E-posta kalıcı olarak kilitli kalır.
-- 3. delete_user_account() fonksiyonu hesabı silmeden önce kimlikleri kalıcı listeye işler.
-- 4. Misafir / oturum açmamış kullanıcılar asla kredi alamaz (auth.uid() zorunludur).
--
-- Nasıl çalıştırılır: Supabase Dashboard > SQL Editor > Dosyayı yapıştırıp "Run".
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. KALICI SUİSTİMAL DENETİM TABLOSU (auth.users silinse dahi ASLA silinmez)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claimed_welcome_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('apple_sub', 'google_sub', 'email')),
  identifier_value TEXT NOT NULL UNIQUE,          -- Normalize edilmiş e-posta veya Apple/Google Sub ID
  first_claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  first_user_id UUID,                            -- İlk açılan hesap ID'si (bilgi amaçlı)
  notes TEXT
);

COMMENT ON TABLE public.claimed_welcome_identities IS 'Hoş geldin kredisi almış veya hesap silip tekrar gelen kullanıcıların kalıcı dolandırıcılık/suistimal kalkanı tablosu';

CREATE INDEX IF NOT EXISTS idx_claimed_welcome_identities_val 
  ON public.claimed_welcome_identities(identifier_value);

-- Bu tabloya istemciden doğrudan müdahaleyi engelle (Sadece veritabanı trigger ve RPC'leri yazabilir)
ALTER TABLE public.claimed_welcome_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.claimed_welcome_identities FROM anon, authenticated, public;

-- ------------------------------------------------------------------------------
-- 2. profiles ve user_wallets Tablolarına Kontrol Sütunları
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS welcome_bonus_claimed BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF to_regclass('public.user_wallets') IS NOT NULL THEN
    ALTER TABLE public.user_wallets 
      ADD COLUMN IF NOT EXISTS welcome_bonus_claimed BOOLEAN NOT NULL DEFAULT false;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Mevcut Kullanıcıları Kalıcı Tabloya Aktar (Backfill)
-- ------------------------------------------------------------------------------
INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
SELECT 'email', LOWER(TRIM(email)), id, 'Mevcut kullanıcı transferi'
FROM public.profiles
WHERE email IS NOT NULL 
  AND id IN (SELECT user_id FROM public.credit_transactions WHERE action_type = 'welcome_bonus')
ON CONFLICT (identifier_value) DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.apple_accounts') IS NOT NULL THEN
    INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
    SELECT 'apple_sub', apple_user_id, id, 'Mevcut Apple kullanıcısı'
    FROM public.apple_accounts
    WHERE apple_user_id IS NOT NULL
    ON CONFLICT (identifier_value) DO NOTHING;
  END IF;

  IF to_regclass('public.google_accounts') IS NOT NULL THEN
    INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
    SELECT 'google_sub', google_id, id, 'Mevcut Google kullanıcısı'
    FROM public.google_accounts
    WHERE google_id IS NOT NULL
    ON CONFLICT (identifier_value) DO NOTHING;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Hoş Geldin Kredisi Sabiti: 15
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.welcome_credits()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT 15;
$$;

-- ------------------------------------------------------------------------------
-- 5. Suistimal Kontrol Yardımcı Fonksiyonu
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_welcome_claimed(
  p_user_id UUID,
  p_email TEXT,
  p_apple_sub TEXT,
  p_google_sub TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_norm_email TEXT := LOWER(TRIM(COALESCE(p_email, '')));
BEGIN
  IF v_norm_email <> '' AND EXISTS (
    SELECT 1 FROM public.claimed_welcome_identities 
    WHERE identifier_type = 'email' AND identifier_value = v_norm_email
  ) THEN
    RETURN true;
  END IF;

  IF p_apple_sub IS NOT NULL AND p_apple_sub <> '' AND EXISTS (
    SELECT 1 FROM public.claimed_welcome_identities 
    WHERE identifier_type = 'apple_sub' AND identifier_value = p_apple_sub
  ) THEN
    RETURN true;
  END IF;

  IF p_google_sub IS NOT NULL AND p_google_sub <> '' AND EXISTS (
    SELECT 1 FROM public.claimed_welcome_identities 
    WHERE identifier_type = 'google_sub' AND identifier_value = p_google_sub
  ) THEN
    RETURN true;
  END IF;

  IF p_user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.credit_transactions WHERE user_id = p_user_id AND action_type = 'welcome_bonus')
    OR EXISTS (SELECT 1 FROM public.credit_ledger WHERE user_id = p_user_id AND transaction_type = 'welcome_bonus')
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. İlk Kayıt / Giriş Tetikleyicisi (handle_new_user)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bonus INTEGER := public.welcome_credits();
  v_language TEXT := COALESCE(NEW.raw_user_meta_data->>'language', 'tr');
  v_apple_sub TEXT := COALESCE(NEW.raw_user_meta_data->>'sub', NEW.raw_user_meta_data->>'provider_id');
  v_google_sub TEXT := COALESCE(NEW.raw_user_meta_data->>'sub', NEW.raw_user_meta_data->>'provider_id');
  v_norm_email TEXT := LOWER(TRIM(COALESCE(NEW.email, '')));
  v_already_claimed BOOLEAN := false;
BEGIN
  IF v_language NOT IN ('tr', 'en', 'fr', 'es', 'de', 'ar', 'ru', 'ja', 'it') THEN
    v_language := 'tr';
  END IF;

  IF COALESCE(NEW.raw_app_meta_data->>'provider', '') <> 'apple' 
     AND (NEW.raw_app_meta_data->'providers')::text NOT LIKE '%apple%' THEN
    v_apple_sub := NULL;
  END IF;

  IF COALESCE(NEW.raw_app_meta_data->>'provider', '') <> 'google' 
     AND (NEW.raw_app_meta_data->'providers')::text NOT LIKE '%google%' THEN
    v_google_sub := NULL;
  END IF;

  v_already_claimed := public.check_is_welcome_claimed(NEW.id, v_norm_email, v_apple_sub, v_google_sub);

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    credits_balance,
    welcome_bonus_claimed,
    preferred_language
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Lumière Misafiri'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    CASE WHEN v_already_claimed THEN 0 ELSE v_bonus END,
    true,
    v_language
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    last_active_at = timezone('utc'::text, now());

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

    IF v_norm_email <> '' THEN
      INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
      VALUES ('email', v_norm_email, NEW.id, 'İlk kayıt ile alındı')
      ON CONFLICT (identifier_value) DO NOTHING;
    END IF;

    IF v_apple_sub IS NOT NULL AND v_apple_sub <> '' THEN
      INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
      VALUES ('apple_sub', v_apple_sub, NEW.id, 'Apple ile ilk kayıt')
      ON CONFLICT (identifier_value) DO NOTHING;
    END IF;

    IF v_google_sub IS NOT NULL AND v_google_sub <> '' THEN
      INSERT INTO public.claimed_welcome_identities (identifier_type, identifier_value, first_user_id, notes)
      VALUES ('google_sub', v_google_sub, NEW.id, 'Google ile ilk kayıt')
      ON CONFLICT (identifier_value) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Cüzdan Tetikleyicisi (handle_create_user_wallet)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_create_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bonus INTEGER := public.welcome_credits();
  v_apple_sub TEXT := COALESCE(NEW.raw_user_meta_data->>'sub', NEW.raw_user_meta_data->>'provider_id');
  v_google_sub TEXT := COALESCE(NEW.raw_user_meta_data->>'sub', NEW.raw_user_meta_data->>'provider_id');
  v_norm_email TEXT := LOWER(TRIM(COALESCE(NEW.email, '')));
  v_already_claimed BOOLEAN := false;
BEGIN
  IF COALESCE(NEW.raw_app_meta_data->>'provider', '') <> 'apple' 
     AND (NEW.raw_app_meta_data->'providers')::text NOT LIKE '%apple%' THEN
    v_apple_sub := NULL;
  END IF;

  IF COALESCE(NEW.raw_app_meta_data->>'provider', '') <> 'google' 
     AND (NEW.raw_app_meta_data->'providers')::text NOT LIKE '%google%' THEN
    v_google_sub := NULL;
  END IF;

  v_already_claimed := public.check_is_welcome_claimed(NEW.id, v_norm_email, v_apple_sub, v_google_sub);

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
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

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

-- ------------------------------------------------------------------------------
-- 8. HESAP SİLME GÜNCELLEMESİ (delete_user_account)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  SELECT email, raw_user_meta_data, raw_app_meta_data 
    INTO v_email, v_meta, v_app_meta
    FROM auth.users
   WHERE id = v_user_id;

  v_apple_sub := COALESCE(v_meta->>'sub', v_meta->>'provider_id');
  v_google_sub := COALESCE(v_meta->>'sub', v_meta->>'provider_id');

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

  DELETE FROM storage.objects
   WHERE bucket_id = 'cake-images'
     AND (storage.foldername(name))[1] = v_user_id::text;

  DELETE FROM public.pastry_orders WHERE user_id = v_user_id;
  DELETE FROM public.app_feedback WHERE user_id = v_user_id;

  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Hesap başarıyla silindi.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

COMMIT;
