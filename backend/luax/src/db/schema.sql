-- 1. Conferencias
CREATE TABLE IF NOT EXISTS conferencias (
  id VARCHAR(64) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  pin_admin VARCHAR(64) NOT NULL,
  pin_acceso VARCHAR(64),
  email_admin VARCHAR(255),
  ultimo_cambio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Comités (Estado ligero del debate)
CREATE TABLE IF NOT EXISTS comites (
  id VARCHAR(64) PRIMARY KEY,
  conferencia_id VARCHAR(64) REFERENCES conferencias(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  pin_mesa VARCHAR(64),
  tipo_sesion VARCHAR(32) DEFAULT 'formal',
  topico_actual TEXT DEFAULT '',
  config_ui JSONB DEFAULT '{}'::jsonb,
  estado_debate JSONB NOT NULL DEFAULT '{}'::jsonb,
  actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comites_conf ON comites(conferencia_id);

-- 3. Resoluciones (Documento pesado independiente)
CREATE TABLE IF NOT EXISTS resoluciones (
  id VARCHAR(64) PRIMARY KEY,
  comite_id VARCHAR(64) REFERENCES comites(id) ON DELETE CASCADE,
  titulo VARCHAR(255),
  texto_completo TEXT,
  articulos JSONB DEFAULT '[]'::jsonb,
  enmiendas JSONB DEFAULT '[]'::jsonb,
  actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resoluciones_comite ON resoluciones(comite_id);

-- 4. Notas de intervenciones (Chairs)
CREATE TABLE IF NOT EXISTS notas_intervenciones (
  id BIGSERIAL PRIMARY KEY,
  comite_id VARCHAR(64) REFERENCES comites(id) ON DELETE CASCADE,
  pais VARCHAR(128),
  autor VARCHAR(128) NOT NULL,
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notas_comite ON notas_intervenciones(comite_id, creado_en DESC);

-- 5. Mensajería y avisos con filtro por rol y destino
CREATE TABLE IF NOT EXISTS mensajes (
  id BIGSERIAL PRIMARY KEY,
  conferencia_id VARCHAR(64) REFERENCES conferencias(id) ON DELETE CASCADE,
  comite_id VARCHAR(64) REFERENCES comites(id) ON DELETE CASCADE,
  emisor_rol VARCHAR(32) NOT NULL,
  emisor_id VARCHAR(64) NOT NULL,
  destino_tipo VARCHAR(16) NOT NULL, -- 'direct', 'role', 'all'
  destino_rol VARCHAR(32),           -- 'chair', 'staff', 'delegate', 'all'
  destino_id VARCHAR(64),            -- ID específico si es privado
  contenido TEXT NOT NULL,
  estado VARCHAR(24) DEFAULT 'delivered', -- 'pending_approval', 'delivered', 'rejected'
  creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mensajes_filtro 
ON mensajes(conferencia_id, destino_tipo, destino_rol, destino_id, creado_en DESC);

-- 6. Checklist del Staff
CREATE TABLE IF NOT EXISTS checklist_staff (
  id BIGSERIAL PRIMARY KEY,
  conferencia_id VARCHAR(64) REFERENCES conferencias(id) ON DELETE CASCADE,
  comite_id VARCHAR(64) REFERENCES comites(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  completado BOOLEAN DEFAULT FALSE,
  asignado_a VARCHAR(128),
  creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_checklist_conf_comite ON checklist_staff(conferencia_id, comite_id);
