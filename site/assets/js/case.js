// Shared motion + interaction for project pages. Needs GSAP + ScrollTrigger
// (loaded from cdnjs before this file). Everything degrades to a static page
// if they fail to load or the visitor prefers reduced motion.
(() => {
  const root = document.documentElement;
  root.classList.remove('no-js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // ---------- Endless loops only run while they can be seen ----------
  // Floating pops, screens that loop-scroll their capture, drifting blobs... every
  // repeat:-1 tween made with gsap.to/fromTo (on any page that loads this file first)
  // is paused while its element is well off screen and picks up where it left off when
  // it comes back, so a long page isn't animating dozens of things nobody can see.
  if (hasGsap && 'IntersectionObserver' in window && !gsap.__jbLoops) {
    gsap.__jbLoops = true;
    const loops = new Map(); // element -> Set of tweens
    const io = new IntersectionObserver(es => es.forEach(e => {
      const set = loops.get(e.target); if (!set) return;
      set.forEach(t => {
        if (!t.parent) { set.delete(t); return; } // killed
        if (e.isIntersecting) { if (t.__off) { t.__off = false; t.resume(); } }
        else if (!t.paused()) { t.__off = true; t.pause(); }
      });
    }), { rootMargin: '150px 0px' });
    const watch = (t, v) => {
      if (!v || v.repeat !== -1 || v.paused || v.scrollTrigger) return t;
      t.targets().forEach(el => {
        if (!(el instanceof Element)) return;
        if (!loops.has(el)) { loops.set(el, new Set()); io.observe(el); }
        loops.get(el).add(t);
      });
      return t;
    };
    const to = gsap.to, fromTo = gsap.fromTo;
    gsap.to = function (targets, vars) { return watch(to.apply(this, arguments), vars); };
    gsap.fromTo = function (targets, from, vars) { return watch(fromTo.apply(this, arguments), vars); };
  }

  // ---------- Nav hides on scroll down, returns on scroll up ----------
  const nav = document.querySelector('.site-nav');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav?.classList.toggle('is-hidden', y > 160 && y > lastY && !nav.classList.contains('is-open'));
    lastY = y;
  }, { passive: true });

  // ---------- Highlighter swipes draw in when they enter view ----------
  // Statement marks light up in step with its scroll scrub (home.js), not on entry
  const marks = [...document.querySelectorAll('.hl')].filter(m => !m.closest('[data-scrub-words]'));
  if (reduce || !('IntersectionObserver' in window)) {
    marks.forEach(m => m.classList.add('is-lit'));
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-lit'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    marks.forEach((m, i) => { m.style.transitionDelay = `${(i % 3) * 120 + 200}ms`; io.observe(m); });
  }

  // ---------- Fade-up reveals ----------
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (!hasGsap || reduce) {
    revealEls.forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
  } else {
    ScrollTrigger.batch(revealEls, {
      start: 'top 88%',
      once: true,
      // a jump link (#prices, #print) passes lots at once: anything already scrolled past shows
      // straight away, so what's on screen isn't left waiting at the back of a long stagger
      onEnter: batch => {
        const past = batch.filter(el => el.getBoundingClientRect().bottom < 0);
        const now = batch.filter(el => !past.includes(el));
        if (past.length) gsap.set(past, { opacity: 1, y: 0 });
        if (now.length) gsap.to(now, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: Math.min(0.08, 0.4 / now.length) });
      },
    });
  }

  // ---------- Network canvas (drifting nodes joined by lines) ----------
  window.networkCanvas = (canvas, { color = '#b3dd03', count = 46, link = 130 } = {}) => {
    const ctx = canvas.getContext('2d');
    let w, h, nodes = [], raf, visible = true;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() < 0.18 ? 3.2 : 1.6,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        if (!reduce) { n.x += n.vx; n.y += n.vy; }
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      ctx.strokeStyle = color;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.globalAlpha = (1 - d / link) * 0.5;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = color;
      for (const n of nodes) {
        ctx.globalAlpha = n.r > 2 ? 0.95 : 0.6;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) draw();
    }).observe(canvas);
    addEventListener('resize', () => { size(); if (reduce) draw(); });
    draw();
  };

  // ---------- Phone status bar: add it, and colour it from the capture's top row ----------
  const STATUS_ICONS = '<svg viewBox="0 0 54 12" fill="currentColor" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="6" width="3" height="6" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/><path d="M28 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 28 .4a10.4 10.4 0 0 0-7.2 2.9L22 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 28 4c-1.8 0-3.4.7-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Zm0 3.6c-.5 0-1 .2-1.3.5L28 11.3l1.3-1.4c-.3-.3-.8-.5-1.3-.5Z"/><rect x="39" y="1" width="12.5" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1"/><rect x="40.5" y="2.5" width="8.5" height="7" rx="1.5"/><rect x="52.3" y="4" width="1.5" height="4" rx=".75"/></svg>';
  document.querySelectorAll('.phone').forEach(phone => {
    if (phone.querySelector('.phone__status')) return;
    const display = document.createElement('div');
    display.className = 'phone__display';
    display.append(...phone.childNodes);
    phone.append(display);
    const bar = document.createElement('div');
    bar.className = 'phone__status';
    bar.innerHTML = `<span>9:41</span>${STATUS_ICONS}`;
    display.prepend(bar);
    // A journey video samples its poster frame instead
    const video = phone.querySelector('.screen video');
    let img = phone.querySelector('.screen img');
    if (video?.poster) { img = new Image(); img.src = video.poster; }
    // Only the top two rows of the capture are needed: createImageBitmap crops (and decodes) them
    // off the main thread, instead of drawImage forcing a sync decode of a whole tall page capture
    const tint = () => {
      if ('createImageBitmap' in window) {
        createImageBitmap(img, 0, 0, img.naturalWidth, 2).then(paint, () => paint(img)); return;
      }
      paint(img);
    };
    const paint = src => {
      try {
        const c = document.createElement('canvas');
        c.width = 8; c.height = 1;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (src === img) ctx.drawImage(img, 0, 0, img.naturalWidth, 2, 0, 0, 8, 1);
        else { ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, 8, 1); src.close?.(); }
        const [r, g, b] = ctx.getImageData(4, 0, 1, 1).data;
        display.style.setProperty('--status-bg', `rgb(${r} ${g} ${b})`);
        display.style.setProperty('--status-fg', (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff');
      } catch { /* cross-origin image: keep the default white bar */ }
    };
    if (img?.complete && img.naturalWidth) tint(); else img?.addEventListener('load', tint, { once: true });
  });

  // ---------- Device stage: screens scroll through full-page captures ----------
  document.querySelectorAll('[data-devices]').forEach(stage => {
    const shots = [...stage.querySelectorAll('.screen img')];
    if (!hasGsap || reduce) return;
    const travel = img => () => -Math.max(0, img.offsetHeight - img.parentElement.offsetHeight) * +(stage.dataset.end || 0.86);
    const mm = gsap.matchMedia();
    mm.add('(min-width: 801px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: stage, start: 'center center', end: '+=160%', pin: true, scrub: 0.6, invalidateOnRefresh: true },
      });
      shots.forEach(img => tl.to(img, { y: travel(img), ease: 'none' }, 0));
    });
    mm.add('(max-width: 800px)', () => {
      // On phones, pinning fights the page scroll, so the screens play on a loop
      shots.forEach(img => gsap.to(img, { y: travel(img), duration: 14, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatDelay: 1 }));
    });
    shots.forEach(img => img.complete || img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true }));
  });

  // ---------- Shared: a device screen that loop-scrolls its capture ----------
  // data-start / data-span (0-1) on the device let several screens pan
  // different stretches of one long page.
  const loopScreen = (device, i) => {
    if (device.hasAttribute('data-slides')) return; // slideshows run their own show
    if (device.querySelector('.screen video')) return; // journey videos play themselves
    const img = device.querySelector('.screen img');
    if (!img) return;
    // data-end (0-1, default 0.86) stops short of the capture's footer, which
    // often carries client company details
    const start = +(device.dataset.start || 0), span = +(device.dataset.span || 1);
    const end = +(device.dataset.end || 0.86);
    const travel = () => Math.max(0, img.offsetHeight - img.parentElement.offsetHeight);
    const run = () => gsap.fromTo(img, { y: () => -travel() * Math.min(start, end) }, {
      y: () => -travel() * Math.min(end, start + span),
      duration: (16 + i * 3) * span, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatDelay: 1.2, delay: 1 + i * 0.6,
    });
    img.complete && img.naturalWidth ? run() : img.addEventListener('load', run, { once: true });
  };

  // ---------- Shared: brand pieces pop out with a bounce, then float ----------
  const popIn = (tl, pops, at) => {
    gsap.set(pops, { opacity: 0, scale: 0.3, x: (i, el) => +(el.dataset.fromX || 0), y: (i, el) => +(el.dataset.fromY || 60) });
    tl.to(pops, { opacity: 1, scale: 1, x: 0, y: 0, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.14 }, at)
      .add(() => pops.forEach((p, i) => gsap.to(p, {
        y: i % 2 ? -12 : 12, rotation: i % 2 ? 1.5 : -1.5,
        duration: gsap.utils.random(2.4, 3.6), ease: 'sine.inOut', repeat: -1, yoyo: true,
      })));
  };

  // ---------- Hero stage: Mac + phone playing the site, highlighter squiggle behind,
  // brand pieces around. The standard hero for every web project. ----------
  // A quick highlighter scribble behind the devices, in the brand colour (--stage-hl)
  const SCRIBBLE = 'M70 150 Q 300 90 540 70 Q 300 160 60 250 Q 320 175 560 160 Q 320 260 65 345 Q 330 265 555 255 Q 330 360 110 435 Q 330 375 520 360';
  document.querySelectorAll('[data-stage]').forEach(stage => {
    if (!stage.querySelector('.stage__scribble')) {
      stage.insertAdjacentHTML('afterbegin', `<svg class="stage__scribble" viewBox="0 0 600 500" preserveAspectRatio="none" aria-hidden="true"><path d="${SCRIBBLE}"/></svg>`);
    }
  });
  document.querySelectorAll('[data-stage]').forEach(stage => {
    const devices = [...stage.querySelectorAll('.laptop, .phone')];
    const pops = [...stage.querySelectorAll('.pop')];
    const strokes = [...stage.querySelectorAll('.stage__hl path, .stage__scribble path')];
    if (!hasGsap || reduce) return;
    devices.forEach(loopScreen);
    strokes.forEach(s => { const len = s.getTotalLength(); gsap.set(s, { strokeDasharray: len, strokeDashoffset: len }); });
    gsap.set(devices, { opacity: 0, y: 70 });
    const tl = gsap.timeline({ delay: 0.25, scrollTrigger: { trigger: stage, start: 'top 92%', once: true } });
    tl.to(strokes, { strokeDashoffset: 0, duration: 1.6, ease: 'power1.inOut', stagger: 0.25 })
      .to(devices, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.15 }, 0.15);
    popIn(tl, pops, 0.7);
  });

  // ---------- Journey videos: recorded walks through the real site ----------
  // Each plays only while it's on screen (the swipe row on phones hides some),
  // the first start is staggered so the phones aren't in step, and reduced
  // motion keeps the poster frame.
  // The first start dissolves from the poster (some posters are a later frame)
  const veil = v => {
    if (!v.poster) return;
    const d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = `position:absolute;inset:0;pointer-events:none;background:url("${v.poster}") top center/cover no-repeat;transition:opacity .5s ease`;
    v.after(d);
    v.addEventListener('playing', () => requestAnimationFrame(() => {
      d.style.opacity = '0';
      setTimeout(() => d.remove(), 600);
    }), { once: true });
  };
  const playJourneys = scope => {
    const videos = [...scope.querySelectorAll('.screen video')].filter(v => !v.closest('.phone[data-live]')); // live phones: case-plus.js
    if (!videos.length || reduce || !('IntersectionObserver' in window)) return;
    const started = new WeakSet();
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      const v = e.target;
      clearTimeout(v._jbWait);
      if (!e.isIntersecting) { v.pause(); return; }
      const go = () => { if (!started.has(v)) veil(v); started.add(v); v.play().catch(() => {}); };
      if (started.has(v)) go();
      else v._jbWait = setTimeout(go, 500 + videos.indexOf(v) * 700);
    }), { threshold: 0.35 });
    videos.forEach(v => { v.muted = true; io.observe(v); });
  };

  // ---------- Phone parade: phones rise in and loop-scroll, features pop out ----------
  document.querySelectorAll('[data-parade]').forEach(parade => {
    // data-desktop-only: the page hides this parade on phones, so nothing runs there and it never becomes a deck
    const desktopOnly = parade.hasAttribute('data-desktop-only');
    if (desktopOnly && matchMedia('(max-width: 760px)').matches) return;
    const phones = [...parade.querySelectorAll('.phone')];
    const pops = [...parade.querySelectorAll('.pop')];
    const row = parade.querySelector('.parade__row');
    // Live phones (data-live, case-plus.js) run real pages: keep them flat and on whole pixels
    // once they have stood up, so the sites' text stays pin-sharp (no tilt, no 3D layers)
    const crisp = !!parade.querySelector('.phone[data-live]');
    playJourneys(parade);
    if (!hasGsap || reduce) return;
    if (crisp && row) row.style.willChange = 'auto';
    phones.forEach(loopScreen);
    const mid = (phones.length - 1) / 2;
    const narrow = () => innerWidth <= 800;
    // Phones start laid back on the table and stand up into place, one by one
    gsap.set(phones, { opacity: 0, y: 160, z: -260, rotationX: 62, rotationY: i => (i - mid) * -14, transformOrigin: '50% 100%', transformPerspective: 1400 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: parade, start: 'top 72%', once: true } });
    tl.to(phones, { opacity: 1, y: 0, z: 0, rotationX: 0, rotationY: 0, duration: 1.5, ease: 'expo.out', stagger: 0.12 });
    if (crisp) tl.call(() => gsap.set(phones, { clearProps: 'transform' }), null, 1.5 + 0.12 * (phones.length - 1));
    // Pieces fly forward out of the screens instead of just scaling up
    gsap.set(pops, { transformPerspective: 900 });
    tl.from(pops, { rotationX: -50, rotationY: (i) => (i % 2 ? 30 : -30), z: -200, duration: 1, ease: 'expo.out', stagger: 0.14 }, '-=0.7');
    popIn(tl, pops, '<');

    // Desktop: as the section scrolls by, the phones drift at different speeds
    // (outer ones more), staying upright, and the pop-outs drift in depth
    gsap.matchMedia().add('(min-width: 801px)', () => {
      const st = { trigger: parade, start: 'top bottom', end: 'bottom top', scrub: 1 };
      tl.eventCallback('onComplete', () => {
        phones.forEach((p, i) => {
          const k = i - mid;
          if (crisp) {
            const px = dir => () => Math.round((dir * p.offsetHeight * (5 + Math.abs(k) * 4)) / 100);
            gsap.fromTo(p, { y: px(1) }, { y: px(-1), ease: 'none', force3D: false, modifiers: { y: v => `${Math.round(parseFloat(v))}px` }, scrollTrigger: { ...st, invalidateOnRefresh: true } });
          } else gsap.fromTo(p, { yPercent: 5 + Math.abs(k) * 4 }, { yPercent: -5 - Math.abs(k) * 4, ease: 'none', scrollTrigger: st });
        });
        pops.forEach((p, i) => gsap.fromTo(p, { z: 40 }, { z: 140 + (i % 3) * 40, ease: 'none', scrollTrigger: st }));
      });
    });

    // Phones: in the swipe row the side phones sit slightly smaller than the centre one
    if (row) {
      let raf = 0;
      const flow = () => {
        raf = 0;
        if (!narrow()) return;
        const rr = row.getBoundingClientRect(), c = rr.left + rr.width / 2;
        const ds = phones.map(p => { const r = p.getBoundingClientRect(); return Math.abs(gsap.utils.clamp(-1.4, 1.4, (r.left + r.width / 2 - c) / rr.width)); });
        const near = crisp ? Math.min(...ds) : 0; // live phones: the one nearest the centre sits at exactly 1, so its text stays crisp
        phones.forEach((p, i) => {
          gsap.set(p, { scale: 1 - Math.min(ds[i] - near, 1) * 0.14, transformOrigin: '50% 50%', force3D: crisp ? false : 'auto' });
        });
      };
      row.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(flow); }, { passive: true });
      tl.eventCallback('onComplete', (prev => () => { prev?.(); flow(); })(tl.eventCallback('onComplete')));
    }

    // Phones: a deck instead of a row. One phone at a time, sliding on to the next with a
    // motion blur; a caption pill (as on the films) names the screen and fills as it plays.
    // Auto-advances while on screen; arrows and a swipe step through it.
    const names = [...parade.querySelectorAll('.parade__caption span')].map(s => s.textContent);
    if (row && phones.length > 1 && !desktopOnly) gsap.matchMedia().add('(max-width: 800px)', () => {
      const HOLD = +parade.dataset.hold || 6.5; // seconds per screen; a page can set data-hold
      let cur = 0, timer = null, live = false;
      parade.classList.add('is-deck');
      phones.forEach((p, i) => p.classList.toggle('is-on', i === 0));
      row.insertAdjacentHTML('afterend', `<div class="parade__deck"><button type="button" class="parade__nav" data-d="-1" aria-label="Previous screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><div class="parade__now" aria-live="polite"><b></b><strong></strong><i><em></em></i></div><button type="button" class="parade__nav" data-d="1" aria-label="Next screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>`);
      const deck = row.nextElementSibling, now = deck.querySelector('.parade__now'), bar = deck.querySelector('em');
      const label = () => {
        now.querySelector('b').textContent = String(cur + 1).padStart(2, '0');
        now.querySelector('strong').textContent = names[cur] || `Screen ${cur + 1}`;
        gsap.fromTo(now, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(2)', overwrite: true });
      };
      const tick = () => {
        timer?.kill();
        timer = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: HOLD, ease: 'none', paused: !live, onComplete: () => go(cur + 1, 1) });
      };
      const go = (k, dir) => {
        k = (k + phones.length) % phones.length;
        if (k === cur) return;
        // both phones move together on one curve, transform + opacity only (GPU), so it stays smooth
        // over live sites; a light blur rides on the phone that's leaving
        const a = phones[cur], b = phones[k], T = 0.75, ease = 'power3.inOut';
        cur = k;
        a.classList.remove('is-on'); a.classList.add('is-leaving'); b.classList.add('is-on');
        gsap.killTweensOf([a, b]);
        gsap.set([a, b], { willChange: 'transform, opacity', force3D: true });
        gsap.to(a, { xPercent: -105 * dir, rotation: -5 * dir, scale: 0.9, opacity: 0, filter: 'blur(4px)', duration: T, ease,
          onComplete: () => { a.classList.remove('is-leaving'); gsap.set(a, { clearProps: 'transform,opacity,filter,willChange' }); } });
        gsap.fromTo(b, { xPercent: 105 * dir, rotation: 5 * dir, scale: 0.9, opacity: 0 },
          { xPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: T, ease, clearProps: 'transform,opacity,willChange' });
        label(); tick();
      };
      deck.addEventListener('click', e => { const n = e.target.closest('.parade__nav'); if (n) go(cur + +n.dataset.d, +n.dataset.d); });
      let x0 = null;
      row.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
      row.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }, { passive: true });
      const io = new IntersectionObserver(([e]) => { live = e.isIntersecting; if (timer) live ? timer.play() : timer.pause(); }, { threshold: 0.4 });
      io.observe(row);
      label(); tick();
      return () => {
        io.disconnect(); timer?.kill(); deck.remove(); parade.classList.remove('is-deck');
        phones.forEach(p => { p.classList.remove('is-on', 'is-leaving'); gsap.set(p, { clearProps: 'opacity,filter' }); });
      };
    });

    // The whole row tilts gently towards the pointer
    if (row && !crisp && matchMedia('(hover: hover) and (min-width: 801px)').matches) {
      const rx = gsap.quickTo(row, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      const ry = gsap.quickTo(row, 'rotationY', { duration: 0.8, ease: 'power3.out' });
      parade.addEventListener('pointermove', e => {
        const r = parade.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 8);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 6);
      });
      parade.addEventListener('pointerleave', () => { rx(0); ry(0); });
    }
  });

  // ---------- Feature reel: pinned, steps through live features on scroll ----------
  document.querySelectorAll('[data-reel]').forEach(reel => {
    const slides = [...reel.querySelectorAll('.reel__slide')];
    const items = [...reel.querySelectorAll('.reel__list li')];
    const stage = reel.querySelector('.reel__stage');
    const pin = reel.querySelector('.reel__pin');
    const wide = () => innerWidth > 900;
    // mobile labels come from the list titles
    items.forEach((li, k) => {
      if (!slides[k] || slides[k].querySelector('.reel__label')) return;
      const lab = document.createElement('p'); lab.className = 'reel__label';
      lab.innerHTML = `${li.querySelector('b').textContent}<small>${li.querySelector('em')?.textContent || ''}</small>`;
      slides[k].prepend(lab);
    });
    // scale each feature down to fit its stage, never up
    const fit = () => slides.forEach(s => {
      const f = s.querySelector('.reel__fit'); if (!f) return;
      f.style.transform = 'none';
      if (!wide()) return;
      const cs = getComputedStyle(s);
      const lab = s.querySelector('.reel__label');
      const availW = s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const availH = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (lab && getComputedStyle(lab).display !== 'none' ? lab.offsetHeight + 12 : 0);
      const r = f.getBoundingClientRect();
      const k = Math.min(1, availW / Math.max(f.scrollWidth, r.width), availH / Math.max(f.scrollHeight, r.height));
      f.style.transform = k < 1 ? `scale(${k})` : 'none';
    });
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => fit()); slides.forEach(s => { const f = s.querySelector('.reel__fit'); f && ro.observe(f.firstElementChild || f); }); }
    addEventListener('resize', fit); addEventListener('load', fit); setTimeout(fit, 400);
    let active = -1;
    const show = n => {
      if (n === active) return; active = n;
      slides.forEach((s, k) => s.classList.toggle('is-on', k === n));
      items.forEach((li, k) => li.classList.toggle('is-on', k === n));
    };
    show(0);
    if (!hasGsap || reduce) {
      items.forEach((li, k) => li.querySelector('button').addEventListener('click', () => show(k)));
      return;
    }
    gsap.matchMedia().add('(min-width: 901px)', () => {
      const n = slides.length;
      const st = ScrollTrigger.create({
        trigger: pin, start: 'center center', end: () => `+=${n * innerHeight * 0.75}`, pin: true, scrub: true,
        onUpdate: self => {
          const p = self.progress * n;
          const k = Math.min(n - 1, Math.floor(p));
          show(k);
          items.forEach((li, j) => { const bar = li.querySelector('i'); if (bar) bar.style.transform = `scaleX(${j < k ? 1 : j === k ? p - k : 0})`; });
        },
      });
      const onClick = k => () => {
        const y = st.start + (st.end - st.start) * ((k + 0.5) / n);
        window.lenis ? window.lenis.scrollTo(y) : scrollTo({ top: y, behavior: 'smooth' });
      };
      const handlers = items.map((li, k) => { const h = onClick(k); li.querySelector('button').addEventListener('click', h); return h; });
      return () => { st.kill(); items.forEach((li, k) => li.querySelector('button').removeEventListener('click', handlers[k])); };
    });
  });

  // ---------- Asset board: frames pop in on a timeline, then float ----------
  document.querySelectorAll('[data-board]').forEach(board => {
    const frames = [...board.querySelectorAll('.frame')];
    const playhead = board.querySelector('.board__playhead');
    const track = board.querySelector('.board__timeline');
    if (!hasGsap || reduce) return;
    gsap.set(frames, { opacity: 0, y: 60, scale: 0.86, rotation: () => gsap.utils.random(-5, 5) });
    const tl = gsap.timeline({ scrollTrigger: { trigger: board, start: 'top 70%', once: true } });
    tl.to(frames, {
      opacity: 1, y: 0, scale: 1, rotation: 0,
      duration: 0.9, ease: 'back.out(1.6)', stagger: 0.14,
    });
    if (playhead && track) {
      tl.fromTo(playhead, { x: 0 }, { x: () => track.offsetWidth - 2, duration: tl.duration(), ease: 'none' }, 0);
    }
    tl.add(() => frames.forEach((f, i) => {
      gsap.to(f.querySelector('.frame__body'), {
        y: i % 2 ? -8 : 8, rotation: i % 3 === 0 ? 0.8 : -0.6,
        duration: gsap.utils.random(2.6, 3.8), ease: 'sine.inOut', repeat: -1, yoyo: true, delay: i * 0.12,
      });
    }));
  });

  // ---------- Count-up numbers ----------
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const fmt = v => Math.round(v).toLocaleString('en-GB') + suffix;
    if (!hasGsap || reduce) { el.textContent = fmt(end); return; }
    const obj = { v: 0 };
    el.textContent = fmt(0);
    gsap.to(obj, {
      v: end, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => { el.textContent = fmt(obj.v); },
    });
  });

  // ---------- Lightbox for anything with data-zoom ----------
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Image preview');
  box.innerHTML = '<div class="lightbox__frame"><img alt=""></div><button class="lightbox__close" aria-label="Close preview"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l12 12M15 3L3 15"/></svg></button>';
  document.body.append(box);
  const boxImg = box.querySelector('img');
  let opener = null;
  const close = () => { box.classList.remove('is-open'); document.body.style.overflow = ''; opener?.focus(); };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-zoom]');
    if (!t) return;
    const img = t.tagName === 'IMG' ? t : t.querySelector('img');
    const src = t.dataset.zoom || img?.currentSrc || img?.src;
    if (!src) return;
    opener = t;
    boxImg.src = src;
    boxImg.alt = img?.alt || '';
    box.classList.toggle('is-tall', t.hasAttribute('data-tall'));
    box.classList.add('is-open');
    box.querySelector('.lightbox__frame').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox__close').focus();
  });
  box.addEventListener('click', e => { if (!e.target.closest('.lightbox__frame') || e.target.closest('.lightbox__close')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('is-open')) close(); });
  document.querySelectorAll('[data-zoom]').forEach(el => {
    if (!el.matches('a, button')) { el.tabIndex = 0; el.setAttribute('role', 'button'); }
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  });

  // ---------- Magnifier lens on close-ups ----------
  document.querySelectorAll('.closeup__view').forEach(view => {
    const img = view.querySelector('img');
    const lens = document.createElement('span');
    lens.className = 'lens';
    view.append(lens);
    const ZOOM = 2.2;
    view.addEventListener('pointermove', e => {
      const r = view.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      lens.style.left = `${x}px`; lens.style.top = `${y}px`;
      lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
      lens.style.backgroundSize = `${r.width * ZOOM}px ${img.offsetHeight * ZOOM}px`;
      lens.style.backgroundPosition = `${-(x * ZOOM - 95)}px ${-(y * ZOOM - 95)}px`;
    });
  });

  // ---------- Swatches copy their hex on click ----------
  document.querySelectorAll('.swatch').forEach(s => s.addEventListener('click', async () => {
    const hex = s.querySelector('code')?.textContent.trim();
    try { await navigator.clipboard.writeText(hex); } catch { return; }
    s.classList.add('is-copied');
    setTimeout(() => s.classList.remove('is-copied'), 1400);
  }));

  // ---------- Logo stage background switcher ----------
  document.querySelectorAll('[data-logo-stage]').forEach(stage => {
    const buttons = stage.querySelectorAll('[data-bg]');
    buttons.forEach(b => b.addEventListener('click', () => {
      buttons.forEach(x => x.setAttribute('aria-pressed', x === b));
      stage.style.background = b.dataset.bg;
      stage.style.color = b.dataset.fg;
      stage.style.setProperty('--lime', b.dataset.accent || '');
    }));
  });

  // ---------- "What I did": folded away on phones behind a tap-to-open bar ----------
  document.querySelectorAll('.cs-brief__list').forEach((list, n) => {
    const label = list.previousElementSibling;
    if (!label) return;
    list.id ||= `cs-brief-list-${n}`;
    label.classList.add('cs-brief__label');
    [...list.children].forEach((li, i) => li.style.setProperty('--k', i)); // items cascade in when it opens
    label.insertAdjacentHTML('afterend', `<button type="button" class="cs-brief__toggle" aria-expanded="false" aria-controls="${list.id}"><span>${label.textContent}</span><em>${list.children.length}</em><i aria-hidden="true"></i></button>`);
    const btn = label.nextElementSibling;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      list.parentElement.classList.toggle('is-open', open);
      if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 520); // the page below moved
    });
  });

  addEventListener('load', () => { if (hasGsap) { ScrollTrigger.sort(); ScrollTrigger.refresh(); } });
})();
