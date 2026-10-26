/* Adapted from AO1's HowStack: site, fine-tuned model, local boundary, platform. */
(function () {
  "use strict";
  document.querySelectorAll(".sentry-demo").forEach(function (demo) {
    var controls = Array.from(demo.querySelectorAll("[data-step]"));
    var toggle = demo.querySelector(".sentry-toggle");
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var current = 0;
    var paused = false;
    var visible = false;
    var timer;

    function select(step) {
      current = step;
      demo.dataset.active = step;
      controls.forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.step) === step ? "true" : "false");
      });
    }

    function playback() {
      clearInterval(timer);
      demo.dataset.paused = String(paused || !visible || document.hidden || motion.matches);
      toggle.hidden = motion.matches;
      toggle.textContent = paused ? "Play animation" : "Pause animation";
      if (visible && !document.hidden && !paused && !motion.matches) {
        timer = setInterval(function () { select((current + 1) % 4); }, 3200);
      }
    }

    controls.forEach(function (button) {
      button.addEventListener("click", function () {
        paused = true;
        select(Number(button.dataset.step));
        playback();
      });
    });
    toggle.addEventListener("click", function () { paused = !paused; playback(); });
    document.addEventListener("visibilitychange", playback);
    motion.addEventListener("change", playback);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        playback();
      }, { threshold: 0.25 }).observe(demo);
    } else {
      visible = true;
    }
    select(0);
    playback();
  });
})();
