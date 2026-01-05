(function () {
  const fix = window.unblockerClient.fixUrl;

  function rewriteAttr(el, name) {
    const v = el.getAttribute(name);
    if (v) el.setAttribute(name, fix(v, __unblockerConfig, location));
  }

  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === "attributes") {
        ["src","href","action","poster"].includes(m.attributeName) &&
          rewriteAttr(m.target, m.attributeName);
      }
      if (m.addedNodes) {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1) {
            ["src","href","action","poster"].forEach(a => rewriteAttr(n, a));
          }
        });
      }
    }
  }).observe(document, { subtree: true, attributes: true, childList: true });

  const desc = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  Object.defineProperty(Element.prototype, "innerHTML", {
    set(html) {
      html = html.replace(/(src|href)=["']([^"']+)["']/g,
        (_, a, u) => `${a}="${fix(u, __unblockerConfig, location)}"`);
      return desc.set.call(this, html);
    }
  });
})();
