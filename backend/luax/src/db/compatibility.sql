ALTER TABLE comites ADD COLUMN private_state jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE comites ADD COLUMN role_credentials jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE mensajes ADD COLUMN notice_target text;
ALTER TABLE mensajes ADD COLUMN client_id text;
CREATE UNIQUE INDEX message_retry ON mensajes(comite_id,emisor_rol,emisor_id,client_id)
  WHERE client_id IS NOT NULL;
