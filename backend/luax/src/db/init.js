const schemaVersion = 5;

async function checkReadiness(db) {
  const result = await db.query('SELECT MAX(version)::int AS version FROM openmun_schema_versions');
  if (result.rows[0]?.version !== schemaVersion) throw new Error('Unexpected OpenMUN schema version');
}

module.exports = { checkReadiness, schemaVersion };
