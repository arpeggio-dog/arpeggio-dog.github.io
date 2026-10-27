'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sourcePath = path.join(__dirname, '../scripts/anniversary-promo.js');
const promo = fs.existsSync(sourcePath) ? require(sourcePath) : {};
const expiry = '2026-11-30T00:00:00+09:00';

test('the anniversary promotion is visible through November 29 in Japan and hidden at midnight', () => {
  assert.equal(typeof promo.shouldShow, 'function');
  assert.equal(promo.shouldShow(Date.parse('2026-10-27T12:00:00+09:00'), expiry), true);
  assert.equal(promo.shouldShow(Date.parse('2026-11-29T23:59:59.999+09:00'), expiry), true);
  assert.equal(promo.shouldShow(Date.parse('2026-11-29T15:00:00Z'), expiry), false);
  assert.equal(promo.shouldShow(Date.parse('2026-12-01T00:00:00-05:00'), expiry), false);
});

test('missing or invalid expiry information cannot leave an old event promotion visible', () => {
  assert.equal(promo.shouldShow(Date.now(), ''), false);
  assert.equal(promo.shouldShow(Date.now(), 'invalid'), false);
  assert.equal(promo.shouldShow(NaN, expiry), false);
});

test('an open page also hides the promotion at the expiry boundary and after resuming', () => {
  assert.ok(fs.existsSync(sourcePath), 'Promotion script must exist');
  let now = Date.parse('2026-11-29T23:59:59+09:00');
  const banner = {hidden:true, dataset:{expiresAt:expiry}};
  const listeners = {};
  let scheduled;
  const fakeDate = class extends Date { static now() { return now; } };
  vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), {
    Date:fakeDate,
    document:{getElementById:()=>banner,addEventListener:(name,callback)=>{listeners[name]=callback;}},
    window:{setTimeout:(callback,delay)=>{scheduled={callback,delay};return 1;},clearTimeout:()=>{},addEventListener:(name,callback)=>{listeners[name]=callback;}}
  });
  assert.equal(banner.hidden, false);
  assert.equal(scheduled.delay, 1000);
  now += 1000;
  scheduled.callback();
  assert.equal(banner.hidden, true);
  banner.hidden = false;
  listeners.visibilitychange();
  assert.equal(banner.hidden, true);
  banner.hidden = false;
  listeners.pageshow();
  assert.equal(banner.hidden, true);
});
