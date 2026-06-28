-- ============================================================================
-- WorkLedger — Esquema extendido 3 (Ronda 5: prioridad, estado de cotización,
-- gastos recurrentes)
-- Idempotente. Pégalo completo en el SQL Editor de Supabase y ejecútalo.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- H7: prioridad del trabajo ("normal" | "urgente")
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- H3: estado de cotización ("enviada" | "aceptada" | "rechazada"); NULL = sin cotización
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quote_status TEXT;

-- H9: gastos fijos / recurrentes
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  category    TEXT DEFAULT 'otros',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS recurring_expenses_user_id_idx ON recurring_expenses(user_id);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own recurring_expenses" ON recurring_expenses;
CREATE POLICY "own recurring_expenses" ON recurring_expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FIN.
-- ============================================================================
