const { Pool } = require('pg');

function databaseConfig(env = process.env) {
  for (const name of ['DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
    if (!env[name]) throw new Error('Missing database setting: ' + name);
  }
  return {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 5433),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2000,
    statement_timeout: 5000
  };
}

module.exports = { databaseConfig, Pool };
