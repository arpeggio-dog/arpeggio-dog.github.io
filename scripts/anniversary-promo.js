(function () {
  'use strict';
  function shouldShow(now, expiresAt) {
    var expiry = Date.parse(expiresAt);
    return Number.isFinite(now) && Number.isFinite(expiry) && now < expiry;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { shouldShow:shouldShow };
  if (typeof document === 'undefined') return;
  var banner = document.getElementById('anniversary-promo');
  if (!banner) return;
  var timer;
  function update() {
    window.clearTimeout(timer);
    var now = Date.now();
    var expiry = banner.dataset.expiresAt;
    banner.hidden = !shouldShow(now, expiry);
    if (!banner.hidden) timer = window.setTimeout(update, Math.min(Date.parse(expiry) - now, 2147483647));
  }
  update();
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
}());
