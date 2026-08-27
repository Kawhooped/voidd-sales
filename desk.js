/* Closer desk: Today loop, shops, next move. */
(function (w) {
  const C = w.VOIDDCloser;
  if (!C) return;
  const PHONE = C.PHONE;
  const TEL = C.TEL;
  const LOCAL = C.LOCAL;
  const PANES = [
    "home", "packages", "pay",
    "today", "shops", "qualify", "calls", "texts", "collect",
    "say", "objections", "services", "pack", "wren", "office",
  ];
  const Q4 = [
    "Live website right now?",
    "When they’re on a job / after hours, do people on that site get lost?",
    "Someone can edit the page?",
    "They have a phone or inbox they will actually see a new name on?",
  ];
  function session() { return C.session(); }
  function save(s) { return C.save(s); }
  function clear() { return C.clear(); }
  function needAuth() { return C.needAuth(); }
  function loadPack() { return C.loadPack(); }
  function wrenHtml() { return C.wrenHtml(); }
  function bindWren(root) { return C.bindWren(root); }

function you() {
    const s = session() || {};
    return (s.name || "VOIDD").trim() || "VOIDD";
  }
  function pipeKey() {
    const s = session() || {};
    return "voidd_pipe_" + ((s.email || "anon").toLowerCase());
  }
  function pipeLoad() {
    try { return JSON.parse(localStorage.getItem(pipeKey()) || "[]"); } catch (e) { return []; }
  }
  function pipeSave(list) { localStorage.setItem(pipeKey(), JSON.stringify(list)); }
  function currentId() { return localStorage.getItem(pipeKey() + "_cur") || ""; }
  function setCurrent(id) { localStorage.setItem(pipeKey() + "_cur", id || ""); }
  function currentShop() {
    const list = pipeLoad();
    const id = currentId();
    let hit = list.filter(function (s) { return s.id === id; })[0];
    if (hit && hit.stage !== "walk" && hit.stage !== "sent") return hit;
    return list.filter(function (s) { return s.stage !== "sent" && s.stage !== "walk"; })[0] || null;
  }
  function patchShop(id, patch) {
    pipeSave(pipeLoad().map(function (s) {
      return s.id === id ? Object.assign({}, s, patch, { at: Date.now() }) : s;
    }));
  }
  function addShop(data) {
    const shop = {
      id: String(Date.now()),
      name: (data.name || "").trim() || "Shop",
      url: (data.url || "").trim(),
      phone: (data.phone || "").trim(),
      note: (data.note || "").trim(),
      stage: "qualify",
      q: [null, null, null, null],
      at: Date.now(),
    };
    const list = pipeLoad();
    list.unshift(shop);
    pipeSave(list);
    setCurrent(shop.id);
    return shop;
  }
  function fill(t, shop) {
    const s = shop || currentShop() || {};
    return String(t)
      .replace(/\[you\]/g, you())
      .replace(/\[name\]/g, s.name || "[name]")
      .replace(/\[url\]/g, s.url || "their live site")
      .replace(/\[phone\]/g, s.phone || "");
  }
  function nextMove() {
    const list = pipeLoad();
    const shop = currentShop();
    const open = list.filter(function (s) { return s.stage !== "sent" && s.stage !== "walk"; }).length;
    const sent = list.filter(function (s) { return s.stage === "sent"; }).length;
    const walked = list.filter(function (s) { return s.stage === "walk"; }).length;
    if (!list.length) {
      return {
        kicker: "Start",
        title: "Add one shop with a live website",
        body: "No site = walk. HVAC, plumbing, electrical, garage, auto. Prefer 2+ trucks or they already pay for ads.",
        pane: "shops",
        cta: "Add a shop",
        shop: null, open: 0, sent: 0, walked: 0, step: 0,
      };
    }
    if (!shop) {
      return {
        kicker: "Board clear",
        title: "Add the next live site. Do not pester walked shops.",
        body: "One follow-up, then stop. Keep the flywheel: new URL, four questions, one call.",
        pane: "shops",
        cta: "Add a shop",
        shop: null, open: open, sent: sent, walked: walked, step: 0,
      };
    }
    if (shop.stage === "qualify" || shop.stage === "new") {
      return {
        kicker: "Qualify",
        title: "Four questions — " + shop.name,
        body: "Hard no = walk. Do not invent a package.",
        pane: "qualify",
        cta: "Ask the four",
        shop: shop, open: open, sent: sent, walked: walked, step: 1,
      };
    }
    if (shop.stage === "call") {
      return {
        kicker: "Call",
        title: "Take the first call — " + shop.name,
        body: "One minute. Then quiet. Do not leave a second voicemail today.",
        pane: "calls",
        cta: "Open the script",
        shop: shop, open: open, sent: sent, walked: walked, step: 2,
      };
    }
    if (shop.stage === "text") {
      return {
        kicker: "One follow-up",
        title: "Last note to " + shop.name + ", then stop",
        body: "Do not nag \u201cjust checking in.\u201d If they want it, collect. If not, walk.",
        pane: "texts",
        cta: "Open texts",
        shop: shop, open: open, sent: sent, walked: walked, step: 3,
      };
    }
    if (shop.stage === "collect") {
      return {
        kicker: "Collect",
        title: "Fill 1–11 for " + shop.name,
        body: "URL cannot be blank. They create the login. Text the pack to " + PHONE + ".",
        pane: "collect",
        cta: "Open collect",
        shop: shop, open: open, sent: sent, walked: walked, step: 4,
      };
    }
    return {
      kicker: "Today",
      title: "Pick the next shop",
      body: "One live site at a time.",
      pane: "shops",
      cta: "Open shops",
      shop: shop, open: open, sent: sent, walked: walked, step: 0,
    };
  }

  function showPane(id) {
    if (PANES.indexOf(id) < 0) id = "home";
    document.querySelectorAll("#menus button[data-pane]").forEach(function (x) {
      x.classList.toggle("on", x.getAttribute("data-pane") === id);
    });
    PANES.forEach(function (p) {
      const el = document.getElementById("pane-" + p);
      if (el) el.classList.toggle("hid", p !== id);
    });
    const strip = document.getElementById("now-strip");
    if (strip) strip.classList.toggle("hid", id === "home" || id === "packages" || id === "pay");
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    if (id === "collect") prefillCollect();
    if (id === "qualify") renderQualify();
    if (id === "calls" || id === "texts") fillScripts();
    if (id === "home" || id === "packages") renderPackages();
    if (id === "pay") renderPay();
  }

  function prefillCollect() {
    const shop = currentShop();
    if (!shop) return;
    const f1 = document.getElementById("f1");
    const f2 = document.getElementById("f2");
    const f3 = document.getElementById("f3");
    if (f1 && !f1.value && shop.url) f1.value = shop.url;
    if (f2 && !f2.value && shop.name) f2.value = shop.name;
    if (f3 && !f3.value && shop.phone) f3.value = shop.phone;
  }

  function fillScripts() {
    document.querySelectorAll("[data-fill]").forEach(function (el) {
      const raw = el.getAttribute("data-fill") || el.getAttribute("data-raw") || el.textContent;
      if (!el.getAttribute("data-raw")) el.setAttribute("data-raw", raw);
      el.textContent = fill(el.getAttribute("data-raw"));
    });
  }

  function renderNow() {
    const m = nextMove();
    const k = document.getElementById("now-kicker");
    const t = document.getElementById("now-title");
    const b = document.getElementById("now-body");
    const a = document.getElementById("now-actions");
    if (k) k.textContent = "Next \u00b7 " + m.kicker;
    if (t) t.textContent = m.title;
    if (b) b.textContent = m.body;
    if (a) {
      a.innerHTML = "";
      function btn(label, kind, fn) {
        const x = document.createElement("button");
        x.type = "button";
        if (kind) x.className = kind;
        x.textContent = label;
        x.onclick = fn;
        a.appendChild(x);
      }
      btn(m.cta, "", function () { showPane(m.pane); });
      if (m.shop) {
        if (m.shop.stage === "call") {
          btn("They want it", "", function () { patchShop(m.shop.id, { stage: "collect" }); refresh(); showPane("collect"); });
          btn("Left voicemail", "ghost", function () { patchShop(m.shop.id, { stage: "text" }); refresh(); showPane("texts"); });
          btn("Walk", "ghost", function () { patchShop(m.shop.id, { stage: "walk" }); setCurrent(""); refresh(); showPane("today"); });
        } else if (m.shop.stage === "text") {
          btn("They want it", "", function () { patchShop(m.shop.id, { stage: "collect" }); refresh(); showPane("collect"); });
          btn("Walk — stop", "ghost", function () { patchShop(m.shop.id, { stage: "walk" }); setCurrent(""); refresh(); showPane("today"); });
        } else if (m.shop.stage === "collect") {
          btn("Sent to office", "", function () { patchShop(m.shop.id, { stage: "sent" }); setCurrent(""); refresh(); showPane("today"); });
        }
      }
    }
    const stats = document.getElementById("today-stats");
    if (stats) {
      stats.textContent = m.open + " in play \u00b7 " + m.sent + " sent \u00b7 " + m.walked + " walked \u00b7 $1,500 after they pay us";
    }
    document.querySelectorAll(".loop span[data-step]").forEach(function (el) {
      el.classList.toggle("on", Number(el.getAttribute("data-step")) === m.step);
    });
    const who = document.getElementById("active-shop");
    if (who) who.textContent = m.shop ? (m.shop.name + (m.shop.url ? " \u00b7 " + m.shop.url : "") + (m.shop.phone ? " \u00b7 " + m.shop.phone : "")) : "No shop in play — add one.";
  }

  function renderShops() {
    const box = document.getElementById("shop-list");
    if (!box) return;
    box.innerHTML = "";
    const list = pipeLoad();
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "note";
      p.textContent = "Empty. Add a live URL. That is the whole job until a pack is full.";
      box.appendChild(p);
      return;
    }
    const cur = currentId();
    const order = ["qualify", "new", "call", "text", "collect", "sent", "walk"];
    list.slice().sort(function (a, b) {
      return order.indexOf(a.stage) - order.indexOf(b.stage);
    }).forEach(function (s) {
      const art = document.createElement("article");
      art.className = "card shop-card" + (s.id === cur ? " current" : "");
      const h = document.createElement("p");
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = s.stage;
      const name = document.createElement("b");
      name.textContent = " " + s.name;
      h.appendChild(pill);
      h.appendChild(name);
      const meta = document.createElement("p");
      meta.className = "note";
      meta.textContent = [s.url, s.phone, s.note].filter(Boolean).join(" \u00b7 ") || "No URL yet";
      const row = document.createElement("p");
      row.className = "row";
      function ab(label, fn, ghost) {
        const b = document.createElement("button");
        b.type = "button";
        if (ghost) b.className = "ghost";
        b.textContent = label;
        b.onclick = fn;
        row.appendChild(b);
      }
      ab("Work this", function () { setCurrent(s.id); refresh(); showPane(s.stage === "sent" || s.stage === "walk" ? "shops" : nextMove().pane); }, false);
      if (s.phone) {
        const tel = document.createElement("a");
        tel.className = "btn ghost";
        tel.href = "tel:" + s.phone.replace(/[^\d+]/g, "");
        tel.textContent = "Dial";
        row.appendChild(tel);
      }
      if (s.stage !== "walk" && s.stage !== "sent") {
        ab("Walk", function () { patchShop(s.id, { stage: "walk" }); if (currentId() === s.id) setCurrent(""); refresh(); }, true);
      }
      art.appendChild(h);
      art.appendChild(meta);
      art.appendChild(row);
      box.appendChild(art);
    });
  }

  function renderQualify() {
    const shop = currentShop();
    const who = document.getElementById("qualify-who");
    const box = document.getElementById("qualify-qs");
    if (who) who.textContent = shop ? shop.name + (shop.url ? " \u00b7 " + shop.url : "") : "Add a shop first — Qualify needs a live URL.";
    if (!box) return;
    box.innerHTML = "";
    if (!shop) return;
    const q = shop.q || [null, null, null, null];
    Q4.forEach(function (label, i) {
      const art = document.createElement("article");
      art.className = "card";
      const p = document.createElement("p");
      p.innerHTML = "<b></b>";
      p.querySelector("b").textContent = (i + 1) + ". " + label;
      const row = document.createElement("p");
      row.className = "row";
      ["yes", "no"].forEach(function (v) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = q[i] === v ? "" : "ghost";
        b.textContent = v === "yes" ? "Yes" : "No — walk";
        b.onclick = function () {
          const nq = (shop.q || [null, null, null, null]).slice();
          nq[i] = v;
          if (v === "no") {
            patchShop(shop.id, { q: nq, stage: "walk" });
            setCurrent("");
            refresh();
            showPane("today");
            return;
          }
          const all = nq.every(function (x) { return x === "yes"; });
          patchShop(shop.id, { q: nq, stage: all ? "call" : "qualify" });
          refresh();
          if (all) showPane("calls");
        };
        row.appendChild(b);
      });
      art.appendChild(p);
      art.appendChild(row);
      box.appendChild(art);
    });
  }

  function renderPackages() {
    const skus = C.SKUS || [];
    function fill(boxId) {
      const box = document.getElementById(boxId);
      if (!box) return;
      box.innerHTML = "";
      skus.forEach(function (sku) {
        const on = C.hasPkg(sku.id);
        const art = document.createElement("article");
        art.className = "card sku-card" + (on ? " reg" : "");
        const h = document.createElement("p");
        h.innerHTML = "<b></b> \u00b7 <span></span>";
        h.querySelector("b").textContent = sku.name;
        h.querySelector("span").textContent = sku.price;
        const cut = document.createElement("p");
        cut.className = "cut";
        cut.textContent = sku.cut;
        const p = document.createElement("p");
        p.textContent = sku.blurb;
        const row = document.createElement("p");
        row.className = "row";
        const b = document.createElement("button");
        b.type = "button";
        b.className = on ? "" : "ghost";
        b.textContent = on ? "Registered" : "Register to sell this";
        b.onclick = function () {
          C.togglePkg(sku.id).then(function () { renderPackages(); refresh(); });
        };
        row.appendChild(b);
        art.appendChild(h);
        art.appendChild(cut);
        art.appendChild(p);
        art.appendChild(row);
        box.appendChild(art);
      });
    }
    fill("home-skus");
    fill("pkg-list");
  }

  function money(n) { return "$" + Number(n || 0).toLocaleString(); }
  function fillDealSelect(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const rows = (C.deals() || []).filter(function (d) { return d.status !== "lost" && d.status !== "paid"; });
    const cur = sel.value;
    sel.innerHTML = "";
    if (!rows.length) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "No open deal — send a collect pack first";
      sel.appendChild(o);
      return;
    }
    rows.forEach(function (d) {
      const o = document.createElement("option");
      o.value = d.id;
      o.textContent = (d.shop || "Shop") + " \u00b7 " + money(d.price) + " \u00b7 " + d.status;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }
  function renderPay() {
    const el = document.getElementById("pay-stats");
    const box = document.getElementById("deal-list");
    const rows = C.deals() || [];
    let pending = 0, paid = 0, reported = 0;
    rows.forEach(function (d) {
      if (d.status === "paid") paid += Number(d.cut || 0);
      else if (d.status === "lost") return;
      else pending += Number(d.cut || 0);
      if (d.status === "reported") reported += Number(d.cut || 0);
    });
    if (el) {
      el.textContent = money(paid) + " on your account / issued \u00b7 " + money(pending)
        + " still with the shop \u00b7 " + money(reported)
        + " reported, office checking \u00b7 we issue your 20% after VOIDD’s payment clears.";
    }
    if (box) {
      box.innerHTML = "";
      if (!rows.length) {
        const p = document.createElement("p");
        p.className = "note";
        p.textContent = "No deals yet. Copy a collect pack, then invoice the shop from Pay.";
        box.appendChild(p);
      } else {
        const table = document.createElement("table");
        table.innerHTML = "<thead><tr><th>Shop</th><th>Due VOIDD</th><th>Your 20%</th><th>Status</th><th></th></tr></thead>";
        const tb = document.createElement("tbody");
        rows.forEach(function (d) {
          const tr = document.createElement("tr");
          function td(t) { const x = document.createElement("td"); x.textContent = t; tr.appendChild(x); }
          td(d.shop || d.url || "");
          td(money(d.price));
          td(money(d.cut));
          td({
            pending: "Waiting on shop",
            invoiced: "Invoice sent",
            reported: "You reported pay — office checking",
            on_account: "On your account — issued when it clears",
            issued: "Issued to you",
            paid: "On your account — issued when it clears",
            lost: "Walked",
          }[d.status] || d.status);
          const act = document.createElement("td");
          if (d.status !== "paid" && d.status !== "lost") {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "ghost";
            b.textContent = "Lost";
            b.onclick = function () { C.dealLost(d.id).then(function () { C.pullDeals().then(refresh); }); };
            act.appendChild(b);
          }
          tr.appendChild(act);
          tb.appendChild(tr);
        });
        table.appendChild(tb);
        box.appendChild(table);
      }
    }
    fillDealSelect("inv-deal");
    fillDealSelect("pay-deal");
  }

  function refresh() {
    renderNow();
    renderShops();
    renderQualify();
    fillScripts();
    renderPackages();
    renderPay();
  }

  function copyText(id) {
    const el = document.getElementById(id);
    if (!el) return Promise.resolve();
    return navigator.clipboard.writeText(el.innerText || el.textContent || "");
  }

  function bindDesk(root) {
    root = root || document;
    needAuth();
    const s = session() || {};
    const who = document.getElementById("who-line");
    if (who && s.name) who.textContent = s.name + " \u00b7 " + (s.phone || "") + " \u00b7 20% after they pay";
    const go = document.getElementById("go-desk");
    if (go) go.onclick = function () { showPane("today"); };
    if (s && s.confirmed === false) {
      const ban = document.getElementById("confirm-banner");
      if (ban) {
        ban.classList.remove("hid");
        if (s.mail_sent === false) {
          ban.insertBefore(document.createTextNode(" Mail was not sent from this PC. "), ban.firstChild);
        }
      }
    }
    const copyConf = document.getElementById("copy-confirm");
    if (copyConf) copyConf.onclick = function () {
      const link = (s.confirm_link || "").trim();
      if (!link) { C.resendConfirm().then(function (j) { navigator.clipboard.writeText((j && j.confirm_link) || ""); copyConf.textContent = "Copied"; }); return; }
      navigator.clipboard.writeText(link.indexOf("http") === 0 ? link : (location.origin + (link[0] === "/" ? link : "/" + link))).then(function () { copyConf.textContent = "Copied"; });
    };
    const resend = document.getElementById("resend-confirm");
    if (resend) resend.onclick = function () {
      C.resendConfirm().then(function () { resend.textContent = "New link ready — copy it"; });
    };
    const out = document.getElementById("out");
    if (out) out.onclick = function (e) {
      e.preventDefault();
      clear();
      location.replace(LOCAL ? "/join" : "index.html");
    };
    const reach = document.getElementById("reach");
    if (reach) {
      reach.innerHTML = wrenHtml();
      bindWren(reach);
    }
    const menus = document.getElementById("menus");
    if (menus) menus.onclick = function (e) {
      const b = e.target.closest("button[data-pane]");
      if (!b) return;
      showPane(b.getAttribute("data-pane"));
    };
    const add = document.getElementById("add-shop");
    if (add) add.onsubmit = function (e) {
      e.preventDefault();
      const url = (document.getElementById("shop-url").value || "").trim();
      if (!url) { alert("Live URL cannot be blank. No site = walk."); return; }
      addShop({
        name: document.getElementById("shop-name").value,
        url: url,
        phone: document.getElementById("shop-phone").value,
        note: document.getElementById("shop-note").value,
      });
      document.getElementById("add-shop").reset();
      refresh();
      showPane("qualify");
    };
    root.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.onclick = function () {
        const id = btn.getAttribute("data-copy");
        copyText(id).then(function () { btn.textContent = "Copied"; });
      };
    });
    const copyCollect = document.getElementById("copyCollect");
    if (copyCollect) copyCollect.onclick = function () {
      const lines = [];
      for (let i = 1; i <= 11; i++) {
        const v = (document.getElementById("f" + i).value || "").trim();
        lines.push(i + ". " + v);
      }
      if (!(document.getElementById("f1").value || "").trim()) {
        alert("URL cannot be blank.");
        return;
      }
      const t = "VOIDD collect pack\nCloser: " + you() + "\n" + lines.join("\n") + "\nVisitor is never told they are booked.";
      const outEl = document.getElementById("collect-out");
      outEl.textContent = t;
      outEl.classList.remove("hid");
      navigator.clipboard.writeText(t);
      document.getElementById("smsPack").href = "sms:" + TEL + "?body=" + encodeURIComponent(t);
      copyCollect.textContent = "Copied \u00b7 text the office";
      const shop = currentShop();
      if (shop) patchShop(shop.id, { stage: "collect" });
      C.addDeal({
        shop: (document.getElementById("f2").value || (shop && shop.name) || ""),
        url: document.getElementById("f1").value,
        sku: (C.hasPkg("7500") || true) ? "7500" : "7500",
      }).then(function () { C.pullDeals().then(refresh); });
    };
    const markSent = document.getElementById("markSent");
    if (markSent) markSent.onclick = function () {
      const shop = currentShop();
      if (shop) {
        patchShop(shop.id, { stage: "sent" });
        C.addDeal({ shop: shop.name, url: shop.url, sku: "7500" }).then(function () {
          setCurrent("");
          C.pullDeals().then(function () { refresh(); showPane("pay"); });
        });
        return;
      }
      refresh();
      showPane("today");
    };
    const invMail = document.getElementById("inv-mail");
    if (invMail) invMail.onclick = function () {
      const id = document.getElementById("inv-deal").value;
      const em = (document.getElementById("inv-email").value || "").trim();
      const deal = (C.deals() || []).filter(function (d) { return String(d.id) === String(id); })[0];
      if (!deal) { alert("Send a collect pack first."); return; }
      if (em.indexOf("@") < 0) { alert("Shop email."); return; }
      const body = C.invoiceText(Object.assign({}, deal, { shop_email: em }));
      document.getElementById("inv-out").textContent = body;
      document.getElementById("inv-out").classList.remove("hid");
      C.markInvoiced(deal.id, em).then(function () { C.pullDeals().then(refresh); });
      location.href = "mailto:" + encodeURIComponent(em)
        + "?subject=" + encodeURIComponent("Invoice — VOIDD Labs $" + deal.price)
        + "&body=" + encodeURIComponent(body);
    };
    const invCopy = document.getElementById("inv-copy");
    if (invCopy) invCopy.onclick = function () {
      const id = document.getElementById("inv-deal").value;
      const deal = (C.deals() || []).filter(function (d) { return String(d.id) === String(id); })[0];
      if (!deal) return;
      const body = C.invoiceText(deal);
      document.getElementById("inv-out").textContent = body;
      document.getElementById("inv-out").classList.remove("hid");
      navigator.clipboard.writeText(body).then(function () { invCopy.textContent = "Copied"; });
    };
    const payRep = document.getElementById("pay-report");
    if (payRep) payRep.onclick = function () {
      const err = document.getElementById("pay-report-err");
      err.textContent = "";
      const id = document.getElementById("pay-deal").value;
      C.reportPay(
        id,
        document.getElementById("pay-method").value,
        document.getElementById("pay-amt").value,
        document.getElementById("pay-ref").value,
      ).then(function (j) {
        if (j && j.ok === false) { err.textContent = j.error || "Could not report."; return; }
        C.pullDeals().then(refresh);
        payRep.textContent = "Reported — office confirms";
      });
    };
    C.pullDeals().then(refresh);
    loadPack().then(function (p) {
      const pitch = document.getElementById("pitch");
      const pitchEs = document.getElementById("pitchEs");
      if (pitch) pitch.textContent = p.pitch || pitch.textContent;
      if (pitchEs) pitchEs.textContent = p.pitchEs || pitchEs.textContent;
      const list = document.getElementById("list");
      const find = document.getElementById("find");
      if (list && find) {
        function render() {
          const q = (find.value || "").toLowerCase();
          list.innerHTML = "";
          let n = 0;
          (p.items || []).forEach(function (it) {
            if (q && (it.q + " " + it.a).toLowerCase().indexOf(q) < 0) return;
            n++;
            const a = document.createElement("article");
            a.className = "card";
            a.innerHTML = "<p><b></b></p><p></p>";
            a.querySelector("b").textContent = it.q;
            a.querySelectorAll("p")[1].textContent = it.a;
            list.appendChild(a);
          });
          const count = document.getElementById("count");
          if (count) count.textContent = n + " answers";
        }
        find.oninput = render;
        render();
      }
    });
    refresh();
    const hash = (location.hash || "").replace("#", "");
    showPane(PANES.indexOf(hash) >= 0 ? hash : "home");
  }

  C.bindDesk = bindDesk;
  C.showPane = showPane;
  C.nextMove = nextMove;
})(window);
