-- ============================================================================
-- WorkLedger — Esquema extendido 2 (Ronda 4: equipos, materiales por trabajo,
-- desglose, garantía, seguimiento)
-- Idempotente. Pégalo completo en el SQL Editor de Supabase y ejecútalo.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1) COLUMNAS NUEVAS EN jobs
--    G8 garantía · G13 seguimiento · G4 desglose/descuento/impuesto · G1 equipo
-- ----------------------------------------------------------------------------
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS warranty_until DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS followup_at    DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS followup_done  BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS line_items     JSONB;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS discount       DECIMAL(10,2) DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tax_rate       DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS equipment_id   UUID;

-- G9: link de reseñas (Google) en la configuración del negocio
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS review_link TEXT;

-- Tipo de cliente: "cliente" (tú le haces el trabajo) o "contratista" (te contrata)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'cliente';

-- H2: datos de pago (Zelle/Venmo/PayPal) para los recordatorios de cobro
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS payment_info TEXT;

-- ----------------------------------------------------------------------------
-- 2) EQUIPOS / UNIDADES DEL CLIENTE (G1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,          -- nombre/identificador (ej. "Sala", "Minisplit recámara")
  brand        TEXT,
  model        TEXT,
  serial       TEXT,
  btu          TEXT,                   -- capacidad (ej. "12000 BTU" / "1 ton")
  location     TEXT,
  install_date DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS equipment_client_id_idx ON equipment(client_id);
CREATE INDEX IF NOT EXISTS equipment_user_id_idx   ON equipment(user_id);

-- Llave foránea de jobs.equipment_id -> equipment.id (se agrega tras crear la tabla)
DO $$ BEGIN
  ALTER TABLE jobs
    ADD CONSTRAINT jobs_equipment_id_fkey
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 3) MATERIALES USADOS POR TRABAJO (G2 / G3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_materials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  quantity    DECIMAL(10,2) DEFAULT 1,
  unit_price  DECIMAL(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_materials_job_id_idx  ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS job_materials_user_id_idx ON job_materials(user_id);

-- ----------------------------------------------------------------------------
-- 4) ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
ALTER TABLE equipment     ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own equipment" ON equipment;
CREATE POLICY "own equipment" ON equipment FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own job_materials" ON job_materials;
CREATE POLICY "own job_materials" ON job_materials FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5) TRIGGER updated_at para equipment (reusa la función del esquema base)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIN.
-- ============================================================================
