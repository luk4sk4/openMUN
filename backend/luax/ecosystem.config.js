module.exports = {
  apps: [{
    name: 'openmun-backend',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    restart_delay: 2000,
    max_restarts: 10,
    kill_timeout: 20_000,
    env: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: 3005 }
  }]
};
