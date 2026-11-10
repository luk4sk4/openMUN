function createDebateQueue(write, delay = 3000, supersedes = () => true) {
  const entries = new Map();
  let draining = false;

  function schedule(key, entry) {
    if (entry.timer || entry.running) return;
    if (draining) {
      flush(key, entry);
    } else {
      entry.timer = setTimeout(() => flush(key, entry), delay);
    }
  }

  function flush(key, entry) {
    clearTimeout(entry.timer);
    entry.timer = null;
    const pending = entry.pending;
    entry.pending = null;
    entry.running = Promise.resolve()
      .then(() => write(key, pending.snapshot))
      .then(persisted => pending.resolve({ persisted }), pending.reject)
      .finally(() => {
        entry.running = null;
        if (entry.pending) schedule(key, entry);
        else entries.delete(key);
      });
  }

  return {
    enqueue(key, snapshot) {
      let entry = entries.get(key);
      if (!entry) {
        entry = { timer: null, running: null, pending: null };
        entries.set(key, entry);
      }
      return new Promise((resolve, reject) => {
        if (entry.pending && !supersedes(snapshot, entry.pending.snapshot)) {
          resolve({ superseded: true });
          return;
        }
        entry.pending?.resolve({ superseded: true });
        entry.pending = { snapshot, resolve, reject };
        schedule(key, entry);
      });
    },
    async drain() {
      draining = true;
      while (entries.size) {
        for (const [key, entry] of entries) {
          if (!entry.running) flush(key, entry);
        }
        await Promise.all(Array.from(entries.values(), entry => entry.running));
      }
    }
  };
}

module.exports = { createDebateQueue };
