/* Closer portal. Face only. They create the password. */
(function (w) {
  const KEY = "voidd_closer";
  const PHONE = "786-660-1778";
  const TEL = "+17866601778";
  const LOCAL = location.port === "8875";

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

  function localSignup(body) {
    const list = JSON.parse(localStorage.getItem("voidd_closers") || "[]");
    const email = (body.email || "").trim().toLowerCase();
    if (list.some(function (c) { return c.email === email; })) {
      return { ok: false, error: "That email already has an account. Log in." };
    }
    const row = { name: body.name, phone: body.phone, email: body.email, at: Date.now() };
    list.push(row);
    localStorage.setItem("voidd_closers", JSON.stringify(list));
    localStorage.setItem("voidd_pass_" + email, body.password);
    return { ok: true, name: row.name, phone: row.phone, email: row.email };
  }

  function localLogin(body) {
    const email = (body.email || "").trim().toLowerCase();
    const saved = localStorage.getItem("voidd_pass_" + email);
    const list = JSON.parse(localStorage.getItem("voidd_closers") || "[]");
    const row = list.filter(function (c) { return (c.email || "").toLowerCase() === email; })[0];
    if (!row || saved !== body.password) return { ok: false, error: "Email or password. Use the one you created." };
    return { ok: true, name: row.name, phone: row.phone, email: row.email };
  }

  function signup(body) {
    if (!LOCAL) {
      const j = localSignup(body);
      if (j.ok) save(j);
      return Promise.resolve(j);
    }
    return post("/api/closer/signup", body).then(function (j) {
      if (j && j.ok) save({ name: j.name, phone: j.phone, email: j.email, token: j.token });
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
      if (j && j.ok) save({ name: j.name, phone: j.phone, email: j.email, token: j.token });
      return j;
    }).catch(function () {
      const j = localLogin(body);
      if (j.ok) save(j);
      return j;
    });
  }

  function message(text) {
    const s = session() || {};
    const body = { name: s.name || "", phone: s.phone || "", email: s.email || "", text: text };
    if (!LOCAL) {
      const href = "sms:" + TEL + "?body=" + encodeURIComponent(text);
      location.href = href;
      return Promise.resolve({ ok: true, via: "sms" });
    }
    return post("/api/closer/message", body);
  }

  function contactHtml() {
    return '<div class="reach">' +
      '<p class="reach-kicker">Need Danny? One minute is the target. Call or text first.</p>' +
      '<div class="nums">' +
      '<a href="tel:' + TEL + '">Call 786-660-1778</a>' +
      '<a class="ghost" href="sms:' + TEL + '">Text</a>' +
      '</div>' +
      '<form id="reach-form">' +
      '<textarea id="reach-text" rows="2" placeholder="Your question or concern — we see this on INFORM."></textarea>' +
      '<button type="submit">Send to Danny</button>' +
      '</form>' +
      '<p id="reach-status" class="note"></p>' +
      '</div>';
  }

  function bindContact(root) {
    const form = root.querySelector("#reach-form");
    if (!form) return;
    form.onsubmit = function (e) {
      e.preventDefault();
      const t = (root.querySelector("#reach-text").value || "").trim();
      const st = root.querySelector("#reach-status");
      if (t.length < 2) { st.textContent = "Write the concern."; return; }
      st.textContent = "Sending…";
      message(t).then(function (j) {
        if (j && j.ok) {
          root.querySelector("#reach-text").value = "";
          st.textContent = j.via === "sms" ? "Opens your text app." : "Sent. Danny’s INFORM just updated.";
        } else st.textContent = (j && j.error) || "Text 786-660-1778.";
      }).catch(function () { st.textContent = "Text 786-660-1778."; });
    };
  }

  w.VOIDDCloser = {
    PHONE: PHONE, TEL: TEL, session: session, save: save, clear: clear,
    needAuth: needAuth, signup: signup, login: login, message: message,
    contactHtml: contactHtml, bindContact: bindContact,
  };
})(window);
