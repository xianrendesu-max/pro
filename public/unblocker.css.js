(function () {
  const fix = window.unblockerClient.fixUrl;
  const o = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (n, v, p) {
    if (typeof v === "string" && v.includes("url(")) {
      v = v.replace(/url\(([^)]+)\)/g,
        (_, u) => `url(${fix(u.replace(/['"]/g,""), __unblockerConfig, location)})`);
    }
    return o.call(this, n, v, p);
  };
})();
