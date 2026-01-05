(function () {
  const store = {};
  Object.defineProperty(document, "cookie", {
    get() {
      return Object.entries(store)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    },
    set(v) {
      const [pair] = v.split(";");
      const [k, val] = pair.split("=");
      store[k.trim()] = val;
    }
  });
})();
