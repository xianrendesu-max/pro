(function () {
  window.__unblockerConfig = {
    prefix: "/service/",
    url: location.href
  };

  window.unblockerClient.init(__unblockerConfig, window);
})();
