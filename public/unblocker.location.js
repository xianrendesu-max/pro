(function () {
  const loc = window.location;
  const fix = window.unblockerClient.fixUrl;

  ["assign", "replace"].forEach(fn => {
    const o = loc[fn].bind(loc);
    loc[fn] = url => o(fix(url, __unblockerConfig, location));
  });

  Object.defineProperty(window, "location", {
    get: () => loc,
    set: url => loc.assign(fix(url, __unblockerConfig, location))
  });
})();
