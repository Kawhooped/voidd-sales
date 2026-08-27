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
  C.SKUS = [
    {
      id: "7500",
      name: "Lead Response",
      price: "$7,500",
      cut: "$1,500 after the shop pays us",
      blurb: "When nobody can pick up, people on your site leave a name and number. That reaches you. You call. They are not booked. Night names on their site get to a phone they check. Shop calls."
    }
  ];
  var host = document.getElementById("home-skus");
  if (host && !document.getElementById("what-we-install")) {
    var art = document.createElement("article");
    art.className = "card";
    art.id = "what-we-install";
    art.innerHTML = "<h2>What we install</h2>"
      + "<p class=\"note\">Say this after they understand the $7,500. Not the first sentence.</p>"
      + "<ol>"
      + "<li>On a page they already had — their type, colors, button</li>"
      + "<li>After hours: can’t reach us → leave name + phone</li>"
      + "<li>It reaches the inbox or phone they actually check</li>"
      + "<li>Visitor is never told they’re booked</li>"
      + "<li>Same number twice is one job</li>"
      + "<li>They can mark booked / lost / follow, and pause</li>"
      + "<li>24-hour flag if nobody touched it</li>"
      + "<li>Hours, area, services as packed</li>"
      + "<li>They call a test lead before we leave</li>"
      + "<li>Login they create</li>"
      + "</ol>";
    host.parentNode.insertBefore(art, host.nextSibling);
  }
})(window);
