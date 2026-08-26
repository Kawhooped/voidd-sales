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
    const words = String(q || "").toLowerCase().split(/\W+/).filter(function (w) { return w.length > 2; });
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
      return { ok: false, error: "That email already has an account. Log in."; };
    }
    const row = { name: body.name, phone: body.phone, email: body.email, at: Date.now(), confirmed: false };
    list.push(row);
    localStorage.setItem("voidd_closers", JSON.stringify(list));
    localStorage.setItem("voidd_pass_" + email, body.password);
    return { ok: true, name: row.name, phone: row.phone, email: row.email, confirmed: false };
  }
  function localLogin(body) {
    const email = (body.email || "").trim().toLowerCase();
    const saved = localStorage.getItem("voidd_pass_" + email);
    const list = JSON.parse(localStorage.getItem("voidd_closers") || "[]");
    const row = list.filter(function (c) { return (c.email || "").toLowerCase() === email; })[0];
    if (!row || saved !== body.password) return { ok: false, error: "Email or password. Use the one you created." };
    return { ok: true, name: row.name, phone: row.phone, email: row.email, confirmed: !!row.confirmed };
  }
  function signup(body) {
    if (!LOCAL) {
      const j = localSignup(body);
      if (j.ok) save(j);
      return Promise.resolve(j);
    }
    return post("/api/closer/signup", body).then(function (j) {
      if (j && j.ok) save({ name: j.name, phone: j.phone, email: j.email, token: j.token, confirmed: !!j.confirmed });
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
      if (j && j.ok) save({ name: j.name, phone: j.phone, email: j.email, token: j.token, confirmed: !!j.confirmed });
      return j;
    }).catch(function () {
      const j = localLogin(body);
      if (j.ok) save(j);
      return j;
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

  w.VOIDDCloser = {
    PHONE: PHONE, TEL: TEL, LOCAL: LOCAL, session: session, save: save, clear: clear,
    needAuth: needAuth, signup: signup, login: login, chat: chat,
    wrenHtml: wrenHtml, bindWren: bindWren, loadPack: loadPack,
    pack: function () { return pack; },
  };
})(window);
