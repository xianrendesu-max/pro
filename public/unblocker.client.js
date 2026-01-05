(function (global) {
  "use strict";

  function fixUrl(urlStr, config, location) {
    if (!urlStr) return urlStr;

    let currentRemoteHref;
    if (location.pathname.startsWith(config.prefix)) {
      currentRemoteHref =
        location.pathname.slice(config.prefix.length) +
        location.search +
        location.hash;
    } else {
      currentRemoteHref = config.url;
    }

    if (urlStr.startsWith(config.prefix)) return urlStr;

    let url;
    try {
      url = new URL(urlStr, currentRemoteHref);
    } catch {
      return urlStr;
    }

    if (!/^https?:$/.test(url.protocol)) return urlStr;

    if (
      url.origin === location.origin &&
      url.pathname.startsWith(config.prefix)
    ) {
      return urlStr;
    }

    return config.prefix + url.href;
  }

  function wrapXHR(config, window) {
    const Orig = window.XMLHttpRequest;
    window.XMLHttpRequest = function () {
      const xhr = new Orig();
      const open = xhr.open;
      xhr.open = function (m, u) {
        arguments[1] = fixUrl(u, config, location);
        return open.apply(xhr, arguments);
      };
      return xhr;
    };
  }

  function wrapFetch(config, window) {
    const f = window.fetch;
    window.fetch = function (r, i) {
      if (typeof r === "string") r = fixUrl(r, config, location);
      else if (r && r.url) r = fixUrl(r.url, config, location);
      return f(r, i);
    };
  }

  function wrapHistory(config, window) {
    const h = window.history;
    ["pushState", "replaceState"].forEach(k => {
      const o = h[k];
      h[k] = function (s, t, u) {
        if (u) u = fixUrl(u, config, location);
        return o.call(h, s, t, u);
      };
    });
  }

  function wrapWebSocket(config, window) {
    const WS = window.WebSocket;
    window.WebSocket = function (url, proto) {
      if (typeof url === "string" && /^ws/.test(url)) {
        url = fixUrl(url.replace(/^ws/, "http"), config, location)
          .replace(/^http/, "ws");
      }
      return new WS(url, proto);
    };
  }

  function init(config, window) {
    wrapXHR(config, window);
    wrapFetch(config, window);
    wrapHistory(config, window);
    wrapWebSocket(config, window);
  }

  global.unblockerClient = { init, fixUrl };
})(this);
