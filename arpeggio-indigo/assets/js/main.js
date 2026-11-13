/* =========================================================
   ARPEGGIO indigo — main.js
   素のJavaScriptのみ（ライブラリ不使用）
   ========================================================= */
(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 読み込み演出 ---------- */
  function ready() { body.classList.add('is-ready'); }
  if (reduce) { ready(); }
  else {
    var heroImg = document.querySelector('.hero__slide img');
    var done = false;
    var go = function () { if (done) return; done = true; requestAnimationFrame(ready); };
    if (heroImg && !heroImg.complete) {
      heroImg.addEventListener('load', go, { once: true });
      heroImg.addEventListener('error', go, { once: true });
      setTimeout(go, 2500); // 画像が遅くても演出は始める
    } else { go(); }
  }

  /* ---------- FV スライドショー（6秒ごと／4秒でクロスフェード＋ズームアウト） ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll('.hero__slide'));
  if (slides.length) {
    slides[0].classList.add('is-active');
    if (!reduce && slides.length > 1) {
      var cur = 0;
      var timer = null;
      var next = function () {
        var prev = slides[cur];
        cur = (cur + 1) % slides.length;
        slides.forEach(function (s) { s.classList.remove('is-prev'); });
        prev.classList.remove('is-active');
        prev.classList.add('is-prev');
        var s = slides[cur];
        void s.offsetWidth; // アニメーションを再始動
        s.classList.add('is-active');
      };
      var start = function () { if (!timer) timer = setInterval(next, 6000); };
      var stop = function () { clearInterval(timer); timer = null; };
      // 画面外・タブ非表示のときは止める
      var hero = document.querySelector('.hero');
      if ('IntersectionObserver' in window && hero) {
        new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(hero);
      } else { start(); }
      document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    }
  }

  /* ---------- スクロールで浮かび上がる ---------- */
  var rvEls = document.querySelectorAll('.rv, .rv--up, .rv--btn, .rv--section');
  if (reduce || !('IntersectionObserver' in window)) {
    rvEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    rvEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 写真の横流し：速さを一定に（約13px/秒）、画面外では停止 ---------- */
  document.querySelectorAll('.marquee').forEach(function (mq) {
    var set = mq.querySelector('.marquee__set');
    var setDur = function () {
      if (!set) return;
      var w = set.getBoundingClientRect().width;
      if (w > 0) mq.style.setProperty('--marquee-dur', Math.round(w / 13.3) + 's');
    };
    setDur();
    window.addEventListener('resize', setDur);
    window.addEventListener('load', setDur);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        mq.classList.toggle('is-paused', !es[0].isIntersecting);
      }).observe(mq);
    }
  });

  /* ---------- 章：写真と文章が画面の上下端に近づくと薄くなる（不透明度のみ・軽量） ---------- */
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter__img, .chapter__body'));
  if (chapters.length && !reduce && 'IntersectionObserver' in window) {
    var visible = new Set();
    var ticking = false;
    var headerPad = parseInt(getComputedStyle(doc).getPropertyValue('--header-h'), 10) || 80;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      var edge = vh * 0.22; // 上下22%の範囲でフェード
      visible.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var topIn = Math.min(1, Math.max(0, (vh - r.top) / edge));             // 下端から入ってくる
        var botIn = Math.min(1, Math.max(0, (r.bottom - headerPad) / edge));    // 上端（ヘッダー下）へ抜ける
        el.style.opacity = Math.min(topIn, botIn).toFixed(3);
      });
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    var chapterIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      onScroll();
    });
    chapters.forEach(function (c) { chapterIO.observe(c); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* ---------- ヘッダー：暗い写真の上では白文字に ---------- */
  var darkEls = document.querySelectorAll('[data-dark]');
  if (darkEls.length && 'IntersectionObserver' in window) {
    var onDark = new Set();
    var hh = function () { return parseInt(getComputedStyle(doc).getPropertyValue('--header-h'), 10) || 80; };
    var setupDarkIO = function () {
      var h = hh();
      return new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? onDark.add(e.target) : onDark.delete(e.target); });
        body.classList.toggle('is-on-dark', onDark.size > 0);
      }, { rootMargin: '0px 0px -' + (window.innerHeight - h / 2) + 'px 0px' });
    };
    var darkIO = setupDarkIO();
    darkEls.forEach(function (el) { darkIO.observe(el); });
  }

  /* ---------- 左の縦ナビ：現在地 ---------- */
  var navLinks = document.querySelectorAll('.sidenav a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    navLinks.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t) map[t.id] = a; });
    var navIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.remove('is-current'); });
          if (map[e.target.id]) map[e.target.id].classList.add('is-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { navIO.observe(document.getElementById(id)); });
  }

  /* ---------- ハンバーガーメニュー ---------- */
  var drawer = document.getElementById('drawer');
  var openBtn = document.querySelector('.burger');
  if (drawer && openBtn) {
    var lastFocus = null;
    var focusables = function () { return drawer.querySelectorAll('a[href], button'); };
    var open = function () {
      lastFocus = document.activeElement;
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
      body.classList.add('is-locked');
      setTimeout(function () { var f = drawer.querySelector('.drawer__close'); if (f) f.focus(); }, 50);
    };
    var close = function () {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
      body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    };
    openBtn.addEventListener('click', open);
    drawer.querySelectorAll('[data-close]').forEach(function (el) { el.addEventListener('click', close); });
    drawer.querySelectorAll('.drawer__nav a, .drawer__cta').forEach(function (a) {
      a.addEventListener('click', function () { if (a.getAttribute('href').indexOf('#') !== -1) close(); });
    });
    document.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        var f = focusables(); var first = f[0]; var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- 仕上げの動き（2026.11.13）：本体サイト ARPEGGIO と作法をそろえる ----------
     ・章の見出し（STORY など）が下から静かにせり上がる
     ・トップの写真は、スクロールすると奥へ、言葉は上へ抜けていく
     ・大きな写真の帯は、スクロールよりゆっくり動く（奥行き）
     ・縦書きの一文が、一文字ずつ灯る
     ・表の上の罫線が、左からすっと引かれる
     ・画面のいちばん上に、読み進めた分だけ伸びる細い線
     「動きを減らす」設定の端末では、どれも動かない */
  if (!reduce && 'IntersectionObserver' in window) {
    doc.classList.add('fx');
    var clamp01 = function (v) { return Math.min(1, Math.max(0, v)); };

    document.querySelectorAll('.sec-head__en').forEach(function (el) {
      var inner = document.createElement('span');
      inner.className = 'line-in';
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
      el.classList.add('line');
    });

    var drawIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-drawn'); drawIO.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.lore, .spec, .facts, .news').forEach(function (el) {
      el.classList.add('draw-line');
      drawIO.observe(el);
    });

    var bar = document.createElement('span');
    bar.className = 'read-progress';
    bar.setAttribute('aria-hidden', 'true');
    body.appendChild(bar);

    // 縦書きの一文：読み上げ用の文はそのまま残し、見た目だけ一文字ずつに分ける
    var scrubs = Array.prototype.slice.call(document.querySelectorAll('.story__title')).map(function (el) {
      var visual = document.createElement('span');
      var label = document.createElement('span');
      var count = 0;
      visual.setAttribute('aria-hidden', 'true');
      Array.prototype.slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) { visual.appendChild(node.cloneNode(true)); return; }
        Array.from(node.textContent).forEach(function (ch) {
          var span = document.createElement('span');
          span.className = 'scrub-char';
          span.style.setProperty('--i', count);
          span.textContent = ch;
          visual.appendChild(span);
          count += 1;
        });
      });
      label.className = 'sr-only';
      label.textContent = el.textContent;
      el.textContent = '';
      el.appendChild(label);
      el.appendChild(visual);
      return { el: el, count: count };
    });

    var heroEl = document.querySelector('.hero');
    var bands = Array.prototype.slice.call(document.querySelectorAll('.interlude, .banner'));
    var floats = Array.prototype.slice.call(document.querySelectorAll('.chapter__img'));
    var deskQuery = window.matchMedia('(min-width: 769px)');
    var fxTick = false;
    var fxUpdate = function () {
      fxTick = false;
      var vh = window.innerHeight;
      var max = doc.scrollHeight - vh;
      bar.style.setProperty('--read', max > 0 ? clamp01(window.scrollY / max).toFixed(4) : 0);
      if (heroEl) {
        var hr = heroEl.getBoundingClientRect();
        if (hr.bottom > 0) heroEl.style.setProperty('--hero-p', clamp01(-hr.top / hr.height).toFixed(3));
      }
      bands.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        // 帯が画面を通り抜けるあいだに、中の写真が -1 〜 1 の範囲で動く
        var t = ((r.top + r.height / 2) - vh / 2) / ((vh + r.height) / 2);
        el.style.setProperty('--par', Math.max(-1, Math.min(1, t)).toFixed(3));
      });
      floats.forEach(function (el, i) {
        if (!deskQuery.matches) { if (el.style.translate) el.style.translate = ''; return; }
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var t = ((r.top + r.height / 2) - vh / 2) / vh;
        el.style.translate = '0 ' + (Math.max(-1, Math.min(1, t)) * (i % 2 ? 30 : 20)).toFixed(1) + 'px';
      });
      scrubs.forEach(function (sc) {
        var r = sc.el.getBoundingClientRect();
        if (r.top > vh || r.bottom < 0) return;
        var p = clamp01((vh * 0.92 - r.top) / (vh * 0.5));
        sc.el.style.setProperty('--lit', (p * (sc.count + 3) - 1).toFixed(2));
      });
    };
    var fxQueue = function () { if (!fxTick) { fxTick = true; requestAnimationFrame(fxUpdate); } };
    fxUpdate();
    window.addEventListener('scroll', fxQueue, { passive: true });
    window.addEventListener('resize', fxQueue);
    window.addEventListener('load', fxQueue, { once: true });
  }

  /* ---------- フッターの年 ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
