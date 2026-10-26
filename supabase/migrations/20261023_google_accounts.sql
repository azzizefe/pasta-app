-- ==============================================================================
-- GOOGLE İLE GİRİŞ & KAYIT ÖZEL TABLOSU VE TETİKLEYİCİSİ
-- ==============================================================================
-- Google OAuth ile kayıt olan veya giriş yapan kullanıcıların Google'a özgü
-- verilerini (Google Sub ID, ad, soyad, profil fotoğrafı, e-posta onay durumu,
-- yerel ayarlar ve ham meta veriler) otomatik olarak bu tabloda toplar.
-- ==============================================================================

BEGIN;

-- 1. Google Kayıtları Özel Tablosu
CREATE TABLE IF NOT EXISTS public.google_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_id TEXT UNIQUE,                       -- Google 'sub' benzersiz kullanıcı ID'si
  email TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  full_name TEXT,
  given_name TEXT,
  family_name TEXT,
  picture_url TEXT,
  locale VARCHAR(10),
  raw_user_meta JSONB DEFAULT '{}'::jsonb,     -- Google'dan dönen tüm ham profil nesnesi
  first_sign_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_sign_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.google_accounts IS 'Google OAuth ile kayıt ve giriş yapan kullanıcıların özel kimlik ve profil verileri';

-- İndeksler: Google ID ve Email üzerinden hızlı arama
CREATE INDEX IF NOT EXISTS idx_google_accounts_google_id ON public.google_accounts(google_id);
CREATE INDEX IF NOT EXISTS idx_google_accounts_email ON public.google_accounts(email);

-- 2. Row Level Security (RLS) Güvenlik Politikaları
ALTER TABLE public.google_accounts ENABLE ROW LEVEL SECURITY;

-- Kullanıcı sadece kendi Google verilerini görebilir
DROP POLICY IF EXISTS "Kullanıcı kendi Google hesabını görebilir" ON public.google_accounts;
CREATE POLICY "Kullanıcı kendi Google hesabını görebilir"
  ON public.google_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- İstemciden (telefondan) doğrudan manipülasyonu engelle, sadece veritabanı trigger'ı yazabilir
REVOKE INSERT, UPDATE, DELETE ON public.google_accounts FROM anon, authenticated;

-- 3. Google Girişlerini Otomatik Yakalayan ve Kaydeden Fonksiyon
CREATE OR REPLACE FUNCTION public.handle_google_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider TEXT;
  v_meta JSONB := NEW.raw_user_meta_data;
  v_app_meta JSONB := NEW.raw_app_meta_data;
BEGIN
  -- Sağlayıcıyı tespit et (GoTrue app_meta veya user_meta kontrolü)
  v_provider := COALESCE(v_app_meta->>'provider', '');

  -- Eğer işlem Google üzerinden gerçekleştiyse
  IF v_provider = 'google' 
     OR (v_app_meta->'providers')::text LIKE '%google%'
     OR v_meta->>'iss' LIKE '%accounts.google.com%' THEN

    INSERT INTO public.google_accounts (
      id,
      google_id,
      email,
      email_verified,
      full_name,
      given_name,
      family_name,
      picture_url,
      locale,
      raw_user_meta,
      last_sign_in_at
    ) VALUES (
      NEW.id,
      COALESCE(v_meta->>'sub', v_meta->>'provider_id'),
      NEW.email,
      COALESCE((v_meta->>'email_verified')::boolean, true),
      COALESCE(v_meta->>'full_name', v_meta->>'name'),
      v_meta->>'given_name',
      v_meta->>'family_name',
      COALESCE(v_meta->>'avatar_url', v_meta->>'picture'),
      v_meta->>'locale',
      COALESCE(v_meta, '{}'::jsonb),
      timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      email_verified = EXCLUDED.email_verified,
      full_name = COALESCE(EXCLUDED.full_name, public.google_accounts.full_name),
      given_name = COALESCE(EXCLUDED.given_name, public.google_accounts.given_name),
      family_name = COALESCE(EXCLUDED.family_name, public.google_accounts.family_name),
      picture_url = COALESCE(EXCLUDED.picture_url, public.google_accounts.picture_url),
      locale = COALESCE(EXCLUDED.locale, public.google_accounts.locale),
      raw_user_meta = EXCLUDED.raw_user_meta,
      last_sign_in_at = timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$;

-- 4. auth.users üzerinde Tetikleyici (Tetikleyici hem ilk kayıtta hem giriş güncellemelerinde çalışır)
DROP TRIGGER IF EXISTS on_auth_google_user_sync ON auth.users;
CREATE TRIGGER on_auth_google_user_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_google_user_sync();

COMMIT;
