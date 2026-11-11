GRANT USAGE ON SCHEMA public TO openmun_app;
GRANT SELECT ON openmun_schema_versions TO openmun_app;
GRANT SELECT, INSERT, DELETE ON conferencias, comites, mensajes, checklist_staff TO openmun_app;
GRANT SELECT, INSERT ON notas_intervenciones TO openmun_app;
GRANT UPDATE (nombre,email_admin,pin_admin,pin_acceso,ultimo_cambio) ON conferencias TO openmun_app;
GRANT UPDATE (nombre,pin_mesa,tipo_sesion,topico_actual,private_state,role_credentials,estado_debate,debate_revision,actualizado_en) ON comites TO openmun_app;
GRANT UPDATE (estado,motivo_moderacion,client_id) ON mensajes TO openmun_app;
GRANT UPDATE (completado) ON checklist_staff TO openmun_app;
GRANT USAGE ON SEQUENCE mensajes_id_seq,checklist_staff_id_seq,notas_intervenciones_id_seq TO openmun_app;
