(() => {
  'use strict';
  const menu = document.querySelector('.mobile-nav');
  if (menu) {
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) menu.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }
  if (!('IntersectionObserver' in window)) return;
  const links = document.querySelectorAll('.desktop-nav a[href^="#"]');
  const sections = [...links].map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach(link => {
        if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-20% 0px -45% 0px' });
  sections.forEach(section => observer.observe(section));
})();
