(function () {
  const prefix = "/service/";

  function fix(el, attr) {
    const val = el.getAttribute(attr);
    if (!val) return;
    if (
      val.startsWith(prefix) ||
      val.startsWith("data:") ||
      val.startsWith("javascript:")
    )
      return;

    try {
      const abs = new URL(val, location.href).href;
      el.setAttribute(attr, prefix + abs);
    } catch {}
  }

  function scan(node) {
    if (node.nodeType !== 1) return;

    if (node.hasAttribute("src")) fix(node, "src");
    if (node.hasAttribute("href")) fix(node, "href");
    if (node.hasAttribute("action")) fix(node, "action");
    if (node.hasAttribute("srcset")) {
      const val = node.getAttribute("srcset");
      const rewritten = val
        .split(",")
        .map(p => {
          const [u, s] = p.trim().split(" ");
          try {
            return prefix + new URL(u, location.href).href + (s ? " " + s : "");
          } catch {
            return p;
          }
        })
        .join(", ");
      node.setAttribute("srcset", rewritten);
    }
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(scan);
      if (m.type === "attributes") {
        scan(m.target);
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "href", "action", "srcset"]
  });

  // 初回
  document.querySelectorAll("*").forEach(scan);
})();
