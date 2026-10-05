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
})();
