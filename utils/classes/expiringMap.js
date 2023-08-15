class ExpiringMap {
  constructor(expirationTime) {
    this.map = new Map();
    this.expirationTime = expirationTime;
  }

  set(key, value) {
    this.map.set(key, {
      value,
      expiration: setTimeout(() => {
        this.map.delete(key);
      }, this.expirationTime),
    });
  }

  get(key) {
    const entry = this.map.get(key);
    return entry ? entry.value : undefined;
  }

  delete(key) {
    const entry = this.map.get(key);
    if (entry) {
      clearTimeout(entry.expiration);
      this.map.delete(key);
    }
  }

  has(key) {
    return this.map.has(key);
  }

  listAll() {
    const entries = Array.from(this.map.entries());
    return entries.map(([key, entry]) => ({ key, value: entry.value }));
  }
}

module.exports = ExpiringMap;
