(function () {
  'use strict';

  var root = document.documentElement;
  var header = document.querySelector('header');
  var menuButton = document.querySelector('.menu-btn');
  var navigation = document.getElementById('gnav');
  var narrow = window.matchMedia('(max-width: 1100px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var controllers = [];
  var groups = [];
  root.classList.add('js');

  function watchMedia(query, listener) {
    if (query.addEventListener) query.addEventListener('change', listener);
    else if (query.addListener) query.addListener(listener);
  }

  function measureHeader() {
    if (header) {
      root.style.setProperty('--header-height', Math.ceil(header.getBoundingClientRect().height) + 'px');
    }
  }

  function setMenu(open, restoreFocus) {
    if (!menuButton || !navigation) return;
    open = Boolean(open && narrow.matches);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    navigation.classList.toggle('open', open);
    var unavailable = narrow.matches && !open;
    navigation.toggleAttribute('inert', unavailable);
    if (unavailable) navigation.setAttribute('aria-hidden', 'true');
    else navigation.removeAttribute('aria-hidden');
    if (!open && restoreFocus) menuButton.focus();
  }

  if (menuButton && navigation) {
    setMenu(false, false);
    menuButton.addEventListener('click', function () {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true', false);
    });
    navigation.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (!link) return;
      setMenu(false, false);
      if (narrow.matches && link.hash) {
        var section = document.getElementById(link.hash.slice(1));
        if (section) {
          // Keep keyboard focus in the destination after closing the disclosure.
          if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
          section.focus({ preventScroll: true });
        }
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        setMenu(false, true);
      }
    });
    document.addEventListener('pointerdown', function (event) {
      if (narrow.matches && header && !header.contains(event.target)) {
        setMenu(false, navigation.contains(document.activeElement));
      }
    });
    document.addEventListener('focusin', function (event) {
      if (narrow.matches && header && !header.contains(event.target)) setMenu(false, false);
    });
    watchMedia(narrow, function () {
      var focusWasInNavigation = navigation.contains(document.activeElement);
      setMenu(false, narrow.matches && focusWasInNavigation);
      measureHeader();
    });
  }

  measureHeader();
  window.addEventListener('resize', measureHeader, { passive: true });
  window.addEventListener('load', measureHeader, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureHeader);
  if ('ResizeObserver' in window && header) new ResizeObserver(measureHeader).observe(header);

  var scrollQueued = false;
  function updateScrollState() {
    scrollQueued = false;
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  updateScrollState();
  window.addEventListener('scroll', function () {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateScrollState);
    }
  }, { passive: true });

  function createSlideshow(box, interval, count) {
    if (!box) return null;
    var photos = Array.from(box.querySelectorAll('.photo'));
    if (!photos.length) return null;
    var dots = Array.from(box.querySelectorAll('.dots button[data-slide]'));
    var current = photos.findIndex(function (photo) { return photo.classList.contains('is-on'); });
    if (current < 0) current = 0;
    var visible = !('IntersectionObserver' in window);
    var paused = reducedMotion.matches;
    var timer = null;
    var pending = null;
    var failed = new Set();
    var onManual = function () {};

    function render() {
      if (box.id === 'heroSlides') {
        box.classList.toggle('is-exterior', photos[current].getAttribute('src').indexOf('exterior-entrance.webp') !== -1);
      }
      photos.forEach(function (photo, index) {
        photo.classList.toggle('is-on', index === current);
        photo.setAttribute('aria-hidden', String(index !== current));
      });
      dots.forEach(function (dot) {
        var selected = Number(dot.dataset.slide) === current;
        dot.classList.toggle('on', selected);
        if (selected) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (count) count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(photos.length).padStart(2, '0');
    }
    function mayRun() { return visible && !paused && !document.hidden && photos.length > 1; }
    function clearTimer() {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    }
    function cancelPending() {
      if (pending) pending.cancel();
    }
    function schedule() {
      clearTimer();
      if (mayRun() && !pending) timer = window.setTimeout(advance, interval);
    }
    function requestSlide(index, manual) {
      index = ((index % photos.length) + photos.length) % photos.length;
      if (manual) onManual();
      clearTimer();
      cancelPending();
      if (index === current) { schedule(); return; }
      var photo = photos[index];
      var timeout = null;
      var completed = false;
      function finish(loaded, cancelled) {
        if (completed) return;
        completed = true;
        photo.removeEventListener('load', loadedHandler);
        photo.removeEventListener('error', errorHandler);
        if (timeout !== null) window.clearTimeout(timeout);
        pending = null;
        if (!cancelled && !loaded) failed.add(index);
        if (loaded && !cancelled && (manual || mayRun())) {
          failed.delete(index);
          current = index;
          render();
        }
        if (!cancelled) schedule();
      }
      function loadedHandler() { finish(photo.naturalWidth > 0, false); }
      function errorHandler() { finish(false, false); }
      pending = { cancel: function () { finish(false, true); } };
      if (photo.tagName !== 'IMG') { finish(true, false); return; }
      if (photo.complete) { finish(photo.naturalWidth > 0, false); return; }
      photo.addEventListener('load', loadedHandler, { once: true });
      photo.addEventListener('error', errorHandler, { once: true });
      // Load only the requested next image; retain the current photo until it is ready.
      photo.loading = 'eager';
      timeout = window.setTimeout(function () { finish(false, false); }, 15000);
    }
    function advance() {
      timer = null;
      if (!mayRun() || pending) return;
      for (var offset = 1; offset < photos.length; offset += 1) {
        var next = (current + offset) % photos.length;
        if (!failed.has(next)) { requestSlide(next, false); return; }
      }
    }
    function refresh() {
      clearTimer();
      if (!mayRun()) cancelPending();
      else schedule();
    }

    render();
    dots.forEach(function (dot, dotIndex) {
      dot.addEventListener('click', function () { requestSlide(Number(dot.dataset.slide), true); });
      dot.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight') next = (dotIndex + 1) % dots.length;
        else if (event.key === 'ArrowLeft') next = (dotIndex - 1 + dots.length) % dots.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = dots.length - 1;
        else return;
        event.preventDefault();
        dots[next].focus();
        requestSlide(Number(dots[next].dataset.slide), true);
      });
    });
    box.querySelectorAll('[data-slideshow-prev]').forEach(function (button) {
      button.addEventListener('click', function () { requestSlide(current - 1, true); });
    });
    box.querySelectorAll('[data-slideshow-next]').forEach(function (button) {
      button.addEventListener('click', function () { requestSlide(current + 1, true); });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { visible = entry.isIntersecting; refresh(); });
      }, { threshold: 0 }).observe(box);
    }
    var controller = {
      setPaused: function (value) { paused = value; refresh(); },
      setManualHandler: function (handler) { onManual = handler; },
      refresh: refresh,
      photoCount: photos.length
    };
    controllers.push(controller);
    refresh();
    return controller;
  }

  function connectToggle(button, slides, label, shortLabel) {
    slides = slides.filter(function (slide) { return slide && slide.photoCount > 1; });
    if (!slides.length) return;
    var paused = reducedMotion.matches;
    function apply(value) {
      paused = value;
      slides.forEach(function (slide) { slide.setPaused(paused); });
      if (button) {
        var action = paused ? '再開' : '一時停止';
        button.textContent = shortLabel ? action : '写真の自動切り替えを' + action;
        button.setAttribute('aria-label', label + 'の自動切り替えを' + action);
        button.setAttribute('aria-pressed', String(paused));
      }
    }
    slides.forEach(function (slide) { slide.setManualHandler(function () { apply(true); }); });
    if (button) {
      button.hidden = false;
      button.addEventListener('click', function () { apply(!paused); });
    }
    groups.push({ pause: function () { apply(true); } });
    apply(paused);
  }

  var hero = createSlideshow(document.getElementById('heroSlides'), 6500, document.getElementById('heroCount'));
  connectToggle(document.getElementById('heroPause'), [hero], 'トップ写真', true);
  var seasons = Array.from(document.querySelectorAll('#seasonSlides .ss')).map(function (box, index) {
    return createSlideshow(box, 6200 + index * 450);
  });
  connectToggle(document.getElementById('seasonPause'), seasons, '季節の写真', false);
  document.addEventListener('visibilitychange', function () {
    controllers.forEach(function (controller) { controller.refresh(); });
  });
  watchMedia(reducedMotion, function () {
    if (reducedMotion.matches) groups.forEach(function (group) { group.pause(); });
  });

  /* 店舗紹介動画：大きな再生ボタンと、再生／一時停止・音声の切り替え */
  var movie = document.getElementById('shopMovie');
  if (movie) {
    var frame = movie.closest('.shop-movie-frame');
    var bigPlay = document.querySelector('[data-movie-play]');
    var toggle = document.querySelector('[data-movie-toggle]');
    var mute = document.querySelector('[data-movie-mute]');
    function syncMovie() {
      var playing = !movie.paused && !movie.ended;
      if (toggle) {
        toggle.querySelector('.movie-icon').className = 'movie-icon ' + (playing ? 'is-pause' : 'is-play');
        toggle.querySelector('.movie-btn-text').textContent = playing ? '一時停止' : (movie.currentTime > 0 && !movie.ended ? '続きを再生' : '再生する');
        toggle.setAttribute('aria-label', playing ? '動画を一時停止する' : '動画を再生する');
      }
      if (mute) {
        var silent = movie.muted || movie.volume === 0;
        mute.querySelector('.movie-icon').className = 'movie-icon ' + (silent ? 'is-muted' : 'is-sound');
        mute.querySelector('.movie-btn-text').textContent = silent ? '音声 オフ' : '音声 オン';
        mute.setAttribute('aria-pressed', String(silent));
        mute.setAttribute('aria-label', silent ? '音声をオンにする（現在オフ）' : '音声をオフにする（現在オン）');
      }
      if (frame && (playing || movie.currentTime > 0)) frame.classList.add('is-started');
    }
    function playMovie() {
      var result = movie.play();
      if (result && result.catch) result.catch(function () {});
    }
    if (bigPlay) bigPlay.addEventListener('click', function () { playMovie(); movie.focus({ preventScroll: true }); });
    if (toggle) toggle.addEventListener('click', function () { if (movie.paused || movie.ended) playMovie(); else movie.pause(); });
    if (mute) mute.addEventListener('click', function () {
      if (movie.muted || movie.volume === 0) { movie.muted = false; if (movie.volume === 0) movie.volume = 1; }
      else movie.muted = true;
    });
    ['play', 'pause', 'ended', 'volumechange', 'timeupdate', 'loadedmetadata'].forEach(function (type) {
      movie.addEventListener(type, syncMovie);
    });
    syncMovie();
  }

  /* 動きの演出：スクロールで現れる文字と写真、トップ写真の縮小、文字が順に灯る一文 */
  if (root.classList.contains('motion')) {
    var REVEAL = [
      '.visit-strip-inner > *', '.shop-movie-copy > *', '.shop-movie-figure', '.sec-head', '.concept .body > *',
      '.experience-head', '.point', '.cafe-copy > :not(.cafe-cups)', '.shop .body > *', '.levels-head',
      '.swatches figure', '.craft-caption', '.goods-head', '.goods figcaption', '.brands', '.season figure',
      '.photo-controls', '.info', '.oxygen .body', '.rules li', '.raiki-entry-copy > *', '.news-list > li',
      '.news-more', '.media-list li', '.access-intro', '.map-foot', '.press > *', '.sns a', '.page-back'
    ].join(',');
    var REVEAL_MEDIA = [
      '.concept-image img', '.cafe-image img', '.cafe-cups img', '.collection-image img', '.ai-gallery img',
      '.goods img', '.oxygen > img', '.raiki-entry-photo-crop', '.map-img', '.access-exterior img'
    ].join(',');
    var viewHeight = function () { return window.innerHeight || root.clientHeight; };
    var clamp = function (value) { return Math.min(1, Math.max(0, value)); };
    var inView = function (el) {
      var rect = el.getBoundingClientRect();
      return rect.top < viewHeight() && rect.bottom > 0;
    };

    var revealer = new IntersectionObserver(function (entries) {
      // 同時に現れたものは、少しずつ時間をずらして順番に
      entries.filter(function (entry) { return entry.isIntersecting; }).forEach(function (entry, index) {
        entry.target.style.transitionDelay = Math.min(index, 6) * 90 + 'ms';
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    function prepare(selector, className) {
      document.querySelectorAll(selector).forEach(function (el) {
        // 最初から見えているものと、すでに演出の付いた要素の中身は動かさない
        if (inView(el) || (el.parentElement && el.parentElement.closest('.reveal, .reveal-media'))) return;
        el.classList.add(className);
        revealer.observe(el);
      });
    }
    prepare(REVEAL_MEDIA, 'reveal-media');
    prepare(REVEAL, 'reveal');
    window.addEventListener('load', function () {
      // ページ内リンクで途中から開いた場合などに、見えている要素を取りこぼさない
      document.querySelectorAll('.reveal:not(.is-in), .reveal-media:not(.is-in)').forEach(function (el) {
        if (inView(el)) { el.classList.add('is-in'); revealer.unobserve(el); }
      });
    }, { once: true });

    var scrubs = Array.from(document.querySelectorAll('.experience-head > p:last-child, .craft-caption > p:last-child')).map(function (el) {
      var visual = document.createElement('span');
      var label = document.createElement('span');
      var count = 0;
      visual.setAttribute('aria-hidden', 'true');
      Array.from(el.childNodes).forEach(function (node) {
        if (node.nodeType !== 3) { visual.appendChild(node.cloneNode(true)); return; }
        Array.from(node.textContent).forEach(function (character) {
          var span = document.createElement('span');
          span.className = 'scrub-char';
          span.style.setProperty('--i', count);
          span.textContent = character;
          visual.appendChild(span);
          count += 1;
        });
      });
      label.className = 'visually-hidden';
      label.textContent = el.textContent;
      el.textContent = '';
      el.append(label, visual);
      el.classList.add('scrub');
      return { el: el, count: count };
    });

    var heroBox = document.querySelector('.hero');
    var heroMedia = document.querySelector('.hero-media');
    var motionQueued = false;
    function updateMotion() {
      motionQueued = false;
      if (!root.classList.contains('motion')) return;
      var height = viewHeight();
      if (heroBox && heroMedia) {
        var heroRect = heroBox.getBoundingClientRect();
        if (heroRect.bottom > 0) heroMedia.style.setProperty('--hero-p', clamp(-heroRect.top / heroRect.height).toFixed(3));
      }
      scrubs.forEach(function (scrub) {
        var top = scrub.el.getBoundingClientRect().top;
        if (top > height || top < -height) return;
        // 画面の下の方に入ってから中ほどに来るまでに、一文字ずつ灯る
        var progress = clamp((height * 0.9 - top) / (height * 0.4));
        scrub.el.style.setProperty('--lit', (progress * (scrub.count + 3) - 1).toFixed(2));
      });
    }
    function queueMotion() {
      if (!motionQueued) {
        motionQueued = true;
        window.requestAnimationFrame(updateMotion);
      }
    }
    updateMotion();
    window.addEventListener('scroll', queueMotion, { passive: true });
    window.addEventListener('resize', queueMotion, { passive: true });
    // 途中で「視差効果を減らす」に切り替えられたら、すべて止めて普通の表示に戻す
    watchMedia(reducedMotion, function () { if (reducedMotion.matches) root.classList.remove('motion'); });
  }
})();
