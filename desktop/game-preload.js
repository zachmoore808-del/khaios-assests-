const { ipcRenderer } = require('electron');
window.addEventListener('DOMContentLoaded', function () {
  try {
    var b = document.createElement('button');
    b.textContent = '\u2197 open in real browser';
    b.title = 'If the game will not stream here, open it in your default browser';
    b.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:2147483647;font:11px monospace;letter-spacing:.5px;background:rgba(6,16,38,0.92);color:#7fd6ff;border:1px solid rgba(63,169,255,0.6);border-radius:7px;padding:6px 10px;cursor:pointer;opacity:0.55;transition:opacity .15s';
    b.onmouseenter = function () { b.style.opacity = '1'; };
    b.onmouseleave = function () { b.style.opacity = '0.55'; };
    b.onclick = function () { ipcRenderer.send('game:openExternal', location.href); };
    document.body.appendChild(b);
  } catch (e) {}
});
