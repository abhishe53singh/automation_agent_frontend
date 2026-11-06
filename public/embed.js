/*! Automation Agent chat widget loader. Usage:
 * <script src="https://APP_ORIGIN/embed.js" data-widget="wk_..." data-position="right"
 *   data-color="#2563eb" async></script>
 */
(function () {
  "use strict";
  var w = window;
  var d = document;
  if (w.__agentWidgetLoaded) return;

  var script = d.currentScript;
  if (!script) {
    var all = d.querySelectorAll("script[data-widget][src*='embed.js']");
    script = all[all.length - 1];
  }
  if (!script) return;

  var key = script.getAttribute("data-widget") || "";
  if (!/^[A-Za-z0-9_-]{3,128}$/.test(key)) {
    console.warn("[agent-widget] missing or invalid data-widget key");
    return;
  }
  var appOrigin;
  try {
    appOrigin = new URL(script.src, d.baseURI).origin;
  } catch (e) {
    return;
  }
  w.__agentWidgetLoaded = true;

  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var color = script.getAttribute("data-color") || "";
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) color = "#2563eb";

  function textColor(hex) {
    var h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var l = [0, 2, 4].map(function (i) {
      var c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    var lum = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
    return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.0623 ? "#ffffff" : "#111827";
  }

  var Z = "2147483000";
  var css =
    ".aw-btn{position:fixed;bottom:20px;" +
    side +
    ":20px;z-index:" +
    Z +
    ";width:56px;height:56px;border:0;border-radius:50%;cursor:pointer;display:flex;" +
    "align-items:center;justify-content:center;background:" +
    color +
    ";color:" +
    textColor(color) +
    ";box-shadow:0 6px 20px rgba(0,0,0,.25);transition:transform .15s}" +
    ".aw-btn:hover{transform:scale(1.05)}.aw-btn:focus-visible{outline:3px solid " +
    color +
    ";outline-offset:3px}.aw-btn svg{width:26px;height:26px}" +
    ".aw-panel{position:fixed;bottom:88px;" +
    side +
    ":20px;z-index:" +
    Z +
    ";width:380px;height:600px;max-width:calc(100vw - 40px);max-height:calc(100vh - 108px);" +
    "border:0;border-radius:14px;overflow:hidden;background:#fff;" +
    "box-shadow:0 12px 40px rgba(0,0,0,.3);display:none}" +
    ".aw-panel.aw-open{display:block}.aw-panel iframe{width:100%;height:100%;border:0;display:block}" +
    "@media (max-width:640px){.aw-panel{inset:0;width:100%;height:100%;max-width:none;" +
    "max-height:none;border-radius:0}.aw-open~.aw-btn{display:none}}" +
    "@media (prefers-reduced-motion:reduce){.aw-btn{transition:none}}";

  var ICON_CHAT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  var root, panel, button, frame;
  var open = false;

  function mount() {
    root = d.createElement("div");
    root.setAttribute("data-agent-widget", "");
    var style = d.createElement("style");
    style.textContent = css;
    panel = d.createElement("div");
    panel.className = "aw-panel";
    panel.id = "aw-panel-" + key;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Chat");
    button = d.createElement("button");
    button.type = "button";
    button.className = "aw-btn";
    button.setAttribute("aria-controls", panel.id);
    button.addEventListener("click", function () {
      setOpen(!open);
    });
    root.appendChild(style);
    root.appendChild(panel);
    root.appendChild(button);
    d.body.appendChild(root);
    render();
  }

  function render() {
    button.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
    button.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    button.setAttribute("aria-expanded", String(open));
    panel.className = "aw-panel" + (open ? " aw-open" : "");
  }

  function setOpen(next) {
    if (next && !frame) {
      // Created lazily: no conversation starts until the visitor opens the chat.
      frame = d.createElement("iframe");
      frame.src =
        appOrigin +
        "/embed/" +
        encodeURIComponent(key) +
        "?origin=" +
        encodeURIComponent(w.location.origin);
      frame.title = "Chat";
      frame.setAttribute("allow", "clipboard-write");
      frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      panel.appendChild(frame);
    }
    open = next;
    render();
    if (open) frame.focus();
    else button.focus();
  }

  w.addEventListener("message", function (event) {
    if (event.origin !== appOrigin || !frame || event.source !== frame.contentWindow) return;
    if (event.data && event.data.type === "agent-widget:close") setOpen(false);
  });

  d.addEventListener("keydown", function (event) {
    if (open && event.key === "Escape") setOpen(false);
  });

  if (d.body) mount();
  else d.addEventListener("DOMContentLoaded", mount);
})();
