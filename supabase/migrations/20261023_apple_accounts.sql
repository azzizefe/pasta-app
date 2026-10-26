-- ==============================================================================
-- APPLE İLE GİRİŞ & KAYIT ÖZEL TABLOSU VE TETİKLEYİCİSİ
-- ==============================================================================
-- Sign in with Apple ile kayıt olan veya giriş yapan kullanıcıların Apple'a özgü
-- verilerini (Apple User ID / Sub, Private Relay e-posta durumu, ad soyad ve
-- ham meta verileri) otomatik olarak bu tabloda toplar.
-- ==============================================================================

BEGIN;

-- 1. Apple Kayıtları Özel Tablosu
CREATE TABLE IF NOT EXISTS public.apple_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  apple_user_id TEXT UNIQUE,                   -- Apple 'sub' benzersiz kullanıcı ID'si
  email TEXT,                                  -- Kullanıcının Apple e-postası veya relay adresi
  is_private_email BOOLEAN DEFAULT false,      -- Apple Gizli E-posta Rölesi (@privaterelay.appleid.com)
  full_name TEXT,
  first_sign_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_sign_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  raw_user_meta JSONB DEFAULT '{}'::jsonb      -- Apple'dan gelen ham meta nesnesi
);

COMMENT ON TABLE public.apple_accounts IS 'Sign in with Apple ile kayıt ve giriş yapan kullanıcıların özel kimlik ve profil verileri';

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_apple_accounts_apple_id ON public.apple_accounts(apple_user_id);
CREATE INDEX IF NOT EXISTS idx_apple_accounts_email ON public.apple_accounts(email);

-- 2. Row Level Security (RLS) Güvenlik Politikaları
ALTER TABLE public.apple_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcı kendi Apple hesabını görebilir" ON public.apple_accounts;
CREATE POLICY "Kullanıcı kendi Apple hesabını görebilir"
  ON public.apple_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- İstemciden elle manipülasyonu engelle
REVOKE INSERT, UPDATE, DELETE ON public.apple_accounts FROM anon, authenticated;

-- 3. Apple Girişlerini Otomatik Yakalayan ve Kaydeden Fonksiyon
CREATE OR REPLACE FUNCTION public.handle_apple_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_provider TEXT;
  v_meta JSONB := NEW.raw_user_meta_data;
  v_app_meta JSONB := NEW.raw_app_meta_data;
  v_email TEXT := NEW.email;
  v_is_relay BOOLEAN := false;
BEGIN
  v_provider := COALESCE(v_app_meta->>'provider', '');

  -- E-posta Apple Private Relay mi?
  IF v_email LIKE '%@privaterelay.appleid.com%' THEN
    v_is_relay := true;
  END IF;

  -- Eğer işlem Apple sağlayıcısı üzerinden geldiyse
  IF v_provider = 'apple' 
     OR (v_app_meta->'providers')::text LIKE '%apple%'
     OR v_meta->>'iss' LIKE '%appleid.apple.com%' THEN

    INSERT INTO public.apple_accounts (
      id,
      apple_user_id,
      email,
      is_private_email,
      full_name,
      raw_user_meta,
      last_sign_in_at
    ) VALUES (
      NEW.id,
      COALESCE(v_meta->>'sub', v_meta->>'provider_id'),
      v_email,
      v_is_relay,
      COALESCE(v_meta->>'full_name', v_meta->>'name'),
      COALESCE(v_meta, '{}'::jsonb),
      timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, public.apple_accounts.email),
      is_private_email = EXCLUDED.is_private_email,
      full_name = COALESCE(EXCLUDED.full_name, public.apple_accounts.full_name),
      raw_user_meta = EXCLUDED.raw_user_meta,
      last_sign_in_at = timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$;

-- 4. auth.users üzerinde Tetikleyici
DROP TRIGGER IF EXISTS on_auth_apple_user_sync ON auth.users;
CREATE TRIGGER on_auth_apple_user_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_apple_user_sync();

COMMIT;
