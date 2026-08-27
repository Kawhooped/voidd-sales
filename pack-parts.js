/* Pages stub qa.json is small; merge qa-0/1/2. Local full qa.json skips this. */
(function (w) {
  const C = w.VOIDDCloser;
  if (!C || !C.loadPack) return;
  const orig = C.loadPack;
  C.loadPack = function () {
    return orig().then(function (pack) {
      if ((pack.items || []).length >= 80) return pack;
      const src = document.documentElement.getAttribute("data-qa") || "qa.json";
      const base = src.replace(/[^/]+$/, "");
      return Promise.all(["qa-0.json", "qa-1.json", "qa-2.json"].map(function (n) {
        return fetch(base + n).then(function (r) { return r.ok ? r.json() : { items: [] }; }).catch(function () { return { items: [] }; });
      })).then(function (chunks) {
        const items = [];
        chunks.forEach(function (c) { (c.items || []).forEach(function (it) { items.push(it); }); });
        if (!items.length) return pack;
        const head = chunks.filter(function (c) { return c && c.phone; })[0] || pack;
        pack.items = items;
        pack.phone = head.phone || pack.phone;
        pack.who = head.who || pack.who;
        pack.pitch = head.pitch || pack.pitch;
        pack.pitchEs = head.pitchEs || pack.pitchEs;
        pack.collect = head.collect || pack.collect;
        return pack;
      });
    });
  };
})(window);
