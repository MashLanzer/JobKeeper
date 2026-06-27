-- ============================================================================
-- WorkLedger — Esquema extendido (funciones avanzadas)
-- Seguro de ejecutar varias veces (idempotente). Pégalo completo en el
-- SQL Editor de Supabase y ejecútalo.
-- Mantiene las mismas convenciones del esquema base: RLS por user_id y
-- triggers de updated_at.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1) COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- ----------------------------------------------------------------------------

-- Jobs: fecha de cobro total (N2/F5), checklist de servicio (N8), firma (N9)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS paid_at   TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS checklist JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS signature TEXT;          -- data URL (imagen base64)

-- Clients: plan de mantenimiento recurrente (N7)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS maintenance_months INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_service_date  DATE;

-- ----------------------------------------------------------------------------
-- 2) CONFIGURACIÓN DEL NEGOCIO (N1) + META DE INGRESOS (D13)
--    Una fila por usuario. Reemplaza el almacenamiento local por nube.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_settings (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  phone       TEXT,
  email       TEXT,
  logo        TEXT,                 -- data URL del logo
  income_goal DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3) PAGOS (F5) — historial de pagos parciales por trabajo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  amount     DECIMAL(10,2) NOT NULL,
  method     TEXT,                  -- efectivo, transferencia, zelle, etc.
  paid_at    DATE DEFAULT CURRENT_DATE,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_job_id_idx  ON payments(job_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);

-- ----------------------------------------------------------------------------
-- 4) PLANTILLAS DE TRABAJOS (F2)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_templates (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  data       JSONB NOT NULL,        -- { title, category, price, description, address, payment_method, notes }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_templates_user_id_idx ON job_templates(user_id);

-- ----------------------------------------------------------------------------
-- 5) FOTOS / ADJUNTOS EN TRABAJOS (F6)
--    El archivo vive en Storage (bucket 'job-photos'); aquí guardamos la ruta.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_photos (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,         -- ruta dentro del bucket
  caption    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_photos_job_id_idx  ON job_photos(job_id);
CREATE INDEX IF NOT EXISTS job_photos_user_id_idx ON job_photos(user_id);

-- ----------------------------------------------------------------------------
-- 6) INVENTARIO DE MATERIALES (F9)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  unit       TEXT,                  -- pieza, litro, kg, etc.
  price      DECIMAL(10,2) DEFAULT 0,
  stock      DECIMAL(10,2) DEFAULT 0,
  min_stock  DECIMAL(10,2) DEFAULT 0,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS materials_user_id_idx ON materials(user_id);

-- ----------------------------------------------------------------------------
-- 7) ROW LEVEL SECURITY (mismas reglas que el esquema base)
-- ----------------------------------------------------------------------------
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own business_settings" ON business_settings;
CREATE POLICY "own business_settings" ON business_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own payments" ON payments;
CREATE POLICY "own payments" ON payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own job_templates" ON job_templates;
CREATE POLICY "own job_templates" ON job_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own job_photos" ON job_photos;
CREATE POLICY "own job_photos" ON job_photos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own materials" ON materials;
CREATE POLICY "own materials" ON materials FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 8) TRIGGERS updated_at (reusa la función del esquema base)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings;
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 9) STORAGE: bucket privado para fotos de trabajos (F6)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: cada usuario solo accede a sus archivos.
-- Convención de ruta: '<user_id>/<job_id>/<archivo>'
DROP POLICY IF EXISTS "job-photos read own"   ON storage.objects;
DROP POLICY IF EXISTS "job-photos insert own" ON storage.objects;
DROP POLICY IF EXISTS "job-photos delete own" ON storage.objects;

CREATE POLICY "job-photos read own" ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "job-photos insert own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "job-photos delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- FIN. Tras ejecutar, avísame para conectar la app a estas tablas.
-- ============================================================================
