/* ==========================================================================
   Sinan — portfolio interactions
   Works without GSAP/Lenis (CDN failure) — every effect degrades gracefully.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let DATA = {};
  try { DATA = JSON.parse($('#site-data').textContent); } catch (_) {}
  const PROFILE = DATA.profile || {};
  const PROJECTS = DATA.projects || [];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const hasGsap = Boolean(gsap && ScrollTrigger) && !reduceMotion;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} },
  };

  /* ── Toast ──────────────────────────────────────────────────────────── */
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
    try {
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(message); } catch (__) { toast('Copy failed — please copy manually'); }
      ta.remove();
    }
  }

  /* ── Smooth scroll (Lenis) ─────────────────────────────────────────── */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const lockScroll = (locked) => { if (lenis) (locked ? lenis.stop() : lenis.start()); };

  function scrollToTarget(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -70, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    if (hash.length < 2) return;
    const target = $(hash);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
    history.replaceState(null, '', hash);
  });

  /* ── Preloader ─────────────────────────────────────────────────────── */
  const preloader = $('#preloader');
  let introStarted = false;

  function finishPreloader() {
    if (introStarted) return;
    introStarted = true;
    storage.set('booted', '1');
    document.documentElement.classList.add('loaded');
    if (hasGsap && preloader) {
      gsap.to(preloader, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 1,
        ease: 'expo.inOut',
        onComplete: () => preloader.remove(),
      });
      heroIntro(0.35);
    } else {
      if (preloader) preloader.remove();
      heroIntro(0);
    }
  }

  function runPreloader() {
    if (!preloader) return heroIntro(0);
    if (storage.get('booted') || reduceMotion) {
      if (hasGsap) {
        gsap.to(preloader, { opacity: 0, duration: 0.4, onComplete: () => preloader.remove() });
        introStarted = true;
        document.documentElement.classList.add('loaded');
        heroIntro(0.1);
      } else finishPreloader();
      return;
    }
    const lines = [
      ['initialising sinan.os v26.9', ''],
      ['loading neural weights', 'ok'],
      ['mounting 5 shipped projects', 'ok'],
      ['connecting AI twin → groq', 'ok'],
      ['calibrating curiosity', '100%'],
      ['ready. welcome.', ''],
    ];
    const box = $('#bootLines');
    const bar = $('#bootBar');
    const pct = $('#bootPct');
    const total = 1400;
    const start = performance.now();
    let shown = 0;
    const tick = (now) => {
      const p = clamp((now - start) / total, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (bar) bar.style.width = `${eased * 100}%`;
      if (pct) pct.textContent = `${Math.round(eased * 100)}%`;
      const target = Math.min(lines.length, Math.floor(p * lines.length) + 1);
      while (shown < target && box) {
        const [text, status] = lines[shown];
        const row = document.createElement('div');
        const dots = status ? ' ' + '.'.repeat(Math.max(3, 30 - text.length)) + ' ' : '';
        row.innerHTML = `&gt; ${esc(text)}${dots}${status ? `<span class="ok">${esc(status)}</span>` : ''}`;
        box.appendChild(row);
        shown += 1;
      }
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finishPreloader, 250);
    };
    requestAnimationFrame(tick);
    setTimeout(finishPreloader, 4500); // failsafe
  }

  /* ── Hero intro ────────────────────────────────────────────────────── */
  function heroIntro(delay) {
    if (!hasGsap) return;
    const tl = gsap.timeline({ delay });
    tl.from('[data-hero-word]', { yPercent: 115, rotate: 6, duration: 1.3, ease: 'expo.out', stagger: 0.1 })
      .from('[data-hero]', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, '-=1')
      .from('.nav', { y: -30, opacity: 0, duration: 0.9, ease: 'expo.out' }, '-=0.9');
  }

  /* ── Custom cursor & magnetic buttons ──────────────────────────────── */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    document.documentElement.classList.add('has-cursor');
    const ring = $('#cursor');
    const dot = $('#cursorDot');
    const label = $('#cursorLabel');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      document.documentElement.classList.add('cursor-ready');
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    }, { passive: true });
    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();

    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      ring.classList.remove('is-hover', 'is-label', 'is-text');
      if (t.closest('input, textarea')) { ring.classList.add('is-text'); return; }
      const labelled = t.closest('[data-cursor]');
      if (labelled) {
        label.textContent = labelled.dataset.cursor;
        ring.classList.add('is-label');
        return;
      }
      if (t.closest('a, button, [role="button"], .chips button')) ring.classList.add('is-hover');
    });
    document.addEventListener('pointerleave', () => { ring.style.opacity = 0; dot.style.opacity = 0; });
    document.addEventListener('pointerenter', () => { ring.style.opacity = 1; dot.style.opacity = 1; });
  }

  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ── Neural network canvas ─────────────────────────────────────────── */
  function initNeural() {
    const canvas = $('#neural');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hero = $('#top');
    let w = 0, h = 0, dpr = 1, nodes = [], pulses = [], running = true, raf = 0;
    const mouse = { x: -9999, y: -9999 };
    const LINK = 150;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 15000, 28, 95));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.8,
      }));
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < 200) { n.x += dx * 0.006; n.y += dy * 0.006; }
      }
      // Links
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            const near = Math.hypot(mouse.x - (a.x + b.x) / 2, mouse.y - (a.y + b.y) / 2) < 180;
            ctx.strokeStyle = near ? `rgba(212,255,63,${(1 - d / LINK) * 0.55})` : `rgba(255,255,255,${(1 - d / LINK) * 0.12})`;
            ctx.lineWidth = near ? 1 : 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            if (!reduceMotion && pulses.length < 14 && Math.random() < 0.0009) pulses.push({ a, b, t: 0 });
          }
        }
      }
      // Signal pulses travelling along links
      pulses = pulses.filter((p) => p.t <= 1);
      for (const p of pulses) {
        p.t += 0.018;
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = 'rgba(212,255,63,0.95)';
        ctx.shadowColor = '#d4ff3f'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Nodes
      for (const n of nodes) {
        const near = Math.hypot(mouse.x - n.x, mouse.y - n.y) < 180;
        ctx.fillStyle = near ? '#d4ff3f' : 'rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(n.x, n.y, near ? n.r + 0.8 : n.r, 0, Math.PI * 2); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(frame);
    }

    resize();
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });
    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

    if (reduceMotion) { running = false; frame(); return; }
    const setRunning = (on) => {
      if (on === running) return;
      running = on;
      if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    };
    new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting && !document.hidden)).observe(hero);
    document.addEventListener('visibilitychange', () => setRunning(!document.hidden && hero.getBoundingClientRect().bottom > 0));
    raf = requestAnimationFrame(frame);
  }

  /* ── Text scramble (role rotator) ──────────────────────────────────── */
  function scrambleTo(el, text) {
    const glyphs = '!<>-_\\/[]{}—=+*^?#01';
    const from = el.textContent;
    const len = Math.max(from.length, text.length);
    const queue = Array.from({ length: len }, (_, i) => ({
      from: from[i] || '', to: text[i] || '',
      start: Math.floor(Math.random() * 14), end: Math.floor(Math.random() * 14) + 14,
    }));
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

  /* ── Reveal on scroll, counters ────────────────────────────────────── */
  function initReveal() {
    const items = $$('[data-reveal]');
    const bars = $('#skillBars');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach((el) => el.classList.add('in'));
      if (bars) bars.classList.add('in');
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = el.parentElement ? $$(':scope > [data-reveal]', el.parentElement) : [];
        el.style.transitionDelay = `${Math.max(0, siblings.indexOf(el)) % 4 * 0.08}s`;
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
    if (bars) {
      new IntersectionObserver(([entry], obs) => {
        if (entry.isIntersecting) { bars.classList.add('in'); obs.disconnect(); }
      }, { threshold: 0.2 }).observe(bars);
    }
  }

  function initCounters() {
    const els = $$('[data-count]');
    const run = (el) => {
      const target = Number(el.dataset.count);
      if (reduceMotion) { el.textContent = target; return; }
      const start = performance.now();
      const dur = 1800;
      const tick = (now) => {
        const p = clamp((now - start) / dur, 0, 1);
        el.textContent = Math.round(target * (1 - Math.pow(2, -10 * p)));
        if (p < 1) requestAnimationFrame(tick); else el.textContent = target;
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) return;
    els.forEach((el) => { el.textContent = '0'; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ── Split headings into words for GSAP reveals ────────────────────── */
  function splitWords(el) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = 'sw';
            const inner = document.createElement('span');
            inner.className = 'swi';
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    return $$('.swi', el);
  }

  function initScrollAnimations() {
    if (!hasGsap) return;

    $$('.section-title, .hire-title').forEach((title) => {
      const words = splitWords(title);
      gsap.from(words, {
        yPercent: 110,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.05,
        scrollTrigger: { trigger: title, start: 'top 85%' },
      });
    });

    gsap.from('.contact-line', {
      yPercent: 60, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: '.contact-big', start: 'top 85%' },
    });

    // Hero parallax as it scrolls away
    gsap.to('.hero-copy', { yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('#neural', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#top', start: 'center top', end: 'bottom top', scrub: true } });

    // Marquee skews with scroll velocity
    const track = $('.marquee-track');
    if (track) {
      const skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
      ScrollTrigger.create({ onUpdate: (self) => skew(clamp(self.getVelocity() / -300, -8, 8)) });
    }

    // Orbit fades/scales in
    gsap.from('.orbit-wrap', { scale: 0.7, opacity: 0, rotate: -30, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.orbit-wrap', start: 'top 80%' } });

    // Horizontal project gallery (desktop only)
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', () => {
      const pin = $('#workPin');
      const workTrack = $('#workTrack');
      if (!pin || !workTrack) return;
      pin.classList.add('is-pinned');
      const distance = () => Math.max(0, workTrack.scrollWidth - window.innerWidth);
      const tween = gsap.to(workTrack, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          start: 'center center',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      $$('.project-card', workTrack).forEach((card) => {
        gsap.from(card.querySelector('.project-visual'), {
          scale: 0.85, opacity: 0.4, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 95%', end: 'left 55%', scrub: true },
        });
      });
      return () => { pin.classList.remove('is-pinned'); if (tween.scrollTrigger) tween.scrollTrigger.kill(); };
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ── Scroll-driven chrome: progress, nav, statement, timeline ──────── */
  function initScrollChrome() {
    const progress = $('#scrollProgress');
    const nav = $('#nav');
    const statement = $('#aboutStatement');
    const timeline = $('#timeline');
    const fill = $('#timelineFill');
    let lastY = window.scrollY;
    let words = [];

    if (statement) {
      const highlight = new Set(['AI', 'engineer', 'agentic', 'LLM', 'React', 'Django.', 'real', 'users.']);
      const text = statement.textContent.trim().replace(/\s+/g, ' ');
      statement.innerHTML = text.split(' ').map((word) => `<span class="w${highlight.has(word) ? ' hl' : ''}">${esc(word)}</span>`).join(' ');
      words = $$('.w', statement);
      if (reduceMotion) words.forEach((w) => w.classList.add('lit'));
    }

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (nav) {
        nav.classList.toggle('scrolled', y > 40);
        const menuOpen = $('#mobileMenu')?.classList.contains('open');
        nav.classList.toggle('hidden', !menuOpen && y > 500 && y > lastY + 2);
        if (y < lastY - 2) nav.classList.remove('hidden');
      }
      lastY = y;
      if (words.length && !reduceMotion) {
        const r = statement.getBoundingClientRect();
        const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3), 0, 1);
        const lit = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle('lit', i < lit));
      }
      if (timeline && fill) {
        const r = timeline.getBoundingClientRect();
        const p = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
        fill.style.transform = `scaleY(${p})`;
      }
    };
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });
    update();

    // Active nav link
    const links = $$('.nav-links a');
    const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => io.observe(s));
    }
  }

  /* ── Mobile menu ───────────────────────────────────────────────────── */
  const burger = $('#burger');
  const menu = $('#mobileMenu');
  function closeMenu() {
    if (!menu || !menu.classList.contains('open')) return;
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    lockScroll(false);
  }
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      lockScroll(open);
    });
  }

  /* ── Pointer spotlight + tilt on cards ─────────────────────────────── */
  function initCards() {
    $$('.project-card, .service').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        if (finePointer && !reduceMotion && card.classList.contains('project-card')) {
          const rx = ((y / r.height) - 0.5) * -7;
          const ry = ((x / r.width) - 0.5) * 7;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        }
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    const twinCard = $('[data-tilt]');
    if (twinCard && finePointer && !reduceMotion) {
      const twin = $('#twin');
      twin.addEventListener('pointermove', (e) => {
        const r = twin.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 4;
        twinCard.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      twin.addEventListener('pointerleave', () => { twinCard.style.transform = ''; });
    }
  }

  /* ── Streaming chat API ────────────────────────────────────────────── */
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
      const d = await res.json();
      onToken(d.answer || '');
      return d.answer || '';
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
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
        try {
          const parsed = JSON.parse(data);
          if (parsed.token) { full += parsed.token; onToken(parsed.token); }
        } catch (_) {}
      }
    }
    return full;
  }

  // Minimal, safe markdown: escapes HTML, then **bold** and "- " lists.
  function renderRich(text) {
    const lines = esc(text.replace(/ |‑/g, (c) => (c === '‑' ? '-' : ' '))).split('\n');
    let html = '', list = false, para = [];
    const flush = () => { if (para.length) { html += `<p>${para.join('<br>')}</p>`; para = []; } };
    for (const raw of lines) {
      const line = raw.trim();
      const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (item) {
        flush();
        if (!list) { html += '<ul>'; list = true; }
        html += `<li>${item[1]}</li>`;
      } else {
        if (list) { html += '</ul>'; list = false; }
        if (line) para.push(line); else flush();
      }
    }
    flush();
    if (list) html += '</ul>';
    return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*\*/g, '');
  }

  /* ── AI twin chat ──────────────────────────────────────────────────── */
  const chat = { history: [], busy: false, speak: false };
  const chatBox = $('#chatMessages');
  const chatForm = $('#chatForm');
  const chatInput = $('#chatInput');
  const orb = $('#orb');
  const twinStatus = $('#twinStatus');

  function chatScroll() { if (chatBox) chatBox.scrollTop = chatBox.scrollHeight; }

  function addMsg(role, html) {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    el.innerHTML = html;
    chatBox.appendChild(el);
    chatScroll();
    return el;
  }

  async function askTwin(question) {
    question = (question || '').trim();
    if (!question || chat.busy || !chatBox) return;
    chat.busy = true;
    chatInput.value = '';
    chatInput.disabled = true;
    addMsg('user', `<p>${esc(question)}</p>`);
    const bubble = addMsg('bot', '<span class="typing"><i></i><i></i><i></i></span>');
    orb?.classList.add('thinking');
    if (twinStatus) twinStatus.textContent = 'Thinking…';
    let full = '', pending = false;
    try {
      full = await streamChat({ question, history: chat.history.slice(-10) }, (token) => {
        full += token;
        if (twinStatus) twinStatus.textContent = 'Typing…';
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { bubble.innerHTML = renderRich(full); chatScroll(); pending = false; });
      });
      bubble.innerHTML = renderRich(full || "I couldn't find anything on that — try asking another way.");
      if (full) chat.history.push({ role: 'user', content: question }, { role: 'assistant', content: full });
      if (chat.speak && full && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(full.replace(/\*\*/g, ''));
        u.rate = 1.05;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }
    } catch (err) {
      bubble.innerHTML = `<p>${esc(err.message || 'Something went wrong. Please try again.')}</p>`;
    } finally {
      chatScroll();
      chat.busy = false;
      chat.speak = false;
      chatInput.disabled = false;
      orb?.classList.remove('thinking');
      if (twinStatus) twinStatus.textContent = 'Online · replies in seconds';
      if (finePointer) chatInput.focus({ preventScroll: true });
    }
  }

  function initChat() {
    if (!chatForm) return;
    chatForm.addEventListener('submit', (e) => { e.preventDefault(); askTwin(chatInput.value); });
    $$('#chatSuggestions button').forEach((b) => b.addEventListener('click', () => askTwin(b.textContent)));

    const voiceBtn = $('#twinVoice');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!voiceBtn) return;
    if (!SR) { voiceBtn.addEventListener('click', () => toast('Voice input isn’t supported in this browser')); return; }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    let listening = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('');
      chatInput.value = transcript;
      if (e.results[e.results.length - 1].isFinal) { chat.speak = true; askTwin(transcript); }
    };
    rec.onend = () => { listening = false; voiceBtn.classList.remove('is-active'); };
    rec.onerror = () => { listening = false; voiceBtn.classList.remove('is-active'); toast('Couldn’t hear you — check mic permissions'); };
    voiceBtn.addEventListener('click', () => {
      if (listening) { rec.stop(); return; }
      try { rec.start(); listening = true; voiceBtn.classList.add('is-active'); toast('Listening… ask your question'); } catch (_) {}
    });
  }

  /* ── Interactive terminal ──────────────────────────────────────────── */
  function initTerminal() {
    const body = $('#termBody');
    const form = $('#termForm');
    const input = $('#termInput');
    if (!body || !form) return;
    const past = [];
    let cursor = -1;

    const print = (html, cls = 'term-out') => {
      const div = document.createElement('div');
      div.className = cls;
      div.innerHTML = html;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
      return div;
    };
    const kw = (s) => `<span class="t-kw">${s}</span>`;
    const sections = { about: '#about', work: '#work', projects: '#work', skills: '#skills', journey: '#journey', match: '#match', hire: '#hire', contact: '#contact', top: '#top' };

    const commands = {
      help: () => print([
        `<span class="t-lime">Available commands</span>`,
        `  ${kw('whoami')}        who is Sinan`,
        `  ${kw('projects')}      list shipped projects · ${kw('project 1')} for details`,
        `  ${kw('skills')}        the toolkit`,
        `  ${kw('experience')}    journey so far`,
        `  ${kw('ask')} <q>       ask my AI twin anything`,
        `  ${kw('hire')}          freelance & contact options`,
        `  ${kw('resume')}        open my resume`,
        `  ${kw('social')}        find me online`,
        `  ${kw('cd')} <section>  jump to about | work | skills | journey | match | hire`,
        `  ${kw('clear')}         clear the screen`,
        `<span class="t-dim">  psst… there may be a hidden command or two.</span>`,
      ].join('\n')),
      whoami: () => print(`<span class="t-lime">${esc(PROFILE.name || 'Sinan')}</span>\n${esc(PROFILE.headline || '')}\n📍 ${esc(PROFILE.location || '')}\n${esc(PROFILE.summary || '')}`),
      about: () => commands.whoami(),
      projects: () => print(PROJECTS.map((p, i) => `<span class="t-violet">[${i + 1}]</span> ${esc(p.title)} <span class="t-dim">— ${esc(p.metric)} ${esc(p.metric_label)}</span>`).join('\n') + `\n<span class="t-dim">type</span> ${kw('project &lt;n&gt;')} <span class="t-dim">for the case study</span>`),
      project: (arg) => {
        const p = PROJECTS[Number(arg) - 1];
        if (!p) return print(`<span class="t-pink">usage: project 1-${PROJECTS.length}</span>`);
        print(`<span class="t-lime">${esc(p.title)}</span> <span class="t-dim">· ${esc(p.category)}</span>\n<span class="t-violet">problem</span>  ${esc(p.problem)}\n<span class="t-violet">approach</span> ${esc(p.approach)}\n<span class="t-violet">impact</span>   ${esc(p.impact)}\n<span class="t-violet">stack</span>    ${esc(p.technologies.join(', '))}`);
      },
      skills: () => {
        const groups = {};
        (DATA.skills || []).forEach((s) => { (groups[s.category] = groups[s.category] || []).push(s.name); });
        print(Object.entries(groups).map(([cat, list]) => `<span class="t-violet">${esc(cat.padEnd(9))}</span>${esc(list.join(' · '))}`).join('\n'));
      },
      experience: () => print((DATA.experiences || []).map((e) => `<span class="t-lime">▸ ${esc(e.role)}</span>\n  ${esc(e.company)} <span class="t-dim">· ${esc(e.period)}</span>`).join('\n')),
      education: () => commands.experience(),
      hire: () => {
        print(`Let's build something. <span class="t-lime">Opening the freelance section…</span>\n📧 ${esc(PROFILE.email || '')}${PROFILE.whatsapp ? '\n💬 WhatsApp available' : ''}`);
        setTimeout(() => scrollToTarget('#hire'), 500);
      },
      contact: () => commands.hire(),
      resume: () => { print('Opening resume in a new tab…'); window.open(PROFILE.resume_url || '/static/RESUME.pdf', '_blank', 'noopener'); },
      social: () => print(`GitHub   <a href="${esc(PROFILE.github_url)}" target="_blank" rel="noopener">${esc(PROFILE.github_url)}</a>\nLinkedIn <a href="${esc(PROFILE.linkedin_url)}" target="_blank" rel="noopener">${esc(PROFILE.linkedin_url)}</a>\nEmail    <a href="mailto:${esc(PROFILE.email)}">${esc(PROFILE.email)}</a>`),
      ls: () => print(Object.keys(sections).filter((k) => k !== 'projects' && k !== 'top').map((k) => `<span class="t-cyan">${k}/</span>`).join('  ')),
      cd: (arg) => {
        const target = sections[(arg || '').replace(/\/$/, '')];
        if (!target) return print(`<span class="t-pink">cd: no such section: ${esc(arg || '')}</span> — try ${kw('ls')}`);
        print(`<span class="t-dim">→ ${esc(arg)}</span>`);
        scrollToTarget(target);
      },
      clear: () => { body.innerHTML = ''; },
      date: () => print(new Date().toString()),
      echo: (arg) => print(esc(arg || '')),
      coffee: () => print('☕ brewing… Sinan runs on chai, actually.'),
      sudo: (arg) => {
        if (/hire[- ]?sinan/i.test(arg || '')) {
          print(`<span class="t-lime">[sudo] access granted ✓</span>\nExcellent decision. Sending confetti and opening the contact options…`);
          confetti();
          setTimeout(() => scrollToTarget('#hire'), 1200);
        } else print(`<span class="t-pink">sudo: permission denied.</span> Nice try — maybe ${kw('sudo hire-sinan')}?`);
      },
      rm: () => print('<span class="t-pink">rm: nice try. This portfolio is production-grade.</span>'),
      exit: () => print('There is no exit. Only opportunities. 😄'),
      ask: async (arg) => {
        if (!arg) return print(`usage: ${kw('ask')} what is his strongest project?`);
        const out = print('<span class="t-dim">thinking…</span>');
        let full = '';
        try {
          await streamChat({ question: arg, history: [] }, (t) => { full += t; out.innerHTML = `<span class="t-cyan">twin ›</span> ${esc(full)}`; body.scrollTop = body.scrollHeight; });
          if (!full) out.textContent = 'No answer — try rephrasing.';
        } catch (e) { out.innerHTML = `<span class="t-pink">${esc(e.message)}</span>`; }
      },
    };

    const run = (line) => {
      const raw = line.trim();
      print(esc(raw), 'term-out term-cmd');
      if (!raw) return;
      past.unshift(raw);
      cursor = -1;
      const [name, ...rest] = raw.split(/\s+/);
      const fn = commands[name.toLowerCase()];
      if (fn) fn(rest.join(' '));
      else print(`<span class="t-pink">command not found: ${esc(name)}</span> — type ${kw('help')}, or just ${kw('ask')} ${esc(raw)}`);
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

  /* ── Project modal ─────────────────────────────────────────────────── */
  function initProjects() {
    const modal = $('#projectModal');
    if (!modal) return;
    let current = null;
    const open = (slug) => {
      const p = PROJECTS.find((x) => x.slug === slug);
      if (!p) return;
      current = p;
      modal.style.setProperty('--accent', p.accent);
      $('#modalCat').textContent = p.category;
      $('#modalTitle').textContent = p.title;
      $('#modalMetric').textContent = p.metric;
      $('#modalMetricLabel').textContent = p.metric_label;
      $('#modalProblem').textContent = p.problem;
      $('#modalApproach').textContent = p.approach;
      $('#modalImpact').textContent = p.impact;
      $('#modalTags').innerHTML = p.technologies.map((t) => `<span>${esc(t)}</span>`).join('');
      if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
      lockScroll(true);
    };
    const close = () => { if (modal.open) modal.close(); };
    modal.addEventListener('close', () => lockScroll(false));
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    $('#modalClose').addEventListener('click', close);
    $('#modalAsk').addEventListener('click', () => {
      close();
      scrollToTarget('#top');
      if (current) setTimeout(() => askTwin(`Walk me through the ${current.title} project and why it matters.`), 700);
    });
    $$('.project-card').forEach((card) => {
      card.addEventListener('click', () => open(card.dataset.project));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card.dataset.project); } });
    });
  }

  /* ── Skills filter ─────────────────────────────────────────────────── */
  function initSkills() {
    const filter = $('#skillFilter');
    const bars = $('#skillBars');
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

  /* ── JD match ──────────────────────────────────────────────────────── */
  const SAMPLE_JD = `Machine Learning Engineer — AI Products (Bangalore / Hybrid)

We're looking for an ML Engineer to build and ship AI features used by thousands of customers.

Responsibilities:
- Build LLM-powered features including RAG pipelines and chat assistants
- Train and evaluate classical ML and deep learning models
- Deploy models behind REST APIs and monitor them in production
- Work with product and backend teams to turn prototypes into products

Requirements:
- Strong Python; experience with scikit-learn, TensorFlow or PyTorch
- Hands-on NLP or computer vision experience
- Experience with LLMs, LangChain or similar frameworks
- Backend experience (Django/FastAPI) and REST APIs
- Nice to have: Docker, AWS/GCP, MLOps tooling`;

  function parseReport(text) {
    const score = text.match(/SCORE:?[*\s]*(\d{1,3})/i);
    const section = (name, next) => {
      const re = new RegExp(`${name}:[*\\s]*([\\s\\S]*?)(?:\\**(?:${next})|$)`, 'i');
      const m = text.match(re);
      return m ? m[1].trim() : '';
    };
    const bullets = (s) => s.split('\n').map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
    return {
      score: score ? clamp(Number(score[1]), 0, 100) : null,
      strengths: bullets(section('STRENGTHS', 'GAPS:|VERDICT:')),
      gaps: bullets(section('GAPS', 'VERDICT:')),
      verdict: section('VERDICT', '$^'),
      structured: /STRENGTHS:/i.test(text),
    };
  }

  function initMatch() {
    const form = $('#jdForm');
    if (!form) return;
    const input = $('#jdInput');
    const submit = $('#jdSubmit');
    const result = $('#jdResult');
    const output = $('#jdOutput');
    const gauge = $('#gaugeFg');
    const num = $('#gaugeNum');
    const C = 2 * Math.PI * 52;
    let shownScore = null;

    const setScore = (score) => {
      if (score === shownScore) return;
      shownScore = score;
      const color = score >= 75 ? '#d4ff3f' : score >= 50 ? '#ffd23f' : '#ff5fa2';
      gauge.style.stroke = color;
      gauge.style.color = color;
      gauge.style.strokeDashoffset = String(C * (1 - score / 100));
      const start = performance.now();
      const tick = (now) => {
        const p = clamp((now - start) / 1400, 0, 1);
        num.textContent = Math.round(score * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const render = (text) => {
      const r = parseReport(text);
      if (r.score !== null) { result.classList.remove('loading'); setScore(r.score); }
      if (!r.structured) {
        output.innerHTML = r.score !== null ? '<p class="muted">Writing the breakdown…</p>' : renderRich(text.replace(/SCORE:.*\n?/i, ''));
        return;
      }
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
      submit.disabled = true;
      shownScore = null;
      num.textContent = '--';
      gauge.style.strokeDashoffset = String(C);
      result.classList.add('loading');
      output.innerHTML = '<p class="muted">Reading the JD and comparing it with Sinan’s experience…</p>';
      if (innerWidth < 1100) scrollToTarget(result);
      let full = '';
      try {
        await streamChat({ question: jd, mode: 'jd' }, (t) => { full += t; render(full); });
        if (!full) output.innerHTML = '<p>No analysis came back — please try again.</p>';
        else render(full);
        const r = parseReport(full);
        if (r.score !== null && r.score >= 80) confetti(80);
      } catch (err) {
        output.innerHTML = `<p>${esc(err.message)}</p>`;
      } finally {
        result.classList.remove('loading');
        submit.disabled = false;
      }
    });
  }

  /* ── Freelance brief builder ───────────────────────────────────────── */
  function initBrief() {
    const brief = $('#brief');
    if (!brief) return;
    const state = { services: [], budget: '', timeline: '' };
    const nameEl = $('#briefName');
    const detailsEl = $('#briefDetails');
    const preview = $('#briefPreview');
    const wa = $('#briefWhatsapp');
    const gmail = $('#briefGmail');
    const mobile = window.matchMedia('(pointer: coarse)').matches;

    $$('.chips', brief).forEach((group) => {
      const key = group.dataset.group;
      const multi = group.dataset.multi === 'true';
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const value = btn.textContent.trim();
        if (multi) {
          btn.classList.toggle('on');
          state[key] = $$('button.on', group).map((b) => b.textContent.trim());
        } else {
          const on = !btn.classList.contains('on');
          $$('button', group).forEach((b) => b.classList.remove('on'));
          btn.classList.toggle('on', on);
          state[key] = on ? value : '';
        }
        update(true);
      });
    });

    const compose = () => {
      const name = nameEl.value.trim();
      const details = detailsEl.value.trim();
      const lines = [`Hi Sinan! 👋`, `${name ? `I'm ${name}. ` : ''}I found your portfolio and I'd love to discuss a project.`];
      const facts = [];
      if (state.services.length) facts.push(`• Need: ${state.services.join(', ')}`);
      if (state.budget) facts.push(`• Budget: ${state.budget}`);
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
      if (gmail) {
        gmail.href = mobile
          ? `mailto:${PROFILE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`
          : `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(PROFILE.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
      }
    };

    nameEl.addEventListener('input', () => update(false));
    detailsEl.addEventListener('input', () => update(false));
    $('#briefCopy').addEventListener('click', () => copyText(compose(), 'Message copied — paste it anywhere ✓'));
    [wa, gmail].forEach((btn) => btn && btn.addEventListener('click', () => {
      if (!state.services.length && !detailsEl.value.trim()) toast('Tip: pick a service or add details for a faster reply');
    }));
    update(false);
  }

  /* ── Command palette ───────────────────────────────────────────────── */
  function initPalette() {
    const dialog = $('#palette');
    const input = $('#paletteInput');
    const list = $('#paletteList');
    const openBtn = $('#paletteOpen');
    if (!dialog) return;
    if (!isMac) {
      if (openBtn) openBtn.firstElementChild.textContent = 'Ctrl K';
      $$('.mod-key').forEach((k) => { k.textContent = 'Ctrl'; });
    }

    const go = (sel) => () => scrollToTarget(sel);
    const actions = [
      { icon: '💬', label: 'Ask my AI twin', hint: 'chat', run: () => { scrollToTarget('#top'); setTimeout(() => chatInput?.focus({ preventScroll: true }), 900); } },
      { icon: '🎯', label: 'Check a job description fit', hint: 'recruiters', run: go('#match') },
      { icon: '🤝', label: 'Hire me for a freelance project', hint: 'freelance', run: go('#hire') },
      PROFILE.whatsapp ? { icon: '🟢', label: 'Chat on WhatsApp', hint: 'contact', run: () => window.open(`https://wa.me/${PROFILE.whatsapp}`, '_blank', 'noopener') } : null,
      { icon: '📧', label: 'Copy email address', hint: PROFILE.email, run: () => copyText(PROFILE.email, 'Email copied ✓') },
      { icon: '📄', label: 'Open resume', hint: 'pdf', run: () => window.open(PROFILE.resume_url, '_blank', 'noopener') },
      { icon: '👤', label: 'Go to About', hint: 'section', run: go('#about') },
      { icon: '🧪', label: 'Go to Work', hint: 'section', run: go('#work') },
      { icon: '🧠', label: 'Go to Skills', hint: 'section', run: go('#skills') },
      { icon: '🛤️', label: 'Go to Journey', hint: 'section', run: go('#journey') },
      { icon: '⌨️', label: 'Open the terminal', hint: 'fun', run: () => { scrollToTarget('#about'); setTimeout(() => $('#termInput')?.focus({ preventScroll: true }), 1000); } },
      { icon: '💼', label: 'LinkedIn', hint: 'social', run: () => window.open(PROFILE.linkedin_url, '_blank', 'noopener') },
      { icon: '🐙', label: 'GitHub', hint: 'social', run: () => window.open(PROFILE.github_url, '_blank', 'noopener') },
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
    };
    const open = () => { input.value = ''; sel = 0; render(); dialog.showModal(); lockScroll(true); setTimeout(() => input.focus(), 30); };
    const close = () => { if (dialog.open) dialog.close(); };
    const exec = (i) => {
      const a = filtered[i];
      close();
      if (a) a.run();
      else if (input.value.trim()) { const q = input.value.trim(); scrollToTarget('#top'); setTimeout(() => askTwin(q), 800); }
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
    list.addEventListener('pointermove', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li && Number(li.dataset.i) !== sel) { sel = Number(li.dataset.i); render(); }
    });
    openBtn?.addEventListener('click', open);
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dialog.open ? close() : open(); }
    });
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
    const colors = ['#d4ff3f', '#9b8cff', '#3fffd1', '#ff5fa2', '#ffffff'];
    const parts = Array.from({ length: count }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 18 - 6,
      s: Math.random() * 7 + 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const start = performance.now();
    const tick = (now) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      if (now - start < 3500) requestAnimationFrame(tick); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(tick);
  }

  /* ── Portrait: scan reveal + depth parallax ─────────────────────────── */
  function initPortrait() {
    const portrait = $('#portrait');
    const img = portrait ? $('.color-img', portrait) : null;
    const root = document.documentElement;
    if (!portrait || !img) { root.classList.add('no-photo'); return; }

    const onReady = () => {
      root.classList.add('photo-ok');
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
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          layers.forEach((l) => {
            const d = Number(l.dataset.depth);
            l.style.transform = `translate(${x * d * 22}px, ${y * d * 22}px) scale(1.04)`;
          });
        });
        stage.addEventListener('pointerleave', () => layers.forEach((l) => { l.style.transform = ''; }));
      }
      if (hasGsap) ScrollTrigger.refresh();
    };
    // loading="lazy" won't fetch until near the viewport, so probe eagerly.
    const probe = new Image();
    probe.onload = onReady;
    probe.onerror = () => { root.classList.add('no-photo'); if (hasGsap) ScrollTrigger.refresh(); };
    probe.src = img.getAttribute('src');
  }

  /* ── Small touches ─────────────────────────────────────────────────── */
  function initExtras() {
    $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copyText(b.dataset.copy, 'Email copied ✓')));

    const clock = $('#localTime');
    if (clock) {
      const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: PROFILE.timezone || 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      const set = () => { clock.textContent = fmt.format(new Date()); };
      set();
      setInterval(set, 30000);
    }

    // Konami code → confetti
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    document.addEventListener('keydown', (e) => {
      pos = e.key === code[pos] ? pos + 1 : (e.key === code[0] ? 1 : 0);
      if (pos === code.length) { pos = 0; confetti(220); toast('🎮 Cheat code accepted — hire mode unlocked'); }
    });

    // Tab title when the visitor looks away
    const title = document.title;
    document.addEventListener('visibilitychange', () => { document.title = document.hidden ? '👋 Come back — the AI twin misses you' : title; });

    // eslint-disable-next-line no-console
    console.log('%c👋 Hey, fellow developer!', 'font: 700 16px Inter Tight, sans-serif; color: #d4ff3f');
    // eslint-disable-next-line no-console
    console.log(`%cLike what you see? I'm open to AI/ML roles and freelance work → ${PROFILE.email}`, 'color: #9b8cff');
  }

  // Visitor alert — sent after load so it never slows the page down, and only
  // once per browser tab session so refreshes don't spam notifications.
  function sendVisit() {
    if (storage.get('visitAlertSent')) return;
    storage.set('visitAlertSent', '1');
    const body = JSON.stringify({ referrer: document.referrer || '' });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/visit/', new Blob([body], { type: 'application/json' }));
      else fetch('/api/visit/', { method: 'POST', body, keepalive: true }).catch(() => {});
    } catch (_) {}
  }

  /* ── Boot ──────────────────────────────────────────────────────────── */
  const safe = (fn) => { try { fn(); } catch (err) { console.error(err); } };
  [initCursor, initMagnetic, initNeural, initRoleRotator, initReveal, initCounters, initScrollAnimations,
    initScrollChrome, initCards, initChat, initTerminal, initProjects, initSkills, initMatch, initBrief,
    initPalette, initPortrait, initExtras].forEach(safe);
  safe(runPreloader);
  window.addEventListener('load', sendVisit);
})();
