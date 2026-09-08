/* VOIDD cookie-less hit. No Set-Cookie. No localStorage ID. No canvas.
   Station sees this only on loopback. GitHub Pages never beacons. */
(function () {
  if (window.__voiddHit) return;
  var host = location.hostname || "";
  if (host !== "127.0.0.1" && host !== "localhost") return;
  window.__voiddHit = 1;
  var payload = {
    path: location.pathname + location.search,
    ref: document.referrer || "",
    lang: (navigator.language || "").slice(0, 16),
    w: window.innerWidth || 0,
    h: window.innerHeight || 0,
    host: location.host || ""
  };
  var body = JSON.stringify(payload);
  var local = "http://" + host + ":8934/api/hit";
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(local, new Blob([body], { type: "application/json" }));
    else fetch(local, { method: "POST", body: body, mode: "no-cors", keepalive: true });
  } catch (e) {}
})();
