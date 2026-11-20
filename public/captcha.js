/*! Automation Agent captcha loader (self-hosted, no third-party service).
 *
 * 1. In your form:
 *      <div class="aa-captcha" data-sitekey="cs_..."></div>
 *      <script src="https://APP_ORIGIN/captcha.js" async></script>
 *    When solved, a hidden input  name="aa-captcha-token"  is added to the
 *    form (rename it with data-input-name="..."). Optional data-callback /
 *    data-expired-callback name global functions called with the token.
 * 2. On your server, POST {secret, response: <token>} (JSON or form) to
 *      https://APP_ORIGIN/api/public/captcha/siteverify
 *    and accept the form only when the reply has "success": true.
 *    Tokens are single use and expire after ~2 minutes.
 *
 * JS API: window.AACaptcha.render(element), .reset(element), .getToken(element)
 */
(function () {
  "use strict";
  var w = window;
  var d = document;
  if (w.AACaptcha) return;

  var script = d.currentScript;
  if (!script) {
    var all = d.querySelectorAll("script[src*='captcha.js']");
    script = all[all.length - 1];
  }
  if (!script) return;

  var appOrigin;
  try {
    appOrigin = new URL(script.src, d.baseURI).origin;
  } catch {
    return;
  }

  var KEY_RE = /^cs_[A-Za-z0-9_-]{8,64}$/;
  var frames = {}; // frame id -> {el, iframe, input, token}
  var counter = 0;

  function pageOrigin() {
    var o = w.location.origin;
    return o && o !== "null" ? o : "";
  }

  function hiddenInput(el) {
    var name = el.getAttribute("data-input-name") || "aa-captcha-token";
    var form = el.closest ? el.closest("form") : null;
    var host = form || el;
    var input = host.querySelector("input[type=hidden][name='" + name + "']");
    if (!input) {
      input = d.createElement("input");
      input.type = "hidden";
      input.name = name;
      host.appendChild(input);
    }
    return input;
  }

  function callback(el, attr, arg) {
    var name = el.getAttribute(attr);
    if (name && typeof w[name] === "function") {
      try {
        w[name](arg);
      } catch (e) {
        if (w.console) w.console.error(e);
      }
    }
  }

  function render(el) {
    if (!el || el.getAttribute("data-aa-captcha-id")) return;
    var key = el.getAttribute("data-sitekey") || "";
    if (!KEY_RE.test(key)) {
      if (w.console) w.console.warn("[aa-captcha] missing or invalid data-sitekey");
      return;
    }
    var id = "aac" + ++counter + "_" + Math.random().toString(36).slice(2, 8);
    el.setAttribute("data-aa-captcha-id", id);

    var iframe = d.createElement("iframe");
    iframe.title = "Captcha";
    iframe.src =
      appOrigin +
      "/captcha/" +
      encodeURIComponent(key) +
      "?frame=" +
      id +
      "&origin=" +
      encodeURIComponent(pageOrigin());
    iframe.style.cssText =
      "width:100%;max-width:380px;height:150px;border:0;display:block;color-scheme:normal;background:transparent";
    iframe.setAttribute("scrolling", "no");
    el.appendChild(iframe);

    frames[id] = { el: el, iframe: iframe, input: hiddenInput(el), token: "" };
  }

  function entry(el) {
    var id = el && el.getAttribute ? el.getAttribute("data-aa-captcha-id") : null;
    return id ? frames[id] : null;
  }

  w.addEventListener("message", function (event) {
    if (event.origin !== appOrigin) return;
    var data = event.data;
    if (!data || data.type !== "aa-captcha" || !frames[data.frame]) return;
    var f = frames[data.frame];
    if (event.source !== f.iframe.contentWindow) return;

    if (data.event === "resize" && typeof data.height === "number") {
      f.iframe.style.height = Math.min(Math.max(data.height, 60), 400) + "px";
    } else if (data.event === "solved" && typeof data.token === "string") {
      f.token = data.token;
      f.input.value = data.token;
      callback(f.el, "data-callback", data.token);
    } else if (data.event === "expired") {
      f.token = "";
      f.input.value = "";
      callback(f.el, "data-expired-callback");
    }
  });

  function renderAll() {
    var nodes = d.querySelectorAll(".aa-captcha[data-sitekey]");
    for (var i = 0; i < nodes.length; i++) render(nodes[i]);
  }

  w.AACaptcha = {
    render: render,
    /** New image; clears the token (call after a failed submit). */
    reset: function (el) {
      var f = entry(el);
      if (!f) return;
      f.token = "";
      f.input.value = "";
      f.iframe.src = f.iframe.src;
    },
    getToken: function (el) {
      var f = entry(el);
      return f ? f.token : "";
    },
  };

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", renderAll);
  else renderAll();
})();
