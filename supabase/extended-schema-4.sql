-- ============================================================================
-- WorkLedger — Esquema extendido 4 (funciones nuevas del backlog que requieren
-- base de datos / Storage).
-- Idempotente y seguro: puedes pegarlo COMPLETO en el SQL Editor de Supabase y
-- ejecutarlo (no borra datos; usa IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- Patrón: cada tabla lleva user_id -> auth.users y RLS "own X".
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1) TRABAJOS — etiquetas y cronómetro (horas trabajadas)
-- ----------------------------------------------------------------------------
-- Etiquetas libres del trabajo (p.ej. {"garantia","urgente","contrato"})
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
-- Cronómetro: marca de entrada y salida en sitio
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS clock_in  TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS clock_out TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 2) CLIENTES — etiquetas
-- ----------------------------------------------------------------------------
-- Etiquetas del cliente (p.ej. {"VIP","moroso","frecuente"})
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ----------------------------------------------------------------------------
-- 3) CLIENTES — bitácora de contacto (llamadas / mensajes con fecha)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_contacts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'nota',   -- 'llamada' | 'whatsapp' | 'email' | 'nota'
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS client_contacts_client_id_idx ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS client_contacts_user_id_idx   ON client_contacts(user_id);
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own client_contacts" ON client_contacts;
CREATE POLICY "own client_contacts" ON client_contacts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4) MATERIALES — proveedor + historial de movimientos de stock
-- ----------------------------------------------------------------------------
ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplier TEXT;

CREATE TABLE IF NOT EXISTS material_movements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  delta       DECIMAL(10,2) NOT NULL,          -- + entrada, - salida
  reason      TEXT,                            -- 'compra' | 'uso' | 'ajuste' | ...
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS material_movements_material_id_idx ON material_movements(material_id);
CREATE INDEX IF NOT EXISTS material_movements_user_id_idx     ON material_movements(user_id);
ALTER TABLE material_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own material_movements" ON material_movements;
CREATE POLICY "own material_movements" ON material_movements FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5) GASTOS — kilometraje y foto del recibo
-- ----------------------------------------------------------------------------
-- Millas recorridas (para deducción); la tarifa por milla se guarda local en la app
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS miles DECIMAL(10,2);
-- Ruta de la foto del recibo en Storage (bucket 'expense-receipts')
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_path TEXT;

-- ----------------------------------------------------------------------------
-- 6) NOTAS DE VOZ del trabajo (registro; el audio vive en Storage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_audio (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_audio_job_id_idx  ON job_audio(job_id);
CREATE INDEX IF NOT EXISTS job_audio_user_id_idx ON job_audio(user_id);
ALTER TABLE job_audio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own job_audio" ON job_audio;
CREATE POLICY "own job_audio" ON job_audio FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7) CLIENTES — documentos adjuntos (registro; archivo en Storage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_documents (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       TEXT,
  path       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS client_documents_client_id_idx ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS client_documents_user_id_idx   ON client_documents(user_id);
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own client_documents" ON client_documents;
CREATE POLICY "own client_documents" ON client_documents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 8) STORAGE — buckets privados nuevos (recibos, audio, documentos)
--    Convención de ruta en los 3: '<user_id>/<...>/<archivo>'
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('expense-receipts', 'expense-receipts', false),
  ('job-audio',        'job-audio',        false),
  ('client-docs',      'client-docs',      false)
ON CONFLICT (id) DO NOTHING;

-- expense-receipts
DROP POLICY IF EXISTS "expense-receipts read own"   ON storage.objects;
DROP POLICY IF EXISTS "expense-receipts insert own" ON storage.objects;
DROP POLICY IF EXISTS "expense-receipts delete own" ON storage.objects;
CREATE POLICY "expense-receipts read own" ON storage.objects FOR SELECT
  USING (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "expense-receipts insert own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "expense-receipts delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'expense-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- job-audio
DROP POLICY IF EXISTS "job-audio read own"   ON storage.objects;
DROP POLICY IF EXISTS "job-audio insert own" ON storage.objects;
DROP POLICY IF EXISTS "job-audio delete own" ON storage.objects;
CREATE POLICY "job-audio read own" ON storage.objects FOR SELECT
  USING (bucket_id = 'job-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "job-audio insert own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "job-audio delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'job-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- client-docs
DROP POLICY IF EXISTS "client-docs read own"   ON storage.objects;
DROP POLICY IF EXISTS "client-docs insert own" ON storage.objects;
DROP POLICY IF EXISTS "client-docs delete own" ON storage.objects;
CREATE POLICY "client-docs read own" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "client-docs insert own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "client-docs delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'client-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- FIN. Resumen de lo que habilita este SQL:
--   • Trabajos: etiquetas (tags) + cronómetro (clock_in/clock_out)
--   • Clientes: etiquetas (tags) + bitácora de contacto + documentos adjuntos
--   • Materiales: proveedor + historial de movimientos de stock
--   • Gastos: kilometraje (miles) + foto del recibo
--   • Notas de voz en trabajos
--   • Buckets de Storage: expense-receipts, job-audio, client-docs
-- ============================================================================
