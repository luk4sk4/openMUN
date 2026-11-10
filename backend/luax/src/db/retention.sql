CREATE FUNCTION touch_conference_activity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE conference text;
BEGIN
  IF TG_TABLE_NAME IN ('notas_intervenciones', 'resoluciones') THEN
    SELECT conferencia_id INTO conference FROM public.comites WHERE id = NEW.comite_id;
  ELSE
    conference := NEW.conferencia_id;
  END IF;
  UPDATE public.conferencias SET ultimo_cambio = GREATEST(ultimo_cambio, statement_timestamp())
  WHERE id = conference;
  RETURN NEW;
END
$$;

CREATE TRIGGER comite_activity AFTER INSERT OR UPDATE ON comites
FOR EACH ROW EXECUTE FUNCTION touch_conference_activity();
CREATE TRIGGER message_activity AFTER INSERT OR UPDATE ON mensajes
FOR EACH ROW EXECUTE FUNCTION touch_conference_activity();
CREATE TRIGGER checklist_activity AFTER INSERT OR UPDATE ON checklist_staff
FOR EACH ROW EXECUTE FUNCTION touch_conference_activity();
CREATE TRIGGER note_activity AFTER INSERT OR UPDATE ON notas_intervenciones
FOR EACH ROW EXECUTE FUNCTION touch_conference_activity();
CREATE TRIGGER resolution_activity AFTER INSERT OR UPDATE ON resoluciones
FOR EACH ROW EXECUTE FUNCTION touch_conference_activity();
