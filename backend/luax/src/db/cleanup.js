async function cleanup(db) {
  const messages = await db.query(`
    DELETE FROM mensajes
    WHERE (creado_en AT TIME ZONE 'UTC') + INTERVAL '1 month' <= statement_timestamp() AT TIME ZONE 'UTC'
  `);
  const conferences = await db.query(`
    DELETE FROM conferencias
    WHERE (COALESCE(ultimo_cambio, creado_en) AT TIME ZONE 'UTC') + INTERVAL '1 year'
      <= statement_timestamp() AT TIME ZONE 'UTC'
  `);
  return { messages: messages.rowCount, conferences: conferences.rowCount };
}

module.exports = { cleanup };
