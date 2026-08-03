/* =========================================================
   Magnus Ahmad — portfolio behaviour
   Single source of truth is the markup: every panel carries
   its own date, accent, city and label as data attributes.
   ========================================================= */
(function () {
  "use strict";

  var root       = document.documentElement;
  var track      = document.querySelector(".track");
  var panels     = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  var axis       = document.querySelector(".axis");
  var axisFill   = document.querySelector(".axis-fill");
  var axisHead   = document.querySelector(".axis-head");
  var readMonth  = document.querySelector(".readout .mo");
  var readYear   = document.querySelector(".readout .yr");
  var countEl    = document.querySelector(".count");
  var placeEl    = document.querySelector(".place .txt");
  var glow       = document.querySelector(".bg-glow");
  var skylines   = Array.prototype.slice.call(document.querySelectorAll(".skyline"));
  var arrowPrev  = document.querySelector(".arrow.prev");
  var arrowNext  = document.querySelector(".arrow.next");
  var geo        = document.querySelector(".geo");
  var viewBtns   = Array.prototype.slice.call(document.querySelectorAll(".views button"));
  var views      = Array.prototype.slice.call(document.querySelectorAll(".view"));

  var MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var narrow  = function () { return window.matchMedia("(max-width: 860px)").matches; };

  /* ---------- panel model ---------- */
  var model = panels.map(function (el, i) {
    var accent = (el.dataset.accent || "232,180,92").split(",").map(Number);
    return {
      el: el,
      i: i,
      time: Date.parse(el.dataset.date + "T00:00:00Z"),
      accent: accent,
      city: el.dataset.city || "",
      place: el.dataset.place || "",
      label: el.dataset.label || "",
      geo: el.dataset.geo || "",
      year: el.dataset.year || "",
      glow: el.dataset.glow || "50% 22%"
    };
  });

  var last = model.length - 1;
  var active = -1;
  var activeCity = null;

  /* ---------- rail nodes ---------- */
  model.forEach(function (m, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "node";
    b.style.left = (last ? (i / last) * 100 : 0) + "%";
    b.setAttribute("aria-label", "Go to " + (m.label || "chapter " + (i + 1)) + ", " + m.year);
    b.innerHTML = '<span class="node-label"><b>' + m.year + "</b> &nbsp;" + m.label + "</span>";
    b.addEventListener("click", function () { goTo(i); });
    axis.appendChild(b);
  });
  var nodes = Array.prototype.slice.call(axis.querySelectorAll(".node"));

  /* ---------- helpers ---------- */
  function lerp(a, b, t) { return a + (b - a) * t; }

  function mixRGB(a, b, t) {
    return [
      Math.round(lerp(a[0], b[0], t)),
      Math.round(lerp(a[1], b[1], t)),
      Math.round(lerp(a[2], b[2], t))
    ];
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  /* ---------- the one render function ---------- */
  function render(pos) {
    pos = clamp(pos, 0, last);

    var lo = Math.min(Math.floor(pos), last);
    var hi = Math.min(lo + 1, last);
    var t = pos - lo;

    /* accent — glides between chapters */
    var rgb = mixRGB(model[lo].accent, model[hi].accent, t);
    root.style.setProperty("--accent-rgb", rgb.join(", "));
    root.style.setProperty("--accent", "rgb(" + rgb.join(",") + ")");

    /* ambient glow drift */
    var g1 = model[lo].glow.split(" ");
    var g2 = model[hi].glow.split(" ");
    glow.style.setProperty("--glow-x", lerp(parseFloat(g1[0]), parseFloat(g2[0]), t) + "%");
    glow.style.setProperty("--glow-y", lerp(parseFloat(g1[1]), parseFloat(g2[1]), t) + "%");

    /* date readout — real interpolated time */
    var d = new Date(lerp(model[lo].time, model[hi].time, t));
    readMonth.textContent = MONTHS[d.getUTCMonth()];
    readYear.textContent = d.getUTCFullYear();

    /* axis */
    var pct = last ? (pos / last) * 100 : 0;
    axisFill.style.width = pct + "%";
    axisHead.style.left = pct + "%";

    /* active chapter */
    var next = clamp(Math.round(pos), 0, last);
    if (next !== active) {
      active = next;
      var m = model[active];

      panels.forEach(function (p, i) { p.classList.toggle("live", i === active); });
      nodes.forEach(function (n, i) {
        n.setAttribute("aria-current", i === active ? "true" : "false");
      });

      countEl.innerHTML = "<b>" + pad(active + 1) + "</b> / " + pad(model.length);
      if (placeEl) placeEl.textContent = m.place;
      if (geo) geo.innerHTML = m.geo ? "<b>" + m.geo.split("|")[0] + "</b> " + m.geo.split("|")[1] : "";

      if (m.city && m.city !== activeCity) {
        activeCity = m.city;
        skylines.forEach(function (s) { s.classList.toggle("on", s.dataset.city === m.city); });
      }

      if (arrowPrev) arrowPrev.disabled = active === 0;
      if (arrowNext) arrowNext.disabled = active === last;
    }
  }

  /* ---------- drivers ---------- */
  var ticking = false;

  function schedule() {
    /* rAF never fires in a background tab — stay in sync without it */
    if (document.hidden) { render(measure()); return; }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      render(measure());
    });
  }

  /* centre of chapter i in the track's scroll coordinates */
  function centreOf(i) {
    return panels[i].offsetLeft + panels[i].offsetWidth / 2;
  }

  function measure() {
    if (narrow()) {
      /* vertical flow: where the viewport's reading line sits in the stack */
      var mid = window.innerHeight * 0.45;
      for (var i = 0; i < panels.length; i++) {
        var r = panels[i].getBoundingClientRect();
        if (mid < r.top) return i;
        if (mid < r.bottom) return i + clamp((mid - r.top) / (r.height || 1), 0, 0.999);
      }
      return last;
    }
    /* the chapters are a continuous ribbon, so read off the viewport centre */
    var c = track.scrollLeft + track.clientWidth / 2;
    var a = centreOf(0);
    if (c <= a) return 0;
    for (var j = 0; j < last; j++) {
      var b = centreOf(j + 1);
      if (c < b) return j + (c - a) / (b - a || 1);
      a = b;
    }
    return last;
  }

  function centreTarget(i) {
    var max = Math.max(track.scrollWidth - track.clientWidth, 0);
    return clamp(centreOf(i) - track.clientWidth / 2, 0, max);
  }

  /* Native smooth scrolling is silently dropped in some engines, so the
     glide between chapters is driven by hand. */
  var anim = 0;
  var watchdog = 0;
  var finishAnim = null;

  function stopAnim() {
    clearTimeout(watchdog);
    watchdog = 0;
    if (!anim) return;
    cancelAnimationFrame(anim);
    anim = 0;
    finishAnim = null;
  }

  function glide(read, write, target) {
    stopAnim();
    var from = read();
    var delta = target - from;
    if (reduced || Math.abs(delta) < 2) { write(target); return; }
    var t0 = performance.now();
    var dur = Math.min(280 + Math.abs(delta) * 0.14, 640);

    /* rAF is frozen in a hidden tab — land on the target and clean up */
    finishAnim = function () { write(target); stopAnim(); };

    anim = requestAnimationFrame(function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      write(from + delta * (1 - Math.pow(1 - p, 3)));      /* easeOutCubic */
      if (p < 1) { anim = requestAnimationFrame(tick); }
      else { clearTimeout(watchdog); anim = 0; finishAnim = null; }
    });

    /* rAF is frozen in a background tab; setTimeout still fires, so this
       guarantees we always land on the target and re-enable snapping */
    watchdog = setTimeout(function () { if (finishAnim) finishAnim(); }, dur + 400);

    if (document.hidden) finishAnim();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && finishAnim) finishAnim();
    schedule();
  });

  /* Run once layout has settled. A freshly un-hidden track reports a bogus
     clientWidth in the same tick, and rAF alone never fires in a background
     tab — so whichever of the two arrives first wins. */
  function afterLayout(fn) {
    var done = false;
    var run = function () { if (done) return; done = true; fn(); };
    requestAnimationFrame(run);
    setTimeout(run, 34);
  }

  function goTo(i) {
    i = clamp(i, 0, last);
    var switching = show("timeline");

    var jump = function () {
      if (narrow()) {
        var y = panels[i].getBoundingClientRect().top + window.scrollY - 64;
        glide(function () { return window.scrollY; },
              function (v) { window.scrollTo(0, v); }, y);
      } else {
        glide(function () { return track.scrollLeft; },
              function (v) { track.scrollLeft = v; }, centreTarget(i));
      }
    };

    if (switching) afterLayout(jump); else jump();
  }

  track.addEventListener("scroll", schedule, { passive: true });
  ["pointerdown", "touchstart"].forEach(function (evt) {
    track.addEventListener(evt, stopAnim, { passive: true });
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", function () {
    stopAnim();
    if (!narrow()) track.scrollLeft = centreTarget(Math.max(active, 0));
    schedule();
  });

  /* a vertical wheel drives the ribbon horizontally, 1:1 and uninterrupted */
  track.addEventListener("wheel", function (e) {
    if (narrow()) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;   /* native horizontal scroll */
    e.preventDefault();
    stopAnim();
    track.scrollLeft += e.deltaY;
  }, { passive: false });

  /* keyboard */
  window.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    var map = { ArrowRight: 1, ArrowLeft: -1, PageDown: 1, PageUp: -1 };
    if (e.key in map) { e.preventDefault(); goTo(active + map[e.key]); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(last); }
  });

  if (arrowPrev) arrowPrev.addEventListener("click", function () { goTo(active - 1); });
  if (arrowNext) arrowNext.addEventListener("click", function () { goTo(active + 1); });

  /* ---------- views ---------- */
  var view = "overview";

  function show(name) {
    if (name === view) return false;
    view = name;
    root.classList.toggle("mode-overview", name === "overview");
    stopAnim();
    viewBtns.forEach(function (b) {
      b.setAttribute("aria-selected", String(b.dataset.view === name));
    });
    views.forEach(function (v) {
      var on = v.dataset.view === name;
      v.classList.toggle("on", on);
      if (on) v.removeAttribute("hidden"); else v.setAttribute("hidden", "");
    });
    /* the track was display:none — restore the chapter we left off on
       (a goTo that triggered this switch queues its own jump right after) */
    if (name === "timeline" && !narrow()) {
      afterLayout(function () { track.scrollLeft = centreTarget(active); });
    }
    return true;
  }

  viewBtns.forEach(function (b, i) {
    b.addEventListener("click", function () { show(b.dataset.view); });
    /* inside the tablist, arrows move between tabs rather than the timeline */
    b.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      e.stopPropagation();
      var nextBtn = viewBtns[(i + d + viewBtns.length) % viewBtns.length];
      nextBtn.focus();
      show(nextBtn.dataset.view);
    });
  });

  document.querySelectorAll("[data-show]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      show(el.dataset.show);
    });
  });

  document.querySelectorAll("[data-goto]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      goTo(Number(el.dataset.goto));
    });
  });

  /* ---------- tile videos: load and play only while on screen ---------- */
  var videos = Array.prototype.slice.call(document.querySelectorAll(".tile-media video"));

  if (videos.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (!entry.isIntersecting) { v.pause(); return; }
        if (!v.src && v.dataset.src) {
          v.src = v.dataset.src;
          v.load();          /* preload="none" defers fetching until asked */
        }
        if (reduced) { v.controls = true; return; }
        var playing = v.play();
        if (playing && playing.catch) playing.catch(function () { v.controls = true; });
      });
    }, { threshold: 0.2 });
    videos.forEach(function (v) { io.observe(v); });
  } else {
    videos.forEach(function (v) {
      v.src = v.dataset.src;
      v.controls = true;
    });
  }

  /* ---------- boot ---------- */
  render(0);
  schedule();
})();
