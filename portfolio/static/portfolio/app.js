/* ==========================================================================
   Sinan — portfolio interactions (all pages)
   Every feature checks for its elements first, and degrades gracefully when
   GSAP / Lenis fail to load or the visitor prefers reduced motion.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = document.documentElement;

  let DATA = {};
  try { DATA = JSON.parse($('#site-data').textContent); } catch (_) {}
  const PROFILE = DATA.profile || {};
  const PROJECTS = DATA.projects || [];
  const PAGE = root.dataset.page || 'home';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const hasGsap = Boolean(gsap && ScrollTrigger) && !reduceMotion;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} },
  };
  const local = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };

  // Current accent colours for canvas drawing (updated by the accent switcher)
  const theme = { a: '34, 197, 94', b: '163, 230, 53' };
  function readTheme() {
    const cs = getComputedStyle(root);
    theme.a = cs.getPropertyValue('--accent-rgb').trim() || theme.a;
    theme.b = cs.getPropertyValue('--accent-2-rgb').trim() || theme.b;
  }
  readTheme();

  /* ── Toast & clipboard ─────────────────────────────────────────────── */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }
  async function copyText(text, message = 'Copied to clipboard ✓') {
    try { await navigator.clipboard.writeText(text); toast(message); }
    catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(message); } catch (__) { toast('Copy failed — please copy manually'); }
      ta.remove();
    }
  }

  /* ── Smooth scroll ─────────────────────────────────────────────────── */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const lockScroll = (locked) => { if (lenis) (locked ? lenis.stop() : lenis.start()); };
  function scrollToTarget(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -90, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /* ── Page transitions + in-page anchors ────────────────────────────── */
  const wipe = $('.page-wipe');
  function revealPage() {
    if (!root.classList.contains('wipe-in')) return;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('wipe-reveal')));
    setTimeout(() => root.classList.remove('wipe-in', 'wipe-reveal'), 1100);
  }
  function navigate(url) {
    if (reduceMotion || !wipe) { location.href = url; return; }
    session.set('wipe', '1');
    wipe.classList.add('is-leaving');
    setTimeout(() => { location.href = url; }, 560);
  }
  window.addEventListener('pageshow', (e) => { if (e.persisted && wipe) wipe.classList.remove('is-leaving'); });

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || /^(mailto|tel):/.test(link.getAttribute('href'))) return;
    if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/api/')) return;
    const samePage = url.pathname === location.pathname;
    if (samePage && url.hash) {
      const target = $(url.hash);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      closeDialogs();
      scrollToTarget(target);
      history.replaceState(null, '', url.hash);
      return;
    }
    if (samePage && !url.hash) { e.preventDefault(); closeMenu(); scrollToTarget('#main'); return; }
    e.preventDefault();
    closeMenu();
    navigate(url.href);
  });

  // Arriving with a hash from another page: scroll after layout settles
  function scrollToInitialHash() {
    if (!location.hash) return;
    const target = $(location.hash);
    if (target) setTimeout(() => scrollToTarget(target), hasGsap ? 350 : 0);
  }

  /* ── Preloader (home, first visit per session) ─────────────────────── */
  const preloader = $('#preloader');
  function runPreloader(done) {
    const skip = !preloader || root.classList.contains('booted') || reduceMotion || getComputedStyle(preloader).display === 'none';
    if (skip) { if (preloader) preloader.remove(); session.set('booted', '1'); done(root.classList.contains('wipe-in') ? 0.35 : 0); return; }
    const lines = [
      ['initialising sinan.os v26.9', ''],
      ['loading neural weights', 'ok'],
      ['mounting 5 shipped projects', 'ok'],
      ['connecting AI twin → groq', 'ok'],
      ['calibrating curiosity', '100%'],
      ['ready. welcome.', ''],
    ];
    const box = $('#bootLines'), bar = $('#bootBar'), pct = $('#bootPct');
    const total = 1400, start = performance.now();
    let shown = 0, finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      session.set('booted', '1');
      root.classList.add('booted');
      if (hasGsap) gsap.to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut', onComplete: () => preloader.remove() });
      else preloader.remove();
      done(hasGsap ? 0.3 : 0);
    };
    const tick = (now) => {
      const p = clamp((now - start) / total, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (bar) bar.style.width = `${eased * 100}%`;
      if (pct) pct.textContent = `${Math.round(eased * 100)}%`;
      const target = Math.min(lines.length, Math.floor(p * lines.length) + 1);
      while (shown < target && box) {
        const [text, status] = lines[shown];
        const row = document.createElement('div');
        const dots = status ? ` ${'.'.repeat(Math.max(3, 30 - text.length))} ` : '';
        row.innerHTML = `&gt; ${esc(text)}${dots}${status ? `<span class="ok">${esc(status)}</span>` : ''}`;
        box.appendChild(row);
        shown += 1;
      }
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 220);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, 4500);
  }

  /* ── Intro animations ──────────────────────────────────────────────── */
  function intro(delay) {
    if (!hasGsap) return;
    const tl = gsap.timeline({ delay });
    if ($('[data-hero-word]')) tl.from('[data-hero-word]', { yPercent: 115, rotate: 6, duration: 1.3, ease: 'expo.out', stagger: 0.1 }, 0);
    $$('[data-split]').forEach((el) => {
      tl.from(splitWords(el), { yPercent: 115, rotate: 4, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, 0);
    });
    if ($('[data-hero]')) tl.from('[data-hero]', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.3);
  }

  /* ── Navigation ────────────────────────────────────────────────────── */
  const nav = $('#nav');
  const burger = $('#burger');
  const menu = $('#mobileMenu');
  function closeMenu() {
    if (!menu || !menu.classList.contains('open')) return;
    menu.classList.remove('open');
    root.classList.remove('menu-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    lockScroll(false);
  }
  function initNav() {
    if (burger && menu) {
      burger.addEventListener('click', () => {
        const open = !menu.classList.contains('open');
        menu.classList.toggle('open', open);
        root.classList.toggle('menu-open', open);
        menu.setAttribute('aria-hidden', String(!open));
        burger.setAttribute('aria-expanded', String(open));
        nav.classList.remove('is-hidden');
        lockScroll(open);
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    }

    // Sliding indicator
    const links = $('#navLinks');
    const indicator = links ? $('.nav-indicator', links) : null;
    const moveTo = (a) => {
      if (!indicator) return;
      if (!a) { indicator.style.opacity = '0'; return; }
      indicator.style.opacity = '1';
      indicator.style.width = `${a.offsetWidth}px`;
      indicator.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    const current = () => links && $('a.active', links);
    if (links) {
      $$('a', links).forEach((a) => a.addEventListener('pointerenter', () => moveTo(a)));
      links.addEventListener('pointerleave', () => moveTo(current()));
      window.addEventListener('resize', () => moveTo(current()));
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveTo(current()));
      moveTo(current());
    }

    // Active section (home only)
    if (links && PAGE === 'home' && 'IntersectionObserver' in window) {
      const map = {};
      $$('a[data-section]', links).forEach((a) => { const s = document.getElementById(a.dataset.section); if (s) map[a.dataset.section] = a; });
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $$('a', links).forEach((a) => a.classList.toggle('active', a === map[entry.target.id]));
          if (!links.matches(':hover')) moveTo(current());
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach((id) => io.observe(document.getElementById(id)));
      const hero = $('#top');
      if (hero) new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { $$('a', links).forEach((a) => a.classList.remove('active')); if (!links.matches(':hover')) moveTo(null); }
      }, { threshold: 0.5 }).observe(hero);
    }

    // Scroll state: shadow, hide on scroll down, show on scroll up
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 30);
      const menuOpen = menu && menu.classList.contains('open');
      if (!menuOpen) {
        if (y > 400 && y > lastY + 4) nav.classList.add('is-hidden');
        else if (y < lastY - 4 || y < 400) nav.classList.remove('is-hidden');
      }
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
  }

  /* ── Custom cursor & magnetic elements ─────────────────────────────── */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    root.classList.add('has-cursor');
    const ring = $('#cursor'), dot = $('#cursorDot'), label = $('#cursorLabel');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      root.classList.add('cursor-ready');
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    }, { passive: true });
    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      ring.classList.remove('is-hover', 'is-label', 'is-text');
      if (t.closest('input, textarea')) { ring.classList.add('is-text'); return; }
      const labelled = t.closest('[data-cursor]');
      if (labelled) { label.textContent = labelled.dataset.cursor; ring.classList.add('is-label'); return; }
      if (t.closest('a, button, [role="button"], summary')) ring.classList.add('is-hover');
    });
    document.addEventListener('pointerleave', () => { ring.style.opacity = 0; dot.style.opacity = 0; });
    document.addEventListener('pointerenter', () => { ring.style.opacity = ''; dot.style.opacity = ''; });
  }
  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.32}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ── Neural network canvas (hero / hire / 404) ─────────────────────── */
  function initNeural() {
    const canvas = $('#neural');
    if (!canvas) return;
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, nodes = [], pulses = [], running = true, raf = 0;
    const mouse = { x: -9999, y: -9999 };
    const LINK = 150;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 15000, 28, 95));
      nodes = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.6 + 0.8 }));
    };
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        if (Math.hypot(dx, dy) < 200) { n.x += dx * 0.006; n.y += dy * 0.006; }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d >= LINK) continue;
          const near = Math.hypot(mouse.x - (a.x + b.x) / 2, mouse.y - (a.y + b.y) / 2) < 180;
          ctx.strokeStyle = near ? `rgba(${theme.b},${(1 - d / LINK) * 0.6})` : `rgba(${theme.a},${(1 - d / LINK) * 0.16})`;
          ctx.lineWidth = near ? 1 : 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          if (pulses.length < 14 && Math.random() < 0.0009) pulses.push({ a, b, t: 0 });
        }
      }
      pulses = pulses.filter((p) => p.t <= 1);
      for (const p of pulses) {
        p.t += 0.018;
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = `rgba(${theme.b},0.95)`;
        ctx.shadowColor = `rgb(${theme.b})`; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      for (const n of nodes) {
        const near = Math.hypot(mouse.x - n.x, mouse.y - n.y) < 180;
        ctx.fillStyle = near ? `rgb(${theme.b})` : 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(n.x, n.y, near ? n.r + 0.8 : n.r, 0, Math.PI * 2); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(frame);
    };
    resize();
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(resize, 200); });
    host.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      host.style.setProperty('--hx', `${mouse.x}px`);
      host.style.setProperty('--hy', `${mouse.y}px`);
    }, { passive: true });
    host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    if (reduceMotion) { running = false; frame(); return; }
    const setRunning = (on) => {
      if (on === running) return;
      running = on;
      if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    };
    new IntersectionObserver(([e]) => setRunning(e.isIntersecting && !document.hidden)).observe(host);
    document.addEventListener('visibilitychange', () => setRunning(!document.hidden && host.getBoundingClientRect().bottom > 0));
    raf = requestAnimationFrame(frame);
  }

  /* ── Text effects ──────────────────────────────────────────────────── */
  function scrambleTo(el, text, speed = 1) {
    const glyphs = '!<>-_\\/[]{}—=+*^?#01';
    const from = el.textContent;
    const len = Math.max(from.length, text.length);
    const queue = Array.from({ length: len }, (_, i) => ({ from: from[i] || '', to: text[i] || '', start: Math.floor(Math.random() * 14 * speed), end: Math.floor(Math.random() * 14 * speed) + 14 * speed }));
    let frame = 0;
    return new Promise((resolve) => {
      const step = () => {
        let out = '', done = 0;
        for (const q of queue) {
          if (frame >= q.end) { done++; out += q.to; }
          else if (frame >= q.start) out += glyphs[Math.floor(Math.random() * glyphs.length)];
          else out += q.from;
        }
        el.textContent = out;
        if (done === queue.length) return resolve();
        frame++;
        requestAnimationFrame(step);
      };
      step();
    });
  }
  function initRoleRotator() {
    const el = $('#roleRotator');
    if (!el || reduceMotion) return;
    const roles = (el.dataset.roles || '').split('|').filter(Boolean);
    if (roles.length < 2) return;
    let i = 0;
    setInterval(() => { i = (i + 1) % roles.length; scrambleTo(el, roles[i]); }, 2800);
  }
  // Eyebrow labels decode when they scroll into view
  function initDecode() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const text = el.dataset.text;
        el.textContent = text.replace(/\S/g, '·');
        scrambleTo(el, text, 0.8);
        io.unobserve(el);
      });
    }, { threshold: 1 });
    $$('.eb-text, [data-scramble]').forEach((el) => { el.dataset.text = el.textContent; io.observe(el); });
  }
  function splitWords(el) {
    if (el.dataset.splitDone) return $$('.swi', el);
    el.dataset.splitDone = '1';
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span'); outer.className = 'sw';
            const inner = document.createElement('span'); inner.className = 'swi'; inner.textContent = part;
            outer.appendChild(inner); frag.appendChild(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
      });
    };
    walk(el);
    return $$('.swi', el);
  }

  /* ── Reveal on scroll, counters ────────────────────────────────────── */
  function initReveal() {
    const items = $$('[data-reveal]');
    const extras = $$('#skillBars, #pipeline');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.concat(extras).forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const sibs = el.parentElement ? $$(':scope > [data-reveal]', el.parentElement) : [];
        el.style.transitionDelay = `${(Math.max(0, sibs.indexOf(el)) % 4) * 0.08}s`;
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } });
    }, { threshold: 0.2 });
    extras.forEach((el) => io2.observe(el));
  }
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length || !('IntersectionObserver' in window) || reduceMotion) return;
    const run = (el) => {
      const target = Number(el.dataset.count), start = performance.now();
      const tick = (now) => {
        const p = clamp((now - start) / 1800, 0, 1);
        el.textContent = Math.round(target * (1 - Math.pow(2, -10 * p)));
        if (p < 1) requestAnimationFrame(tick); else el.textContent = target;
      };
      requestAnimationFrame(tick);
    };
    els.forEach((el) => { el.textContent = '0'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ── GSAP scroll animations ────────────────────────────────────────── */
  function initScrollAnimations() {
    if (!hasGsap) return;
    $$('.section-title, .freelance .hire-title').forEach((title) => {
      gsap.from(splitWords(title), { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: title, start: 'top 85%' } });
    });
    if ($('.hero-copy')) {
      gsap.to('.hero-copy', { yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('#neural', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#top', start: 'center top', end: 'bottom top', scrub: true } });
    }
    const track = $('.marquee-track');
    if (track) {
      const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
      ScrollTrigger.create({ onUpdate: (self) => skew(clamp(self.getVelocity() / -300, -8, 8)) });
    }
    if ($('.orbit-wrap')) gsap.from('.orbit-wrap', { scale: 0.7, opacity: 0, rotate: -30, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.orbit-wrap', start: 'top 80%' } });
    if ($('.case-visual')) gsap.to('.case-visual .viz', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.case-hero', start: 'top top', end: 'bottom top', scrub: true } });
    $$('.stack-chips span').forEach((chip, i) => { chip.style.transitionDelay = `${i * 0.05}s`; });

    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', () => {
      const pin = $('#workPin'), workTrack = $('#workTrack');
      if (!pin || !workTrack) return undefined;
      pin.classList.add('is-pinned');
      const distance = () => Math.max(0, workTrack.scrollWidth - window.innerWidth);
      const tween = gsap.to(workTrack, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: { trigger: pin, start: 'center center', end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      $$('.project-card', workTrack).forEach((card) => {
        gsap.from(card.querySelector('.project-visual'), { scale: 0.85, opacity: 0.4, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 95%', end: 'left 55%', scrub: true } });
      });
      return () => { pin.classList.remove('is-pinned'); if (tween.scrollTrigger) tween.scrollTrigger.kill(); };
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ── Scroll-driven chrome: progress, statement, timeline ───────────── */
  function initScrollChrome() {
    const progress = $('#scrollProgress');
    const statement = $('#aboutStatement');
    const timeline = $('#timeline');
    const fill = $('#timelineFill');
    let words = [];
    if (statement) {
      const hl = new Set(['AI', 'engineer', 'agentic', 'LLM', 'React', 'Django.', 'real', 'users.']);
      statement.innerHTML = statement.textContent.trim().replace(/\s+/g, ' ').split(' ').map((w) => `<span class="w${hl.has(w) ? ' hl' : ''}">${esc(w)}</span>`).join(' ');
      words = $$('.w', statement);
      if (reduceMotion) words.forEach((w) => w.classList.add('lit'));
    }
    const update = () => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (words.length && !reduceMotion) {
        const r = statement.getBoundingClientRect();
        const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3), 0, 1);
        const lit = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle('lit', i < lit));
      }
      if (timeline && fill) {
        const r = timeline.getBoundingClientRect();
        fill.style.transform = `scaleY(${clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1)})`;
      }
    };
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });
    update();
  }

  /* ── Card spotlight + tilt ─────────────────────────────────────────── */
  function initCards() {
    $$('.project-card, .service, .proof-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        if (finePointer && !reduceMotion && card.classList.contains('project-card')) {
          card.style.transform = `perspective(900px) rotateX(${((y / r.height) - 0.5) * -7}deg) rotateY(${((x / r.width) - 0.5) * 7}deg)`;
        }
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
    const tilt = $('[data-tilt]'), twin = $('#twin');
    if (tilt && twin && finePointer && !reduceMotion) {
      twin.addEventListener('pointermove', (e) => {
        const r = twin.getBoundingClientRect();
        tilt.style.transform = `rotateX(${((e.clientY - r.top) / r.height - 0.5) * -4}deg) rotateY(${((e.clientX - r.left) / r.width - 0.5) * 4}deg)`;
      });
      twin.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
    }
  }

  /* ── Chat API ──────────────────────────────────────────────────────── */
  async function streamChat(payload, onToken) {
    const res = await fetch('/api/chat/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
      body: JSON.stringify({ ...payload, stream: true }),
    });
    if (!res.ok) {
      let msg = 'The assistant is unavailable right now. Please try again in a moment.';
      try { const d = await res.json(); if (d.answer) msg = d.answer; } catch (_) {}
      throw new Error(msg);
    }
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      const d = await res.json(); onToken(d.answer || ''); return d.answer || '';
    }
    const reader = res.body.getReader(), decoder = new TextDecoder();
    let buffer = '', full = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (data === '[DONE]') return full;
        try { const p = JSON.parse(data); if (p.token) { full += p.token; onToken(p.token); } } catch (_) {}
      }
    }
    return full;
  }
  function renderRich(text) {
    const lines = esc(text.replace(/ /g, ' ').replace(/‑/g, '-')).split('\n');
    let html = '', list = false, para = [];
    const flush = () => { if (para.length) { html += `<p>${para.join('<br>')}</p>`; para = []; } };
    for (const raw of lines) {
      const line = raw.trim();
      const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (item) { flush(); if (!list) { html += '<ul>'; list = true; } html += `<li>${item[1]}</li>`; }
      else { if (list) { html += '</ul>'; list = false; } if (line) para.push(line); else flush(); }
    }
    flush();
    if (list) html += '</ul>';
    return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*\*/g, '');
  }

  /* ── AI twin (reusable for hero card and floating dock) ────────────── */
  const chats = [];
  function createChat(rootEl) {
    const box = $('[data-chat-messages]', rootEl), form = $('[data-chat-form]', rootEl), input = $('[data-chat-input]', rootEl);
    const orb = $('[data-chat-orb]', rootEl), status = $('[data-chat-status]', rootEl), voice = $('[data-chat-voice]', rootEl);
    if (!box || !form || !input) return null;
    const state = { history: [], busy: false, speak: false };
    const scroll = () => { box.scrollTop = box.scrollHeight; };
    const add = (role, html) => { const el = document.createElement('div'); el.className = `msg ${role}`; el.innerHTML = html; box.appendChild(el); scroll(); return el; };

    async function ask(question) {
      question = (question || '').trim();
      if (!question || state.busy) return;
      state.busy = true;
      input.value = ''; input.disabled = true;
      add('user', `<p>${esc(question)}</p>`);
      const bubble = add('bot', '<span class="typing"><i></i><i></i><i></i></span>');
      if (orb) orb.classList.add('thinking');
      if (status) status.textContent = 'Thinking…';
      let full = '', pending = false;
      try {
        full = await streamChat({ question, history: state.history.slice(-10) }, (tok) => {
          full += tok;
          if (status) status.textContent = 'Typing…';
          if (pending) return;
          pending = true;
          requestAnimationFrame(() => { bubble.innerHTML = renderRich(full); scroll(); pending = false; });
        });
        bubble.innerHTML = renderRich(full || "I couldn't find anything on that — try asking another way.");
        if (full) state.history.push({ role: 'user', content: question }, { role: 'assistant', content: full });
        if (state.speak && full && 'speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(full.replace(/\*\*/g, ''));
          u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u);
        }
      } catch (err) {
        bubble.innerHTML = `<p>${esc(err.message || 'Something went wrong. Please try again.')}</p>`;
      } finally {
        scroll();
        state.busy = false; state.speak = false;
        input.disabled = false;
        if (orb) orb.classList.remove('thinking');
        if (status) status.textContent = 'Online · replies in seconds';
        if (finePointer) input.focus({ preventScroll: true });
      }
    }

    form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
    $$('[data-chat-suggestions] button', rootEl).forEach((b) => b.addEventListener('click', () => ask(b.textContent)));

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (voice) {
      if (!SR) voice.addEventListener('click', () => toast('Voice input isn’t supported in this browser'));
      else {
        const rec = new SR();
        rec.lang = 'en-US'; rec.interimResults = true;
        let listening = false;
        rec.onresult = (e) => {
          const text = Array.from(e.results).map((r) => r[0].transcript).join('');
          input.value = text;
          if (e.results[e.results.length - 1].isFinal) { state.speak = true; ask(text); }
        };
        rec.onend = () => { listening = false; voice.classList.remove('is-active'); };
        rec.onerror = () => { listening = false; voice.classList.remove('is-active'); toast('Couldn’t hear you — check mic permissions'); };
        voice.addEventListener('click', () => {
          if (listening) { rec.stop(); return; }
          try { rec.start(); listening = true; voice.classList.add('is-active'); toast('Listening… ask your question'); } catch (_) {}
        });
      }
    }
    return { ask, input, root: rootEl };
  }
  function initChats() {
    $$('[data-chat]').forEach((el) => { const c = createChat(el); if (c) chats.push(c); });
    // Floating dock
    const launcher = $('#twinLauncher'), dock = $('#twinDock');
    if (launcher && dock) {
      const setOpen = (open) => {
        dock.classList.toggle('open', open);
        dock.setAttribute('aria-hidden', String(!open));
        launcher.setAttribute('aria-expanded', String(open));
        if (open && finePointer) setTimeout(() => $('[data-chat-input]', dock).focus({ preventScroll: true }), 300);
      };
      launcher.addEventListener('click', () => setOpen(true));
      $('#twinDockClose').addEventListener('click', () => setOpen(false));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dock.classList.contains('open')) setOpen(false); });
      window.openTwinDock = setOpen;
    }
    $$('[data-ask]').forEach((btn) => btn.addEventListener('click', () => askTwin(btn.dataset.ask)));
  }
  // Ask from anywhere: hero chat on home, the dock elsewhere
  function askTwin(question) {
    const chat = chats[0];
    if (!chat) return;
    if (PAGE === 'home') { scrollToTarget('#top'); setTimeout(() => chat.ask(question), question ? 800 : 0); if (!question) setTimeout(() => chat.input.focus({ preventScroll: true }), 900); return; }
    if (window.openTwinDock) window.openTwinDock(true);
    if (question) setTimeout(() => chat.ask(question), 350);
  }

  /* ── Terminal ──────────────────────────────────────────────────────── */
  function initTerminal() {
    const body = $('#termBody'), form = $('#termForm'), input = $('#termInput');
    if (!body || !form) return;
    const past = [];
    let cursor = -1;
    const print = (html, cls = 'term-out') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; body.appendChild(d); body.scrollTop = body.scrollHeight; return d; };
    const kw = (s) => `<span class="t-kw">${s}</span>`;
    const sections = { about: '#about', work: '#work', projects: '#work', skills: '#skills', github: '#github', journey: '#journey', match: '#match', freelance: '#freelance', contact: '#contact', top: '#top' };
    const commands = {
      help: () => print([
        '<span class="t-accent">Available commands</span>',
        `  ${kw('whoami')}        who is Sinan`,
        `  ${kw('projects')}      shipped projects · ${kw('open 1')} for a case study`,
        `  ${kw('skills')}        the toolkit`,
        `  ${kw('experience')}    journey so far`,
        `  ${kw('ask')} <q>       ask my AI twin anything`,
        `  ${kw('hire')}          freelance page`,
        `  ${kw('resume')}        open my resume`,
        `  ${kw('theme')} <name>  forest | aurora | ocean | sunset`,
        `  ${kw('cd')} <section>  about | work | skills | github | journey | match`,
        `  ${kw('clear')}         clear the screen`,
        '<span class="t-dim">  psst… there may be a hidden command or two.</span>',
      ].join('\n')),
      whoami: () => print(`<span class="t-accent">${esc(PROFILE.name || 'Sinan')}</span>\n${esc(PROFILE.headline || '')}\n📍 ${esc(PROFILE.location || '')} · ${esc(PROFILE.relocation || '')}\n${esc(PROFILE.summary || '')}`),
      about: () => commands.whoami(),
      projects: () => print(PROJECTS.map((p, i) => `<span class="t-accent">[${i + 1}]</span> ${esc(p.title)} <span class="t-dim">— ${esc(p.metric)} ${esc(p.metric_label)}</span>`).join('\n') + `\n<span class="t-dim">type</span> ${kw('open &lt;n&gt;')} <span class="t-dim">for the case study</span>`),
      open: (arg) => {
        const p = PROJECTS[Number(arg) - 1];
        if (!p) return print(`<span class="t-pink">usage: open 1-${PROJECTS.length}</span>`);
        print(`opening <span class="t-accent">${esc(p.title)}</span>…`);
        setTimeout(() => navigate(`/work/${p.slug}/`), 400);
      },
      project: (arg) => commands.open(arg),
      skills: () => {
        const groups = {};
        (DATA.skills || []).forEach((s) => { (groups[s.category] = groups[s.category] || []).push(s.name); });
        print(Object.entries(groups).map(([c, l]) => `<span class="t-accent">${esc(c.padEnd(9))}</span>${esc(l.join(' · '))}`).join('\n'));
      },
      experience: () => print((DATA.experiences || []).map((e) => `<span class="t-accent2">▸ ${esc(e.role)}</span>\n  ${esc(e.company)} <span class="t-dim">· ${esc(e.period)}</span>`).join('\n')),
      education: () => commands.experience(),
      hire: () => { print('Let\'s build something. <span class="t-accent2">Opening the freelance page…</span>'); setTimeout(() => navigate('/hire/'), 500); },
      contact: () => print(`📧 <a href="mailto:${esc(PROFILE.email)}">${esc(PROFILE.email)}</a>${PROFILE.whatsapp ? `\n💬 <a href="https://wa.me/${esc(PROFILE.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}\n🔗 <a href="${esc(PROFILE.linkedin_url)}" target="_blank" rel="noopener">LinkedIn</a>`),
      social: () => commands.contact(),
      resume: () => { print('Opening the web resume…'); setTimeout(() => navigate('/resume/'), 400); },
      theme: (arg) => {
        const names = ['forest', 'aurora', 'ocean', 'sunset'];
        if (!names.includes(arg)) return print(`usage: theme ${names.join(' | ')}`);
        setAccent(arg); print(`accent set to <span class="t-accent">${arg}</span> ✓`);
      },
      ls: () => print(Object.keys(sections).filter((k) => !['projects', 'top'].includes(k)).map((k) => `<span class="t-accent2">${k}/</span>`).join('  ')),
      cd: (arg) => {
        const target = sections[(arg || '').replace(/\/$/, '')];
        if (!target) return print(`<span class="t-pink">cd: no such section: ${esc(arg || '')}</span> — try ${kw('ls')}`);
        print(`<span class="t-dim">→ ${esc(arg)}</span>`); scrollToTarget(target);
      },
      clear: () => { body.innerHTML = ''; },
      date: () => print(new Date().toString()),
      echo: (arg) => print(esc(arg || '')),
      coffee: () => print('☕ brewing… Sinan runs on chai, actually.'),
      sudo: (arg) => {
        if (/hire[- ]?sinan/i.test(arg || '')) {
          print('<span class="t-accent2">[sudo] access granted ✓</span>\nExcellent decision. Deploying confetti and opening the hire page…');
          confetti();
          setTimeout(() => navigate('/hire/'), 1600);
        } else print(`<span class="t-pink">sudo: permission denied.</span> Nice try — maybe ${kw('sudo hire-sinan')}?`);
      },
      rm: () => print('<span class="t-pink">rm: nice try. This portfolio is production-grade.</span>'),
      exit: () => print('There is no exit. Only opportunities. 😄'),
      ask: async (arg) => {
        if (!arg) return print(`usage: ${kw('ask')} what is his strongest project?`);
        const out = print('<span class="t-dim">thinking…</span>');
        let full = '';
        try {
          await streamChat({ question: arg, history: [] }, (t) => { full += t; out.innerHTML = `<span class="t-accent2">twin ›</span> ${esc(full)}`; body.scrollTop = body.scrollHeight; });
          if (!full) out.textContent = 'No answer — try rephrasing.';
        } catch (e) { out.innerHTML = `<span class="t-pink">${esc(e.message)}</span>`; }
      },
    };
    const run = (line) => {
      const raw = line.trim();
      print(esc(raw), 'term-out term-cmd');
      if (!raw) return;
      past.unshift(raw); cursor = -1;
      const [name, ...rest] = raw.split(/\s+/);
      const fn = commands[name.toLowerCase()];
      if (fn) fn(rest.join(' '));
      else print(`<span class="t-pink">command not found: ${esc(name)}</span> — type ${kw('help')}, or ${kw('ask')} ${esc(raw)}`);
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); input.value = ''; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && past.length) { e.preventDefault(); cursor = Math.min(cursor + 1, past.length - 1); input.value = past[cursor]; }
      if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.max(cursor - 1, -1); input.value = cursor >= 0 ? past[cursor] : ''; }
      if (e.key === 'Tab') {
        e.preventDefault();
        const match = Object.keys(commands).find((c) => c.startsWith(input.value.trim().toLowerCase()));
        if (match && input.value.trim()) input.value = `${match} `;
      }
    });
    $('#terminal').addEventListener('click', (e) => { if (!e.target.closest('a')) input.focus({ preventScroll: true }); });
  }

  /* ── Skills filter ─────────────────────────────────────────────────── */
  function initSkills() {
    const filter = $('#skillFilter'), bars = $('#skillBars');
    if (!filter || !bars) return;
    filter.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      $$('button', filter).forEach((b) => b.classList.toggle('active', b === btn));
      const cat = btn.dataset.filter;
      bars.classList.remove('in');
      $$('.skill-bar', bars).forEach((bar) => bar.classList.toggle('is-hidden', cat !== 'all' && bar.dataset.cat !== cat));
      requestAnimationFrame(() => requestAnimationFrame(() => bars.classList.add('in')));
      if (hasGsap) ScrollTrigger.refresh();
    });
  }

  /* ── Live GitHub ───────────────────────────────────────────────────── */
  const LANG_COLORS = { Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#663399', Kotlin: '#A97BFF', 'Jupyter Notebook': '#DA5B0B', Java: '#b07219', Shell: '#89e051' };
  function timeAgo(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    const units = [[31536000, 'year'], [2592000, 'month'], [604800, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
    for (const [sec, name] of units) { const n = Math.floor(s / sec); if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`; }
    return 'just now';
  }
  const prettyName = (n) => n.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bMl\b/g, 'ML').replace(/\bAi\b/g, 'AI');
  async function initGithub() {
    const section = $('#github');
    if (!section) return;
    const user = section.dataset.githubUser;
    const grid = $('#ghGrid'), langs = $('#ghLangs');
    const render = (repos) => {
      const own = repos.filter((r) => !r.fork).sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
      const counts = {};
      own.forEach((r) => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      langs.innerHTML = entries.map(([l, c]) => `<i style="width:${(c / total) * 100}%;background:${LANG_COLORS[l] || '#8d92aa'}" title="${esc(l)}"></i>`).join('');
      const legend = document.createElement('div');
      legend.className = 'gh-legend';
      legend.innerHTML = `<span><b style="background:var(--accent-2)"></b>${own.length} public repos</span>` + entries.map(([l, c]) => `<span><b style="background:${LANG_COLORS[l] || '#8d92aa'}"></b>${esc(l)} · ${Math.round((c / total) * 100)}%</span>`).join('');
      langs.after(legend);
      requestAnimationFrame(() => requestAnimationFrame(() => langs.classList.add('in')));
      grid.innerHTML = own.slice(0, 6).map((r, i) => `
        <a class="gh-card" href="${esc(r.html_url)}" target="_blank" rel="noopener" style="--i:${i}" data-cursor="GitHub">
          <h3><svg><use href="#i-branch"/></svg>${esc(prettyName(r.name))}</h3>
          ${r.description ? `<p>${esc(r.description)}</p>` : '<p></p>'}
          <div class="gh-meta">
            ${r.language ? `<span><b style="background:${LANG_COLORS[r.language] || '#8d92aa'}"></b>${esc(r.language)}</span>` : ''}
            <span><svg><use href="#i-star"/></svg>${r.stargazers_count}</span>
            <span>updated ${timeAgo(r.pushed_at)}</span>
          </div>
        </a>`).join('');
      if (hasGsap) ScrollTrigger.refresh();
    };
    const fail = () => { grid.innerHTML = `<p class="gh-error">GitHub is taking a break right now — <a class="grad-text" href="https://github.com/${esc(user)}" target="_blank" rel="noopener">see the repos on GitHub →</a></p>`; };
    const cached = session.get('gh-repos');
    if (cached) { try { render(JSON.parse(cached)); return; } catch (_) {} }
    const load = async () => {
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=pushed&per_page=100`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) throw new Error(res.status);
        const repos = await res.json();
        session.set('gh-repos', JSON.stringify(repos.map((r) => ({ name: r.name, html_url: r.html_url, description: r.description, language: r.language, stargazers_count: r.stargazers_count, pushed_at: r.pushed_at, fork: r.fork }))));
        render(repos);
      } catch (_) { fail(); }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { obs.disconnect(); load(); } }, { rootMargin: '400px' }).observe(section);
    } else load();
  }

  /* ── JD match ──────────────────────────────────────────────────────── */
  const SAMPLE_JD = `Machine Learning Engineer — AI Products (Hybrid)

We're looking for an ML Engineer to build and ship AI features used by thousands of customers.

Responsibilities:
- Build LLM-powered features including RAG pipelines, agents and chat assistants
- Train and evaluate classical ML and deep learning models
- Deploy models behind REST APIs and build internal tools with React
- Work with product and backend teams to turn prototypes into products

Requirements:
- Strong Python; experience with scikit-learn, TensorFlow or PyTorch
- Hands-on NLP or computer vision experience
- Experience with LLMs, LangChain or similar frameworks
- Backend experience (Django/FastAPI) and REST APIs; React is a plus
- Nice to have: Docker, AWS/GCP, MLOps tooling`;
  function parseReport(text) {
    const score = text.match(/SCORE:?[*\s]*(\d{1,3})/i);
    const section = (name, next) => {
      const m = text.match(new RegExp(`${name}:[*\\s]*([\\s\\S]*?)(?:\\**(?:${next})|$)`, 'i'));
      return m ? m[1].trim() : '';
    };
    const bullets = (s) => s.split('\n').map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
    return { score: score ? clamp(Number(score[1]), 0, 100) : null, strengths: bullets(section('STRENGTHS', 'GAPS:|VERDICT:')), gaps: bullets(section('GAPS', 'VERDICT:')), verdict: section('VERDICT', '$^'), structured: /STRENGTHS:/i.test(text) };
  }
  function initMatch() {
    const form = $('#jdForm');
    if (!form) return;
    const input = $('#jdInput'), submit = $('#jdSubmit'), result = $('#jdResult'), output = $('#jdOutput'), gauge = $('#gaugeFg'), num = $('#gaugeNum');
    const C = 2 * Math.PI * 52;
    let shown = null;
    const setScore = (score) => {
      if (score === shown) return;
      shown = score;
      gauge.style.stroke = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f472b6';
      gauge.style.strokeDashoffset = String(C * (1 - score / 100));
      const start = performance.now();
      const tick = (now) => { const p = clamp((now - start) / 1400, 0, 1); num.textContent = Math.round(score * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    const render = (text) => {
      const r = parseReport(text);
      if (r.score !== null) { result.classList.remove('loading'); setScore(r.score); }
      if (!r.structured) { output.innerHTML = r.score !== null ? '<p class="muted">Writing the breakdown…</p>' : renderRich(text.replace(/SCORE:.*\n?/i, '')); return; }
      let html = '';
      if (r.strengths.length) html += `<h5 class="h-strengths">Strengths</h5><ul>${r.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
      if (r.gaps.length) html += `<h5 class="h-gaps">Gaps</h5><ul class="gaps">${r.gaps.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
      if (r.verdict) html += `<h5 class="h-verdict">Verdict</h5><p class="verdict">${esc(r.verdict)}</p>`;
      output.innerHTML = html.replace(/\*\*/g, '');
    };
    $('#jdSample').addEventListener('click', () => { input.value = SAMPLE_JD; input.focus({ preventScroll: true }); toast('Sample JD loaded — hit “Analyse fit”'); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const jd = input.value.trim();
      if (jd.length < 40) { toast('Paste a bit more of the job description'); input.focus(); return; }
      submit.disabled = true; shown = null; num.textContent = '--';
      gauge.style.strokeDashoffset = String(C);
      result.classList.add('loading');
      output.innerHTML = '<p class="muted">Reading the JD and comparing it with Sinan’s experience…</p>';
      if (innerWidth < 1100) scrollToTarget(result);
      let full = '';
      try {
        await streamChat({ question: jd, mode: 'jd' }, (t) => { full += t; render(full); });
        if (!full) output.innerHTML = '<p>No analysis came back — please try again.</p>'; else render(full);
        const r = parseReport(full);
        if (r.score !== null && r.score >= 80) confetti(80);
      } catch (err) { output.innerHTML = `<p>${esc(err.message)}</p>`; }
      finally { result.classList.remove('loading'); submit.disabled = false; }
    });
  }

  /* ── Freelance brief builder ───────────────────────────────────────── */
  function initBrief() {
    const nameEl = $('#briefName');
    if (!nameEl) return;
    const state = { services: [], discuss: false, timeline: '' };
    const detailsEl = $('#briefDetails'), budgetEl = $('#briefBudget'), preview = $('#briefPreview');
    const wa = $('#briefWhatsapp'), gmail = $('#briefGmail');
    const mobile = window.matchMedia('(pointer: coarse)').matches;
    const discussBtn = $('.chips[data-group="discuss"] button');

    $$('.brief .chips').forEach((group) => {
      const key = group.dataset.group, multi = group.dataset.multi === 'true';
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (key === 'discuss') {
          state.discuss = !btn.classList.contains('on');
          btn.classList.toggle('on', state.discuss);
          if (state.discuss) budgetEl.value = '';
        } else if (multi) {
          btn.classList.toggle('on');
          state[key] = $$('button.on', group).map((b) => b.textContent.trim());
        } else {
          const on = !btn.classList.contains('on');
          $$('button', group).forEach((b) => b.classList.remove('on'));
          btn.classList.toggle('on', on);
          state[key] = on ? btn.textContent.trim() : '';
        }
        update(true);
      });
    });
    budgetEl.addEventListener('input', () => {
      if (budgetEl.value.trim() && state.discuss) { state.discuss = false; discussBtn.classList.remove('on'); }
      update(false);
    });

    const compose = () => {
      const name = nameEl.value.trim(), details = detailsEl.value.trim(), budget = budgetEl.value.trim();
      const lines = ['Hi Sinan! 👋', `${name ? `I'm ${name}. ` : ''}I found your portfolio and I'd love to discuss a project.`];
      const facts = [];
      if (state.services.length) facts.push(`• Need: ${state.services.join(', ')}`);
      if (budget) facts.push(`• Budget: ${budget}`); else if (state.discuss) facts.push("• Budget: Let's discuss");
      if (state.timeline) facts.push(`• Timeline: ${state.timeline}`);
      if (facts.length) lines.push('', ...facts);
      if (details) lines.push('', 'About the project:', details);
      lines.push('', 'Looking forward to hearing from you!');
      return lines.join('\n');
    };
    const update = (bump) => {
      const msg = compose();
      preview.textContent = msg;
      if (bump) { preview.classList.remove('bump'); void preview.offsetWidth; preview.classList.add('bump'); }
      const subject = `Project enquiry${state.services.length ? ` — ${state.services.join(', ')}` : ''}`;
      if (wa && PROFILE.whatsapp) wa.href = `https://wa.me/${PROFILE.whatsapp}?text=${encodeURIComponent(msg)}`;
      if (gmail) gmail.href = mobile
        ? `mailto:${PROFILE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`
        : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(PROFILE.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
    };
    nameEl.addEventListener('input', () => update(false));
    detailsEl.addEventListener('input', () => update(false));
    $('#briefCopy').addEventListener('click', () => copyText(compose(), 'Message copied — paste it anywhere ✓'));
    [wa, gmail].forEach((btn) => btn && btn.addEventListener('click', () => {
      if (!state.services.length && !detailsEl.value.trim()) toast('Tip: pick a service or add details for a faster reply');
    }));
    update(false);
  }

  /* ── FAQ: animate open/close ───────────────────────────────────────── */
  function initFaq() {
    $$('.faq-item').forEach((item) => {
      const summary = $('summary', item), answer = $('.faq-answer', item);
      summary.addEventListener('click', (e) => {
        if (reduceMotion) return;
        e.preventDefault();
        if (item.open) {
          answer.animate([{ height: `${answer.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { item.open = false; };
        } else {
          item.open = true;
          const h = answer.offsetHeight;
          answer.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
        }
      });
    });
  }

  /* ── Portrait scan ─────────────────────────────────────────────────── */
  function initPortrait() {
    const probeSrc = $('.has-photo') ? getComputedStyle($('.has-photo')).getPropertyValue('--photo') : '';
    const avatarUrl = (probeSrc.match(/url\(['"]?([^'")]+)['"]?\)/) || [])[1];
    if (avatarUrl) { const img = new Image(); img.onload = () => root.classList.add('photo-ok'); img.src = avatarUrl; }

    const portrait = $('#portrait');
    const img = portrait ? $('.color-img', portrait) : null;
    if (!portrait || !img) return;
    const onReady = () => {
      const stage = $('.portrait-stage', portrait);
      const setH = () => stage.style.setProperty('--h', `${stage.clientHeight + 90}px`);
      setH();
      window.addEventListener('resize', setH);
      const scan = () => {
        if (portrait.classList.contains('scanned')) return;
        portrait.classList.add('scanning');
        setTimeout(() => { portrait.classList.add('scanned'); portrait.classList.remove('scanning'); }, reduceMotion ? 0 : 900);
      };
      if (!('IntersectionObserver' in window)) scan();
      else new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { scan(); obs.disconnect(); } }, { threshold: 0.45 }).observe(portrait);
      if (finePointer && !reduceMotion) {
        const layers = $$('[data-depth]', portrait);
        stage.addEventListener('pointermove', (e) => {
          const r = stage.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          layers.forEach((l) => { const d = Number(l.dataset.depth); l.style.transform = `translate(${x * d * 22}px, ${y * d * 22}px) scale(1.04)`; });
        });
        stage.addEventListener('pointerleave', () => layers.forEach((l) => { l.style.transform = ''; }));
      }
      if (hasGsap) ScrollTrigger.refresh();
    };
    const probe = new Image();
    probe.onload = onReady;
    probe.onerror = () => { root.classList.add('no-photo'); if (hasGsap) ScrollTrigger.refresh(); };
    probe.src = img.getAttribute('src');
  }

  /* ── Particle text ("LET'S TALK") ──────────────────────────────────── */
  function initParticles() {
    const canvas = $('#particles');
    if (!canvas || reduceMotion || !canvas.getContext) return;
    root.classList.add('particles-on');
    const ctx = canvas.getContext('2d');
    let parts = [], w = 0, h = 0, raf = 0, running = false, built = false;
    const mouse = { x: -9999, y: -9999 };

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const o = off.getContext('2d');
      const lines = w < 620 ? ["LET'S", 'TALK'] : ["LET'S TALK"];
      let size = Math.min(h / (lines.length * 0.95), w / (lines.length === 1 ? 5.4 : 3.4));
      o.font = `900 ${size}px "Inter Tight", system-ui, sans-serif`;
      o.textBaseline = 'middle';
      o.fillStyle = '#fff';
      const widest = Math.max(...lines.map((l) => o.measureText(l).width));
      if (widest > w * 0.98) { size *= (w * 0.98) / widest; o.font = `900 ${size}px "Inter Tight", system-ui, sans-serif`; }
      lines.forEach((line, i) => {
        const y = h / 2 + (i - (lines.length - 1) / 2) * size * 0.92;
        o.fillText(line, 0, y);
      });
      const data = o.getImageData(0, 0, w, h).data;
      const gap = w < 620 ? 4 : 5;
      const targets = [];
      for (let y = 0; y < h; y += gap) for (let x = 0; x < w; x += gap) if (data[(y * w + x) * 4 + 3] > 128) targets.push([x, y]);
      const prev = parts;
      parts = targets.map(([tx, ty], i) => {
        const p = prev[i];
        return { x: p ? p.x : Math.random() * w, y: p ? p.y : h + Math.random() * 100, tx, ty, vx: 0, vy: 0, t: tx / w };
      });
      built = true;
    };
    const mix = (t) => {
      const a = theme.a.split(',').map(Number), b = theme.b.split(',').map(Number);
      return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
    };
    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      const R = 90;
      const buckets = new Map();
      for (const p of parts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < R) { const f = (1 - d / R) * 6; p.vx += (dx / (d || 1)) * f; p.vy += (dy / (d || 1)) * f; }
        p.vx += (p.tx - p.x) * 0.045; p.vy += (p.ty - p.y) * 0.045;
        p.vx *= 0.82; p.vy *= 0.82;
        p.x += p.vx; p.y += p.vy;
        const key = Math.round(p.t * 10);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(p);
      }
      const size = w < 620 ? 2.2 : 2.6;
      buckets.forEach((list, key) => {
        ctx.fillStyle = mix(key / 10);
        for (const p of list) ctx.fillRect(p.x, p.y, size, size);
      });
      if (running) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!built) build(); if (running) return; running = true; raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(() => {
      build();
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '100px' }).observe(canvas);
    });
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(build, 250); });
    canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    canvas.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    canvas.addEventListener('click', () => navigate('/hire/'));
    // Touch: scatter where tapped
    canvas.addEventListener('touchmove', (e) => { const r = canvas.getBoundingClientRect(); const tt = e.touches[0]; mouse.x = tt.clientX - r.left; mouse.y = tt.clientY - r.top; }, { passive: true });
    canvas.addEventListener('touchend', () => { mouse.x = mouse.y = -9999; });
  }

  /* ── Accent switcher ───────────────────────────────────────────────── */
  function setAccent(name) {
    if (name === 'forest') root.removeAttribute('data-accent'); else root.setAttribute('data-accent', name);
    local.set('accent', name === 'forest' ? '' : name);
    readTheme();
    $$('[data-accent-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.accentSet === name)));
  }
  function initAccent() {
    const current = root.getAttribute('data-accent') || 'forest';
    $$('[data-accent-set]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.accentSet === current));
      b.addEventListener('click', () => { setAccent(b.dataset.accentSet); toast(`Accent: ${b.dataset.accentSet} ✓`); });
    });
  }

  /* ── Dialogs: 30s summary ──────────────────────────────────────────── */
  function closeDialogs() { $$('dialog[open]').forEach((d) => d.close()); }
  function initTldr() {
    const dialog = $('#tldr');
    if (!dialog) return;
    const open = () => { closeMenu(); if (!dialog.open) dialog.showModal(); lockScroll(true); };
    $('#tldrOpen')?.addEventListener('click', open);
    $$('[data-open-tldr]').forEach((b) => b.addEventListener('click', open));
    dialog.addEventListener('close', () => lockScroll(false));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    $$('[data-close-dialog]', dialog).forEach((b) => b.addEventListener('click', () => dialog.close()));
    $('#tldrCopy')?.addEventListener('click', () => {
      const text = [
        `${PROFILE.name} — AI Engineer (agentic AI & LLM apps) · Full-stack React + Django`,
        `${PROFILE.location} · ${PROFILE.relocation} · Available now`,
        '',
        ...$$('.tldr-points li', dialog).map((li) => `• ${li.textContent.trim()}`),
        '',
        `Email: ${PROFILE.email}${PROFILE.whatsapp ? ` · WhatsApp: +${PROFILE.whatsapp}` : ''}`,
        `Portfolio: ${location.origin}`,
      ].join('\n');
      copyText(text, 'Summary copied — paste it into your notes ✓');
    });
    window.openTldr = open;
  }

  /* ── Command palette ───────────────────────────────────────────────── */
  function initPalette() {
    const dialog = $('#palette'), input = $('#paletteInput'), list = $('#paletteList'), openBtn = $('#paletteOpen');
    if (!dialog) return;
    if (!isMac && openBtn) openBtn.firstElementChild.textContent = 'Ctrl K';
    const go = (hash) => () => (PAGE === 'home' ? scrollToTarget(hash) : navigate(`/${hash}`));
    const actions = [
      { icon: '💬', label: 'Ask my AI twin', hint: 'chat', run: () => askTwin('') },
      { icon: '⚡', label: '30-second summary', hint: 'recruiters', run: () => window.openTldr && window.openTldr() },
      { icon: '🎯', label: 'Check a job description fit', hint: 'recruiters', run: go('#match') },
      { icon: '🤝', label: 'Hire me — freelance page', hint: 'freelance', run: () => navigate('/hire/') },
      PROFILE.whatsapp ? { icon: '🟢', label: 'Chat on WhatsApp', hint: 'contact', run: () => window.open(`https://wa.me/${PROFILE.whatsapp}`, '_blank', 'noopener') } : null,
      { icon: '📧', label: 'Copy email address', hint: PROFILE.email, run: () => copyText(PROFILE.email, 'Email copied ✓') },
      { icon: '📄', label: 'Web resume', hint: 'resume', run: () => navigate('/resume/') },
      { icon: '⬇️', label: 'Download resume PDF', hint: 'pdf', run: () => window.open(PROFILE.resume_url, '_blank', 'noopener') },
      ...PROJECTS.filter((p) => p.featured).map((p) => ({ icon: '🧪', label: `Case study: ${p.title}`, hint: 'work', run: () => navigate(`/work/${p.slug}/`) })),
      { icon: '🧠', label: 'Go to Skills', hint: 'section', run: go('#skills') },
      { icon: '🐙', label: 'Live GitHub', hint: 'section', run: go('#github') },
      { icon: '⌨️', label: 'Open the terminal', hint: 'fun', run: () => { go('#about')(); setTimeout(() => $('#termInput')?.focus({ preventScroll: true }), 1100); } },
      ...['forest', 'aurora', 'ocean', 'sunset'].map((n) => ({ icon: '🎨', label: `Accent: ${n}`, hint: 'theme', run: () => { setAccent(n); toast(`Accent: ${n} ✓`); } })),
      { icon: '💼', label: 'LinkedIn', hint: 'social', run: () => window.open(PROFILE.linkedin_url, '_blank', 'noopener') },
      { icon: '🎉', label: 'Surprise me', hint: 'confetti', run: () => confetti() },
    ].filter(Boolean);
    let filtered = actions, sel = 0;
    const render = () => {
      const q = input.value.trim().toLowerCase();
      filtered = actions.filter((a) => `${a.label} ${a.hint}`.toLowerCase().includes(q));
      sel = clamp(sel, 0, Math.max(0, filtered.length - 1));
      list.innerHTML = filtered.length
        ? filtered.map((a, i) => `<li role="option" data-i="${i}" class="${i === sel ? 'sel' : ''}"><span class="p-icon">${a.icon}</span>${esc(a.label)}<small>${esc(a.hint)}</small></li>`).join('')
        : '<li class="muted">No matches — press Enter to ask my AI twin</li>';
      const selEl = $('li.sel', list);
      if (selEl) selEl.scrollIntoView({ block: 'nearest' });
    };
    const open = () => { closeMenu(); input.value = ''; sel = 0; render(); dialog.showModal(); lockScroll(true); setTimeout(() => input.focus(), 30); };
    const close = () => { if (dialog.open) dialog.close(); };
    const exec = (i) => {
      const a = filtered[i], q = input.value.trim();
      close();
      if (a) a.run(); else if (q) askTwin(q);
    };
    dialog.addEventListener('close', () => lockScroll(false));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    input.addEventListener('input', () => { sel = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, filtered.length); render(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + filtered.length) % Math.max(1, filtered.length); render(); }
      if (e.key === 'Enter') { e.preventDefault(); exec(sel); }
    });
    list.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) exec(Number(li.dataset.i)); });
    list.addEventListener('pointermove', (e) => { const li = e.target.closest('li[data-i]'); if (li && Number(li.dataset.i) !== sel) { sel = Number(li.dataset.i); render(); } });
    openBtn?.addEventListener('click', open);
    document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dialog.open ? close() : open(); } });
  }

  /* ── Confetti ──────────────────────────────────────────────────────── */
  function confetti(count = 160) {
    if (reduceMotion) return;
    const canvas = $('#confetti');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = [`rgb(${theme.a})`, `rgb(${theme.b})`, '#f472b6', '#fbbf24', '#ffffff'];
    const parts = Array.from({ length: count }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.55, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 18 - 6, s: Math.random() * 7 + 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)] }));
    const start = performance.now();
    const tick = (now) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (now - start < 3500) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(tick);
  }

  /* ── Small touches ─────────────────────────────────────────────────── */
  function initExtras() {
    $('#cvPrint')?.addEventListener('click', () => window.print());
    $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copy, 'Email copied ✓')));
    const clock = $('#localTime');
    if (clock) {
      const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: PROFILE.timezone || 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      const set = () => { clock.textContent = fmt.format(new Date()); };
      set(); setInterval(set, 30000);
    }
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    document.addEventListener('keydown', (e) => {
      pos = e.key === code[pos] ? pos + 1 : (e.key === code[0] ? 1 : 0);
      if (pos === code.length) { pos = 0; confetti(220); toast('🎮 Cheat code accepted — hire mode unlocked'); }
    });
    const title = document.title;
    document.addEventListener('visibilitychange', () => { document.title = document.hidden ? '👋 Come back — the AI twin misses you' : title; });
    // eslint-disable-next-line no-console
    console.log('%c👋 Hey, fellow developer!', 'font: 700 16px Inter Tight, sans-serif; color: #22c55e');
    // eslint-disable-next-line no-console
    console.log(`%cOpen to AI/ML roles and freelance work → ${PROFILE.email}`, 'color: #a3e635');
  }

  function sendVisit() {
    if (session.get('visitAlertSent')) return;
    session.set('visitAlertSent', '1');
    const body = JSON.stringify({ referrer: document.referrer || '' });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/visit/', new Blob([body], { type: 'application/json' }));
      else fetch('/api/visit/', { method: 'POST', body, keepalive: true }).catch(() => {});
    } catch (_) {}
  }

  /* ── Boot ──────────────────────────────────────────────────────────── */
  const safe = (fn) => { try { fn(); } catch (err) { console.error(err); } };
  [initNav, initCursor, initMagnetic, initNeural, initRoleRotator, initDecode, initReveal, initCounters,
    initScrollAnimations, initScrollChrome, initCards, initChats, initTerminal, initSkills, initGithub,
    initMatch, initBrief, initFaq, initPortrait, initParticles, initAccent, initTldr, initPalette, initExtras].forEach(safe);
  safe(revealPage);
  safe(() => runPreloader((delay) => { intro(delay); scrollToInitialHash(); }));
  window.addEventListener('load', sendVisit);
})();
