/* Closer portal. Wren is the floor lead. Talk handles her. 7B drafts. */
(function (w) {
  const KEY = "voidd_closer";
  const PHONE = "786-660-1778";
  const TEL = "+17866601778";
  const LOCAL = location.port === "8875";
  const PANES = [
    "today", "shops", "qualify", "calls", "texts", "collect",
    "say", "objections", "services", "pack", "wren", "office",
  ];
  const Q4 = [
    "Live website right now?",
    "When they’re on a job / after hours, do people on that site get lost?",
    "Someone can edit the page?",
    "They have a phone or inbox they will actually see a new name on?",
  ];
  let pack = { items: [], pitch: "", collect: "", pitchEs: "" };

  function wipeStoredPasswords() {
    if (LOCAL) return;
    try {
      const rm = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("voidd_pass_") === 0) rm.push(k);
      }
      rm.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }
  wipeStoredPasswords();

  function session() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function clear() { localStorage.removeItem(KEY); }
  function needAuth() {
    if (session()) return;
    location.replace(LOCAL ? "/join" : "index.html");
  }
  function post(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (r) { return r.json(); });
  }
  function loadPack() {
    const src = (document.documentElement.getAttribute("data-qa") || (LOCAL ? "/qa.json" : "qa.json"));
    return fetch(src).then(function (r) { return r.json(); }).then(function (j) {
      pack = j || pack;
      return pack;
    }).catch(function () { return pack; });
  }
  function packAnswer(q) {
    const raw = String(q || "").toLowerCase();
    const words = raw.split(/\W+/).filter(function (w) { return w.length > 2; });
    if (/\b(how much|price|cost|7500|7,?500|1500)\b/.test(raw)) words.push("how", "much");
    if (/\b(paid|pay|payment|commission)\b/.test(raw)) words.push("when", "get", "paid");
    if (/\b(leads?|list)\b/.test(raw)) words.push("send", "leads");
    if (/\b(website|site)\b/.test(raw)) words.push("website");
    let best = null, score = 0;
    (pack.items || []).forEach(function (it) {
      const hay = ((it.q || "") + " " + (it.a || "")).toLowerCase();
      let n = 0;
      words.forEach(function (w) { if (hay.indexOf(w) >= 0) n++; });
      if (n > score) { best = it; score = n; }
    });
    if (best && score) return best.a;
    return pack.pitch || "Text the office 786-660-1778 if this is not in the pack.";
  }

  function localSignup(body) {
    const list = JSON.parse(localStorage.getItem("voidd_closers") || "[]");
    const email = (body.email || "").trim().toLowerCase();
    if (list.some(function (c) { return c.email === email; })) {
      return { ok: false, error: "That email already has an account. Log in." };
    }
    const token = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
    const row = { name: body.name, phone: body.phone, email: body.email, at: Date.now(), confirmed: false };
    list.push(row);
    localStorage.setItem("voidd_closers", JSON.stringify(list));
    if (LOCAL) localStorage.setItem("voidd_pass_" + email, body.password);
    localStorage.setItem("voidd_confirm_" + email, token);
    const link = (LOCAL ? "/confirm?t=" : "confirm.html?t=") + encodeURIComponent(token);
    return { ok: true, name: row.name, phone: row.phone, email: row.email, confirmed: false, packages: [], confirm_link: link, mail_sent: false };
  }
  function localLogin(body) {
    const email = (body.email || "").trim().toLowerCase();
    const saved = localStorage.getItem("voidd_pass_" + email);
    const list = JSON.parse(localStorage.getItem("voidd_closers") || "[]");
    const row = list.filter(function (c) { return (c.email || "").toLowerCase() === email; })[0];
    if (!row) return { ok: false, error: "No account in this browser. Sign up here, or use the local desk." };
    if (saved && saved !== body.password) return { ok: false, error: "Email or password. Use the one you created." };
    return { ok: true, name: row.name, phone: row.phone, email: row.email, confirmed: !!row.confirmed, packages: row.packages || [] };
  }
  function signup(body) {
    if (!LOCAL) {
      const j = localSignup(body);
      if (j.ok) save(j);
      return Promise.resolve(j);
    }
    return post("/api/closer/signup", body).then(function (j) {
      if (j && j.ok) save({ name: j.name, phone: j.phone, email: j.email, token: j.token, confirmed: !!j.confirmed, packages: j.packages || [], confirm_link: j.confirm_link || "", mail_sent: !!j.mail_sent });
      return j;
    }).catch(function () {
      const j = localSignup(body);
      if (j.ok) save(j);
      return j;
    });
  }
  function login(body) {
    if (!LOCAL) {
      const j = localLogin(body);
      if (j.ok) save(j);
      return Promise.resolve(j);
    }
    return post("/api/closer/login", body).then(function (j) {
      if (j && j.ok) save({ name: j.name, phone: j.phone, email: j.email, token: j.token, confirmed: !!j.confirmed, packages: j.packages || [], confirm_link: j.confirm_link || "", mail_sent: !!j.mail_sent });
      return j;
    }).catch(function () {
      const j = localLogin(body);
      if (j.ok) save(j);
      return j;
    });
  }
  function localDigits(p) { return String(p || "").replace(/\D/g, ""); }
  function localSetPassword(body) {
    const email = (body.email || "").trim().toLowerCase();
    const list = JSON.parse(localStorage.getItem("voidd_closers") || "[]");
    const row = list.filter(function (c) { return (c.email || "").toLowerCase() === email; })[0];
    const pw = body.password || "";
    if (!row) return { ok: false, error: "No account with that email in this browser. Sign up on this page." };
    if (localDigits(row.phone) !== localDigits(body.phone) || localDigits(body.phone).length < 10) {
      return { ok: false, error: "Phone does not match this email." };
    }
    if (pw.length < 6) return { ok: false, error: "You pick a new password, 6+ characters. We do not invent one." };
    if (LOCAL) localStorage.setItem("voidd_pass_" + email, pw);
    const j = { ok: true, name: row.name, phone: row.phone, email: row.email, confirmed: !!row.confirmed, packages: row.packages || [] };
    save(j);
    return j;
  }
  function setPassword(body) {
    if (!LOCAL) {
      return Promise.resolve(localSetPassword(body));
    }
    return post("/api/closer/set-password", body).then(function (j) {
      if (j && j.ok) save({ name: j.name, phone: j.phone, email: j.email, token: j.token, confirmed: !!j.confirmed, packages: j.packages || [] });
      return j;
    }).catch(function () {
      return localSetPassword(body);
    });
  }

  function chat(text) {
    const s = session() || {};
    const body = { name: s.name || "", phone: s.phone || "", email: s.email || "", text: text };
    if (!LOCAL) {
      return loadPack().then(function () {
        return { ok: true, who: "Wren", text: packAnswer(text) };
      });
    }
    return post("/api/closer/chat", body).then(function (j) {
      if (j && j.ok) return j;
      return loadPack().then(function () { return { ok: true, who: "Wren", text: packAnswer(text) }; });
    }).catch(function () {
      return loadPack().then(function () { return { ok: true, who: "Wren", text: packAnswer(text) }; });
    });
  }

  function wrenHtml() {
    return '<div class="reach">' +
      '<p class="reach-kicker"><b>Wren</b> — floor lead. Ask the pack or what to say. Office line stays below.</p>' +
      '<div id="wren-log" class="wren-log"></div>' +
      '<form id="reach-form">' +
      '<input id="reach-text" autocomplete="off" placeholder="Ask Wren…" />' +
      '<button type="submit">Send</button>' +
      '</form>' +
      '<p id="reach-status" class="note"></p>' +
      '<p class="office">Office · <a href="tel:' + TEL + '">' + PHONE + '</a> · <a href="sms:' + TEL + '">Text</a></p>' +
      '</div>';
  }

  function bindWren(root) {
    const form = root.querySelector("#reach-form");
    const log = root.querySelector("#wren-log");
    if (!form) return;
    function add(who, text) {
      if (!log) return;
      const d = document.createElement("div");
      d.className = "wmsg";
      d.innerHTML = "<span></span><p></p>";
      d.querySelector("span").textContent = who;
      d.querySelector("p").textContent = text;
      log.appendChild(d);
      log.scrollTop = 99999;
    }
    add("Wren", "I’m Wren. You sell. We install. Ask me the price, the pack, or what to say. Don’t invent a case study. Today tells you the next move.");
    form.onsubmit = function (e) {
      e.preventDefault();
      const t = (root.querySelector("#reach-text").value || "").trim();
      const st = root.querySelector("#reach-status");
      if (t.length < 2) { st.textContent = "Ask a question."; return; }
      add("You", t);
      root.querySelector("#reach-text").value = "";
      st.textContent = "Wren is looking…";
      chat(t).then(function (j) {
        add((j && j.who) || "Wren", (j && j.text) || "Text the office 786-660-1778.");
        st.textContent = "";
      }).catch(function () {
        add("Wren", "Text the office 786-660-1778.");
        st.textContent = "";
      });
    };
  }

  const SKUS = [
    {
      id: "7500",
      name: "Lead Response",
      price: "$7,500",
      cut: "$1,500 after the shop pays us",
      blurb: "The one you sell first. Form on their existing website. Visitor leaves name and phone when they can’t pick up. Shop calls. We install. No site = walk.",
    },
    {
      id: "10000",
      name: "Intake",
      price: "$10,000",
      cut: "20% after the shop pays us",
      blurb: "Same shop, after Lead Response is live on their URL. Truck does not roll until address, system, access, agreement, and photos are in.",
    },
    {
      id: "20000",
      name: "Ops",
      price: "$20,000",
      cut: "20% after the shop pays us",
      blurb: "Same shop, after Intake. Jobs: scheduled → dispatched → on site → done on one board.",
    },
  ];

  function pkgKey() {
    const s = session() || {};
    return "voidd_pkgs_" + ((s.email || "anon").toLowerCase());
  }
  function pkgs() {
    const s = session() || {};
    if (Array.isArray(s.packages) && s.packages.length) return s.packages.slice();
    try {
      const v = JSON.parse(localStorage.getItem(pkgKey()) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function hasPkg(id) { return pkgs().indexOf(id) >= 0; }
  function setPkgs(ids) {
    const clean = (ids || []).filter(function (id) {
      return SKUS.some(function (s) { return s.id === id; });
    });
    const s = session() || {};
    s.packages = clean;
    save(s);
    localStorage.setItem(pkgKey(), JSON.stringify(clean));
    if (!LOCAL) return Promise.resolve({ ok: true, packages: clean });
    return post("/api/closer/packages", {
      email: s.email || "",
      name: s.name || "",
      phone: s.phone || "",
      packages: clean,
    }).then(function (j) {
      return j && j.ok ? j : { ok: true, packages: clean };
    }).catch(function () { return { ok: true, packages: clean }; });
  }
  function togglePkg(id) {
    const cur = pkgs();
    const next = cur.indexOf(id) >= 0 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]);
    return setPkgs(next);
  }

  const MONEY = { "7500": [7500, 1500], "10000": [10000, 2000], "20000": [20000, 4000] };
  function dealKey() {
    const s = session() || {};
    return "voidd_deals_" + ((s.email || "anon").toLowerCase());
  }
  function deals() {
    try {
      const v = JSON.parse(localStorage.getItem(dealKey()) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function saveDeals(list) { localStorage.setItem(dealKey(), JSON.stringify(list)); }
  function addDeal(data) {
    const sku = data.sku || "7500";
    const money = MONEY[sku] || MONEY["7500"];
    const url = (data.url || "").trim();
    if (!url) return Promise.resolve({ ok: false, error: "URL cannot be blank." });
    const list = deals();
    const hit = list.filter(function (d) { return d.url === url && d.status === "pending"; })[0];
    if (hit) return Promise.resolve(hit);
    const row = {
      id: String(Date.now()),
      shop: (data.shop || "").trim() || "Shop",
      url: url,
      sku: sku,
      price: money[0],
      cut: money[1],
      status: "pending",
      at: Date.now(),
    };
    const s = session() || {};
    if (!LOCAL) {
      list.unshift(row);
      saveDeals(list);
      return Promise.resolve(row);
    }
    return post("/api/closer/deal", {
      email: s.email || "", shop: row.shop, url: row.url, sku: row.sku,
    }).then(function (j) {
      if (j && j.ok !== false && j.id) {
        list.unshift({
          id: j.id, shop: j.shop || row.shop, url: j.url || row.url,
          sku: j.sku || sku, price: j.price || row.price, cut: j.cut || row.cut,
          status: j.status || "pending",
        });
        saveDeals(list);
        return j;
      }
      list.unshift(row);
      saveDeals(list);
      return row;
    }).catch(function () {
      list.unshift(row);
      saveDeals(list);
      return row;
    });
  }
  function dealLost(id) {
    const s = session() || {};
    const list = deals().map(function (d) {
      return String(d.id) === String(id) && d.status !== "paid" ? Object.assign({}, d, { status: "lost" }) : d;
    });
    saveDeals(list);
    if (!LOCAL) return Promise.resolve({ ok: true });
    return post("/api/closer/deal-lost", { id: id, email: s.email || "" }).catch(function () { return { ok: true }; });
  }
  function pullDeals() {
    const s = session() || {};
    if (!LOCAL || !s.email) return Promise.resolve(deals());
    return fetch("/api/closer/deals?email=" + encodeURIComponent(s.email)).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.deals) {
        const rows = (j.deals || []).map(function (d) {
          return {
            id: d.id, shop: d.shop, url: d.url, sku: d.sku,
            price: d.price, cut: d.cut, status: d.status,
          };
        });
        saveDeals(rows);
        return rows;
      }
      return deals();
    }).catch(function () { return deals(); });
  }
  function confirmLocal(token) {
    const s = session() || {};
    const email = (s.email || "").toLowerCase();
    const saved = localStorage.getItem("voidd_confirm_" + email);
    if (!token || !saved || token !== saved) return { ok: false, error: "Link expired. Sign in again." };
    s.confirmed = true;
    save(s);
    const list = JSON.parse(localStorage.getItem("voidd_closers") || "[]");
    list.forEach(function (c) { if ((c.email || "").toLowerCase() === email) c.confirmed = true; });
    localStorage.setItem("voidd_closers", JSON.stringify(list));
    return { ok: true };
  }
  function panLike(s) {
    const d = String(s || "").replace(/\D/g, "");
    return d.length >= 13 && d.length <= 19;
  }
  function invoiceText(deal) {
    const youName = (session() || {}).name || "VOIDD closer";
    const price = deal.price || 7500;
    return (
      "VOIDD Labs — Invoice\n" +
      "Danny Aguiar · Miami · sole prop\n" +
      "786-660-1778 · kawhooped@gmail.com\n\n" +
      "To: " + (deal.shop || "Shop") + "\n" +
      (deal.shop_email ? ("Email: " + deal.shop_email + "\n") : "") +
      "Site: " + (deal.url || "") + "\n\n" +
      "After-hours Lead Response on the website you already have.\n" +
      "Amount due: $" + Number(price).toLocaleString() + " USD, one time.\n" +
      "Pay VOIDD Labs — not the salesperson (" + youName + ").\n" +
      "Call or text 786-660-1778 for Zelle or wire.\n" +
      "Do not send card numbers to a closer.\n\n" +
      "The visitor is never told they are booked. We install. You call the leads."
    );
  }
  function markInvoiced(id, shopEmail) {
    const s = session() || {};
    const list = deals().map(function (d) {
      if (String(d.id) !== String(id)) return d;
      return Object.assign({}, d, { shop_email: shopEmail, status: d.status === "paid" ? d.status : "invoiced" });
    });
    saveDeals(list);
    if (!LOCAL) return Promise.resolve({ ok: true });
    return post("/api/closer/invoice", { id: id, email: s.email || "", shop_email: shopEmail });
  }
  function reportPay(id, method, amount, ref) {
    if (panLike(ref) || panLike(amount)) {
      return Promise.resolve({ ok: false, error: "Do not type card numbers. Invoice them. They pay VOIDD." });
    }
    const s = session() || {};
    const list = deals().map(function (d) {
      if (String(d.id) !== String(id) || d.status === "paid") return d;
      return Object.assign({}, d, { status: "reported", pay_method: method, pay_ref: ref, pay_amount: amount });
    });
    saveDeals(list);
    if (!LOCAL) return Promise.resolve({ ok: true, status: "reported" });
    return post("/api/closer/report-pay", {
      id: id, email: s.email || "", method: method, amount: amount, ref: ref,
    });
  }
  function resendConfirm() {
    const s = session() || {};
    if (!LOCAL) {
      const token = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("voidd_confirm_" + (s.email || "").toLowerCase(), token);
      const link = "confirm.html?t=" + encodeURIComponent(token);
      s.confirm_link = link;
      s.mail_sent = false;
      save(s);
      return Promise.resolve({ ok: true, confirm_link: link, sent: false });
    }
    return post("/api/closer/resend-confirm", { email: s.email || "", name: s.name || "" }).then(function (j) {
      if (j && j.confirm_link) {
        s.confirm_link = j.confirm_link;
        s.mail_sent = !!j.sent;
        save(s);
      }
      return j;
    });
  }

  w.VOIDDCloser = {
    PHONE: PHONE, TEL: TEL, LOCAL: LOCAL, SKUS: SKUS,
    session: session, save: save, clear: clear,
    needAuth: needAuth, signup: signup, login: login, setPassword: setPassword, chat: chat,
    wrenHtml: wrenHtml, bindWren: bindWren,
    contactHtml: wrenHtml, bindContact: bindWren,
    Q4: Q4, PANES: PANES,
    loadPack: loadPack, packAnswer: packAnswer,
    pack: function () { return pack; },
    pkgs: pkgs, hasPkg: hasPkg, setPkgs: setPkgs, togglePkg: togglePkg,
    deals: deals, addDeal: addDeal, dealLost: dealLost, pullDeals: pullDeals,
    invoiceText: invoiceText, markInvoiced: markInvoiced, reportPay: reportPay,
    confirmLocal: confirmLocal, resendConfirm: resendConfirm,
  };
})(window);
