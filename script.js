(function () {
  "use strict";
  var C = window.CONFIG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Personalise (URL params > saved in browser > config.js) ----------
  var PKEY = "bday-profile-v1";
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime()); }
  function sanitise(p) {
    var out = {};
    if (p.name && String(p.name).trim()) out.name = String(p.name).trim().slice(0, 24);
    var a = parseInt(p.age, 10);
    if (a >= 1 && a <= 120) out.age = a;
    if (p.date && validDate(p.date)) out.birthday = p.date;
    return out;
  }
  function readProfile() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(PKEY)) || {}; } catch (e) { /* ignore */ }
    var q = new URLSearchParams(window.location.search);
    var fromUrl = { name: q.get("name"), age: q.get("age"), date: q.get("date") };
    return Object.assign({}, sanitise({ name: saved.name, age: saved.age, date: saved.birthday }), sanitise(fromUrl));
  }
  Object.assign(C, readProfile());

  function personalise() {
    document.title = "Happy Birthday " + C.name + "! \u2728";
    $$(".js-name").forEach(function (e) { e.textContent = C.name; });
    $(".js-name-big").textContent = C.name;
    $("#age").textContent = C.age;
    $("#portrait-img").alt = "Portrait of " + C.name;
    $(".js-portrait-cap").textContent = C.name + ", the Birthday Wizard";
    renderWish();
    countdown();
  }

  // ---------- Portrait (placeholder shown until the photo file exists) ----------
  (function () {
    if (!C.photo) return;
    var img = $("#portrait-img");
    img.addEventListener("load", function () {
      img.hidden = false; $("#portrait-ph").hidden = true;
    });
    img.src = C.photo;
  })();

  // ---------- Canvas: starfield + wand trail + fireworks ----------
  var canvas = $("#magic"), ctx = canvas.getContext("2d");
  var W, H, stars = [], sparks = [], rockets = [];
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = [];
    var n = Math.min(160, Math.floor(W * H / 9000));
    for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, p: Math.random() * 6.28, s: Math.random() * .03 + .01 });
  }
  window.addEventListener("resize", resize); resize();

  function burst(x, y, count, hue) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * 6.283, v = Math.random() * 5 + 1.5;
      sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: Math.random() * .015 + .008, hue: hue === undefined ? Math.random() * 360 : hue + Math.random() * 30 - 15, g: .06 });
    }
  }
  function fireworks() {
    for (var i = 0; i < 7; i++) {
      (function (i) {
        setTimeout(function () {
          burst(Math.random() * W * .8 + W * .1, Math.random() * H * .5 + H * .1, 90);
        }, i * 280);
      })(i);
    }
  }

  window.addEventListener("pointermove", function (e) {
    if (reduceMotion) return;
    for (var i = 0; i < 2; i++) sparks.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - .5) * 1.4, vy: (Math.random() - .5) * 1.4 + .3, life: 1, decay: .03, hue: 40 + Math.random() * 20, g: .02 });
  });
  window.addEventListener("pointerdown", function (e) { burst(e.clientX, e.clientY, 18, 45); });

  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i]; s.p += s.s;
      ctx.globalAlpha = .4 + Math.sin(s.p) * .4;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    for (var j = sparks.length - 1; j >= 0; j--) {
      var p = sparks[j];
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .985; p.life -= p.decay;
      if (p.life <= 0) { sparks.splice(j, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = "hsl(" + p.hue + ",100%,60%)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * p.life + .5, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    if (window.drawConfetti) window.drawConfetti();
    requestAnimationFrame(frame);
  }
  frame();

  // ---------- Owl-post letter ----------
  document.body.classList.add("locked");
  $("#open-letter").addEventListener("click", function () {
    $("#letter").classList.add("opening");
    fireworks();
    setTimeout(function () {
      $("#letter-overlay").classList.add("gone");
      document.body.classList.remove("locked");
    }, 900);
  });

  // ---------- Typewriter ----------
  var tw = $("#typewriter"), ti = 0, ci = 0, deleting = false;
  function type() {
    var text = C.taglines[ti];
    if (!deleting) {
      ci++; tw.textContent = text.slice(0, ci);
      if (ci === text.length) { deleting = true; return setTimeout(type, 2400); }
      setTimeout(type, 38);
    } else {
      ci -= 2; if (ci < 0) ci = 0;
      tw.textContent = text.slice(0, ci);
      if (ci === 0) { deleting = false; ti = (ti + 1) % C.taglines.length; return setTimeout(type, 400); }
      setTimeout(type, 16);
    }
  }
  type();

  // ---------- Countdown / birthday status ----------
  function pad(n) { return String(n).padStart(2, "0"); }
  function countdown() {
    var parts = C.birthday.split("-").map(Number);
    var now = new Date();
    var target = new Date(parts[0], parts[1] - 1, parts[2]);
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var el = $("#countdown");
    if (todayStart.getTime() === target.getTime()) {
      el.textContent = "\u2728 IT IS HAPPENING RIGHT NOW. Today is the day! \u2728";
      return;
    }
    // next occurrence
    while (target < todayStart) target.setFullYear(target.getFullYear() + 1);
    var diff = target - now;
    var d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
    el.textContent = "Next birthday feast in " + d + "d " + pad(h) + "h " + pad(m) + "m " + pad(s) + "s";
  }
  setInterval(countdown, 1000);

  // ---------- Sorting Hat quiz ----------
  var houses = {
    gryffindor: ["\uD83E\uDD81", "Gryffindor", "#d3a625", "Brave, bold, and will absolutely start a group-chat argument with a strong opinion."],
    ravenclaw: ["\uD83E\uDD85", "Ravenclaw", "#5f8fe0", "Wise and witty. Has a spreadsheet for splitting the birthday cake fairly."],
    hufflepuff: ["\uD83E\uDDA1", "Hufflepuff", "#f2d13c", "Loyal, kind, and the reason there are always snacks. The heart of the friend group."],
    slytherin: ["\uD83D\uDC0D", "Slytherin", "#3fb06b", "Ambitious and cunning. Will be running the world by Thursday. Please remain friends."]
  };
  var qi = 0, score = {};
  var quiz = $("#quiz");
  function renderQ() {
    if (qi >= C.quiz.length) return renderResult();
    var q = C.quiz[qi];
    quiz.innerHTML = "";
    var prog = document.createElement("div"); prog.className = "quiz-progress"; prog.textContent = "Question " + (qi + 1) + " of " + C.quiz.length;
    var h = document.createElement("div"); h.className = "quiz-q"; h.textContent = q.q;
    var opts = document.createElement("div"); opts.className = "quiz-opts";
    q.a.forEach(function (o) {
      var b = document.createElement("button"); b.textContent = o[0];
      b.addEventListener("click", function () { score[o[1]] = (score[o[1]] || 0) + 1; qi++; renderQ(); });
      opts.appendChild(b);
    });
    quiz.appendChild(prog); quiz.appendChild(h); quiz.appendChild(opts);
  }
  function renderResult() {
    var best = Object.keys(houses).sort(function (a, b) { return (score[b] || 0) - (score[a] || 0); })[0];
    var hs = houses[best];
    quiz.innerHTML = "";
    var box = document.createElement("div"); box.className = "result";
    var em = document.createElement("span"); em.className = "house-emoji"; em.textContent = hs[0];
    var h3 = document.createElement("h3"); h3.textContent = hs[1] + "!"; h3.style.color = hs[2];
    var p = document.createElement("p"); p.textContent = "\u201C" + hs[3] + "\u201D";
    var b = document.createElement("button"); b.className = "btn"; b.textContent = "Sort again";
    b.addEventListener("click", function () { qi = 0; score = {}; renderQ(); });
    box.appendChild(em); box.appendChild(h3); box.appendChild(p); box.appendChild(b);
    quiz.appendChild(box);
    burst(window.innerWidth / 2, window.innerHeight / 2, 80);
  }
  renderQ();

  // ---------- Cake ----------
  var candlesEl = $("#candles"), msg = $("#cake-msg");
  var N = 5;
  for (var c = 0; c < N; c++) {
    var cd = document.createElement("div"); cd.className = "candle";
    cd.innerHTML = '<div class="flame"></div>';
    cd.addEventListener("click", (function (el) { return function () { el.classList.toggle("out"); check(); }; })(cd));
    candlesEl.appendChild(cd);
  }
  function check() {
    var lit = $$(".candle:not(.out)").length;
    if (lit === 0) {
      msg.textContent = "Wish made! (" + C.age + " candles were a fire hazard, so we used " + N + ".)";
      document.body.classList.add("dark");
      setTimeout(function () { document.body.classList.remove("dark"); fireworks(); }, 1200);
    } else if (lit === N) {
      msg.textContent = "The candles burn bright.";
    } else {
      msg.textContent = lit + " candle" + (lit > 1 ? "s" : "") + " still burning\u2026";
    }
  }
  $("#nox").addEventListener("click", function () {
    $$(".candle").forEach(function (el, i) { setTimeout(function () { el.classList.add("out"); check(); }, i * 150); });
  });
  $("#incendio").addEventListener("click", function () {
    $$(".candle").forEach(function (el, i) { setTimeout(function () { el.classList.remove("out"); check(); }, i * 150); });
  });
  $("#fireworks").addEventListener("click", fireworks);

  // ---------- Report card ----------
  var gradesEl = $("#grades");
  C.grades.forEach(function (g) {
    var d = document.createElement("div"); d.className = "grade";
    var s = document.createElement("div"); s.className = "grade-subject"; s.textContent = g[0];
    var m = document.createElement("div"); m.className = "grade-mark"; m.textContent = g[1];
    var bar = document.createElement("div"); bar.className = "bar"; var i = document.createElement("i"); i.dataset.w = g[2]; bar.appendChild(i);
    var n = document.createElement("div"); n.className = "grade-note"; n.textContent = g[3];
    d.appendChild(s); d.appendChild(m); d.appendChild(bar); d.appendChild(n);
    gradesEl.appendChild(d);
  });

  // ---------- Spells ----------
  var sb = $("#spell-buttons"), so = $("#spell-output");
  C.spells.forEach(function (sp) {
    var b = document.createElement("button"); b.className = "btn ghost"; b.textContent = sp[0];
    b.addEventListener("click", function (e) {
      so.textContent = sp[1];
      so.classList.remove("pop"); void so.offsetWidth; so.classList.add("pop");
      var r = b.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 40);
    });
    sb.appendChild(b);
  });

  // ---------- Wishes (localStorage) ----------
  var KEY = "bday-wishes-v1";
  var list = $("#wish-list");
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function addCard(w, animate) {
    var d = document.createElement("div"); d.className = "wish";
    d.style.setProperty("--r", (Math.random() * 4 - 2).toFixed(1) + "deg");
    if (!animate) d.style.animation = "none";
    var p = document.createElement("p"); p.textContent = w[1];
    var b = document.createElement("b"); b.textContent = "\u2014 " + w[0];
    d.appendChild(p); d.appendChild(b);
    list.insertBefore(d, list.firstChild);
  }
  C.wishesSeed.slice().reverse().forEach(function (w) { addCard(w, false); });
  load().forEach(function (w) { addCard(w, false); });
  $("#wish-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var w = [$("#wish-from").value.trim(), $("#wish-text").value.trim()];
    if (!w[0] || !w[1]) return;
    var all = load(); all.push(w);
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (err) { /* private mode */ }
    addCard(w, true);
    this.reset();
    burst(window.innerWidth / 2, window.innerHeight / 2, 60, 45);
  });

  // ---------- Birthday wishes gallery ----------
  var tone = "all", wi = 0, wishPool = [];
  function pool() {
    wishPool = C.wishes.filter(function (w) { return tone === "all" || w[0] === tone; });
    if (wi >= wishPool.length) wi = 0;
  }
  function wishText(w) { return w[1].replace(/\{name\}/g, C.name); }
  function renderWish() {
    pool();
    var w = wishPool[wi]; if (!w) return;
    var card = $("#wish-card");
    $("#wish-quote").textContent = "\u201C" + wishText(w) + "\u201D";
    $("#wish-by").textContent = "\u2014 " + w[2];
    $("#wish-count").textContent = (wi + 1) + " / " + wishPool.length;
    card.classList.remove("flip"); void card.offsetWidth; card.classList.add("flip");
  }
  function go(d) { pool(); wi = (wi + d + wishPool.length) % wishPool.length; renderWish(); }
  $("#wish-next").addEventListener("click", function () { go(1); });
  $("#wish-prev").addEventListener("click", function () { go(-1); });
  $("#wish-random").addEventListener("click", function () {
    pool(); wi = Math.floor(Math.random() * wishPool.length); renderWish();
    burst(window.innerWidth / 2, window.innerHeight / 2, 50);
  });
  $$(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      $$(".tab").forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active"); tone = t.dataset.tone; wi = 0; renderWish();
    });
  });
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt("Copy this:", text); });
    } else { window.prompt("Copy this:", text); }
  }
  $("#wish-copy").addEventListener("click", function () {
    var b = this, old = b.textContent;
    copyText(wishText(wishPool[wi]) + " \u2014 " + wishPool[wi][2], function () {
      b.textContent = "Copied \u2713"; setTimeout(function () { b.textContent = old; }, 1500);
    });
  });
  setInterval(function () {
    if (!document.hidden && !$("#blessings:hover") && !document.activeElement.closest("#blessings")) go(1);
  }, 9000);

  // ---------- Confetti & balloons ----------
  var confetti = [];
  var COLORS = ["#e6b655", "#d3a625", "#c01616", "#5f8fe0", "#3fb06b", "#f2d13c", "#ffffff"];
  function confettiBurst() {
    if (reduceMotion) { fireworks(); return; }
    for (var i = 0; i < 160; i++) {
      confetti.push({ x: Math.random() * W, y: -20 - Math.random() * H * .4, vx: Math.random() * 4 - 2, vy: Math.random() * 3 + 2, w: Math.random() * 8 + 5, h: Math.random() * 5 + 3, rot: Math.random() * 6.28, vr: Math.random() * .3 - .15, c: COLORS[i % COLORS.length] });
    }
  }
  $("#confetti-btn").addEventListener("click", confettiBurst);
  window.drawConfetti = function () {
    for (var i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i];
      c.x += c.vx + Math.sin(c.y / 40); c.y += c.vy; c.rot += c.vr;
      if (c.y > H + 20) { confetti.splice(i, 1); continue; }
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
    }
  };
  var bl = $("#balloons");
  if (!reduceMotion) {
    for (var bi = 0; bi < 9; bi++) {
      var bn = document.createElement("i");
      bn.style.left = (4 + bi * 11 + Math.random() * 5) + "%";
      bn.style.setProperty("--c", COLORS[bi % 6]);
      bn.style.animationDuration = (18 + Math.random() * 14) + "s";
      bn.style.animationDelay = (-Math.random() * 25) + "s";
      bn.addEventListener("click", function () { var r = this.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 30); this.style.visibility = "hidden"; });
      bl.appendChild(bn);
    }
  }

  // ---------- Customise panel ----------
  var panel = $("#cfg-panel"), tog = $("#cfg-toggle"), cs = $("#cfg-status");
  function fillCfg() {
    $("#cfg-name").value = C.name; $("#cfg-age").value = C.age; $("#cfg-date").value = C.birthday;
  }
  function readCfg() {
    return sanitise({ name: $("#cfg-name").value, age: $("#cfg-age").value, date: $("#cfg-date").value });
  }
  tog.addEventListener("click", function () {
    var open = panel.hidden;
    panel.hidden = !open; tog.setAttribute("aria-expanded", String(open));
    if (open) { fillCfg(); $("#cfg-name").focus(); }
  });
  $("#cfg-apply").addEventListener("click", function () {
    var p = readCfg();
    if (!p.name) { cs.textContent = "Please enter a name."; return; }
    Object.assign(C, p);
    try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
    personalise();
    cs.textContent = "Done! Name updated everywhere.";
    confettiBurst(); fireworks();
  });
  $("#cfg-copy").addEventListener("click", function () {
    var p = readCfg(); if (!p.name) { cs.textContent = "Please enter a name."; return; }
    var u = new URL(window.location.href);
    u.search = ""; u.hash = "";
    u.searchParams.set("name", p.name);
    if (p.age) u.searchParams.set("age", p.age);
    if (p.birthday) u.searchParams.set("date", p.birthday);
    copyText(u.toString(), function () { cs.textContent = "Share link copied! Send it to the whole gang."; });
  });

  // ---------- Scroll reveal ----------
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("visible");
      $$(".bar i", en.target).forEach(function (i) { i.style.width = i.dataset.w + "%"; });
      io.unobserve(en.target);
    });
  }, { threshold: .15 });
  $$(".panel").forEach(function (p) { io.observe(p); });

  personalise();

  // ---------- Easter egg: type "lumos" / "nox" ----------
  var buf = "";
  window.addEventListener("keydown", function (e) {
    if (e.target.matches("input, textarea")) return;
    buf = (buf + e.key.toLowerCase()).slice(-8);
    if (buf.slice(-5) === "lumos") { document.body.style.filter = "brightness(1.3)"; }
    if (buf.slice(-3) === "nox") { document.body.style.filter = "brightness(.55)"; }
    if (buf.slice(-8) === "alohomor") { fireworks(); }
  });
})();
