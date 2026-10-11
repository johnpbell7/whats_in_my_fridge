// Case study extras (see case-plus.css): films with steps that follow the video,
// close-up clips that play when seen, and the contact form. Load after case.js.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SAFE = 0.085; // the film's phone: a status-bar band (share of its height) above the site, clear of the island

  // Videos only play while on screen (and never on their own with reduced motion)
  const watch = (video, onShow) => {
    video.muted = true; video.playsInline = true;
    if (reduce) { video.controls = true; return; }
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (video.preload === 'none') video.preload = 'auto'; video.play().catch(() => {}); onShow?.(); }
      else video.pause();
    }, { threshold: 0.35 }).observe(video);
  };

  // ---------- Film: steps light up as the recording reaches them; click one to jump ----------
  // ---------- Live film: the real site running in the browser frame (data-live) ----------
  // The page named in data-live is a trimmed copy of the site (assets/live/<site>/) that
  // loads assets/live/driver.js, which plays its journey.json: cursor, scrolls, hovers and
  // clicks on the real pages. It renders at 1440x900 CSS and is scaled to the frame, so it
  // stays sharp at any size. This side swaps pages with a crossfade, follows the steps,
  // and turns the window into a phone running the same site at 390px for the last step.
  function liveFilm(film) {
    const browser = film.querySelector('.cp-browser'), stage = film.querySelector('.cp-film__stage');
    const list = film.querySelector('.cp-steps'), items = $$('li', list);
    const bar = browser.querySelector('.cp-browser__bar'), video = browser.querySelector('video');
    const src = new URL(film.dataset.live, location.href).href;
    // phones run the desktop site at 1280x800 rather than 1440x900: a little bigger in the frame, and still
    // tall enough for the sites' full-height sections (shorter than ~800px and they collapse onto each other)
    const small = innerWidth <= 760;
    const VW = small ? 1280 : +film.dataset.liveWidth || 1440, VH = small ? 800 : +film.dataset.liveHeight || 900, MW = +film.dataset.liveMobile || 390;
    const box = document.createElement('div');
    box.className = 'cp-live';
    box.style.cssText = `--vw:${VW};--vh:${VH}`;
    if (video?.poster) box.style.backgroundImage = `url("${video.poster}")`;
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', video?.getAttribute('aria-label') || 'The site running live');
    video ? video.replaceWith(box) : browser.append(box);

    let active = null, incoming = null, mframe = null, mReady = false;
    let seen = false, phone = false, phoneAt = false, on = -1, tl = null, refreshed = false;
    const S = { on: false, armed: false }; // S.on: scroll-driven mode (no longer used; the film plays by itself)
    const resume = new Map(); // frame -> where its driver should pick up once it is ready
    const send = (f, m) => f?.contentWindow?.postMessage(m, location.origin);
    const live = () => seen && !document.hidden && !reduce;
    const frame = (url, parent, cls) => {
      const f = document.createElement('iframe');
      f.className = cls; f.src = url; f.tabIndex = -1; f.title = 'Live site';
      f.setAttribute('aria-hidden', 'true'); f.setAttribute('inert', '');
      parent.append(f); return f;
    };
    const showRow = li => { if (!S.on) list.scrollTo({ left: li.offsetLeft - list.offsetLeft - 2, behavior: reduce ? 'auto' : 'smooth' }); };
    const highlight = k => {
      if (k === on || !items[k]) return;
      on = k;
      items.forEach((li, i) => { li.classList.toggle('is-on', i === k); if (i !== k) li.style.removeProperty('--p'); });
      items[k].style.setProperty('--p', 0);
      showRow(items[k]);
      if (k === items.length - 1) prepMobile();
    };
    // the new page fades in over the old one, then the old one goes
    const swap = () => {
      const old = active; active = incoming; incoming = null;
      requestAnimationFrame(() => active.classList.remove('is-in'));
      setTimeout(() => { if (old && old !== active) { resume.delete(old); old.remove(); } }, 700);
    };
    // jump to a step from any state: stops whatever was in flight, cancels a page load
    const jump = (i, auto) => {
      if (incoming) { resume.delete(incoming); incoming.remove(); incoming = null; }
      on = -1; highlight(i);
      const m = { live: 'goto', i, fresh: true, play: auto ? live() : true, hold: (reduce && !auto) || S.on };
      if (!active) return;
      if (active.dataset.ready) send(active, m); else resume.set(active, m);
    };

    addEventListener('message', e => {
      const m = e.data;
      if (e.origin !== location.origin || !m || typeof m.live !== 'string') return;
      const f = [active, incoming, mframe].find(x => x && x.contentWindow === e.source);
      if (!f) return;
      if (m.live === 'ready') {
        f.dataset.ready = '1';
        const r = resume.get(f); resume.delete(f);
        if (f === mframe) { mReady = true; if (r) send(f, { ...r, live: 'goto', track: 'mobile', play: live() && phone }); else if (phoneAt) startMobile(); return; }
        const go = { live: 'goto', i: 0, ...r };
        go.play = go.hold ? true : live() && !phone; // a held step (reduced motion) was asked for by a click
        if (S.on && !r) { go.hold = true; go.play = false; } // scroll-driven: wait, still, for the pin to pick a step
        send(f, go);
        if (S.on && !refreshed) { refreshed = true; requestAnimationFrame(() => ScrollTrigger.refresh()); }
        if (f === incoming) swap(); else f.classList.remove('is-in');
      } else if (m.live === 'nav') {
        if (f === mframe) { mframe.dataset.ready = ''; resume.set(mframe, { i: m.i, at: m.at, cursor: m.cursor }); mframe.src = m.href; }
        else if (f === active) {
          if (incoming) incoming.remove();
          incoming = frame(m.href, box, 'cp-live__frame is-in');
          resume.set(incoming, { i: m.i, at: m.at, cursor: m.cursor, hold: reduce || S.on });
        }
      } else if (m.live === 'leaving' && f === active) {
        f.dataset.ready = ''; resume.set(f, { i: m.i, at: m.at, cursor: m.cursor });
      } else if (m.live === 'step' && f === active && !phone) highlight(m.i);
      else if (m.live === 'progress') {
        const li = f === mframe ? mItem : f === active && !phone && m.i === on ? items[m.i] : null;
        li?.style.setProperty('--p', m.p);
      } else if (m.live === 'end') {
        if (S.on) return; // scroll-driven: the phone stays until the page scrolls back
        if (f === mframe) { if (hasGsap && !autoLeave) autoLeave = gsap.delayedCall(1, () => { autoLeave = null; leavePhone(); }); }
        else if (f === active && !phone) { if (mItem) enterPhone(); else jump(0, true); }
      }
    });

    items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => {
      if (S.on && S.go) S.go(i); // the scroll position picks the step
      else if (phone) leavePhone(() => jump(i)); else jump(i);
    }));

    // play only while on screen; load a little before it gets there, and unload the live
    // site once the film is well off screen (its poster shows), so it stops using the main thread
    let drop = 0;
    new IntersectionObserver(([e]) => {
      clearTimeout(drop);
      if (e.isIntersecting) { if (!active) { on = -1; active = frame(src, box, 'cp-live__frame is-in'); } }
      else if (active) drop = setTimeout(unloadFilm, 1200);
    }, { rootMargin: '300px 0px' }).observe(stage);
    function unloadFilm() {
      if (phone && tl) { tl.progress(0).kill(); tl = null; resetPhone?.(); }
      [active, incoming, mframe].forEach(f => f?.remove());
      active = incoming = mframe = null; mReady = false; phone = phoneAt = false;
      resume.clear(); on = -1;
    }
    let resetPhone = null;
    const playPause = () => {
      [active, mframe].forEach(f => send(f, { live: 'pause' }));
      if (live() && (!S.on || S.armed)) send(phone ? (phoneAt ? mframe : null) : active, { live: 'play' });
    };
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; playPause(); }, { threshold: 0.3 }).observe(stage);
    document.addEventListener('visibilitychange', playPause);

    // ---- Mobile responsive: the window narrows into a phone running the site at 390px ----
    let mItem = null, layer = null, island = null, autoLeave = null, leaving = false, queued = null;
    if (!hasGsap) return;
    const n = String(items.length + 1).padStart(2, '0');
    list.insertAdjacentHTML('beforeend', `<li class="cp-steps__mobile"><button type="button"><b>${n}</b><strong>On a phone</strong><span>${film.dataset.mobileLine || 'The same site, laid out for phones.'}</span></button><i></i></li>`);
    mItem = list.lastElementChild;
    browser.insertAdjacentHTML('beforeend', '<div class="cp-browser__mobile" aria-hidden="true"></div><i class="cp-browser__island" aria-hidden="true"></i>');
    layer = browser.querySelector('.cp-browser__mobile'); island = browser.querySelector('.cp-browser__island');
    // the phone is the frame's height / 2.05 wide; the site renders at 390px CSS and is scaled to it
    // the site starts below a status-bar band (SAFE of the height), as on a real phone, so the island never covers its header
    const sizeMobile = () => {
      const H = browser.offsetHeight, w = Math.round(H / 2.05), s = w / MW, top = Math.round(H * SAFE);
      Object.assign(mframe.style, { width: `${MW}px`, height: `${Math.ceil((H - top) / s)}px`, top: `${top}px`, left: `calc(50% - ${w / 2}px)`, transform: `scale(${s})` });
    };
    function prepMobile() { if (!mframe && layer) { mReady = false; mframe = frame(src, layer, 'cp-live__m'); sizeMobile(); } }
    const startMobile = () => send(mframe, { live: 'goto', i: 0, track: 'mobile', play: live(), hold: reduce });
    const build = () => {
      const W = browser.offsetWidth, H = browser.offsetHeight, w = Math.round(H / 2.05);
      stage.style.minHeight = `${stage.offsetHeight}px`;
      sizeMobile();
      gsap.set(browser, { width: W, height: H });
      gsap.set(box, { width: box.offsetWidth });
      tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
        .to(bar, { height: 0, opacity: 0, paddingBlock: 0, borderBottomWidth: 0, duration: 0.6 }, 0)
        .to(browser, { width: w, borderRadius: w * 0.16, duration: 1.2 }, 0)
        .to(browser, { '--ring': `${Math.max(5, w * 0.035)}px`, duration: 0.8 }, 0.35)
        .to(layer, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 0.5)
        .to(island, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 1.05);
    };
    const reset = () => {
      gsap.set(browser, { clearProps: 'width,height,borderRadius,--ring' }); gsap.set([bar, layer, island], { clearProps: 'all' }); gsap.set(box, { clearProps: 'width' });
      stage.style.minHeight = ''; mItem.classList.remove('is-on'); mItem.style.removeProperty('--p');
      mframe?.remove(); mframe = null; mReady = false; phone = false; phoneAt = false;
      autoLeave?.kill(); autoLeave = null; leaving = false;
    };
    resetPhone = reset;
    function enterPhone() {
      if (phone) return;
      phone = true; phoneAt = false;
      send(active, { live: 'pause' }); prepMobile(); build();
      items.forEach(li => li.classList.remove('is-on')); on = -1;
      mItem.classList.add('is-on'); mItem.style.setProperty('--p', 0); showRow(mItem);
      const arrive = () => { phoneAt = true; if (mReady) startMobile(); };
      if (reduce) { tl.progress(1); arrive(); } else { tl.eventCallback('onComplete', arrive); tl.play(0); }
    }
    // re-entrant safe: a step clicked while the phone is (about to be) leaving keeps its goto,
    // and the automatic morph back can't replace it with step 0
    function leavePhone(then) {
      if (!phone || !tl) return;
      if (typeof then === 'function') queued = then;
      if (autoLeave && typeof then === 'function') { autoLeave.kill(); autoLeave = null; }
      if (leaving) return;
      leaving = true;
      phoneAt = false; send(mframe, { live: 'pause' });
      tl.eventCallback('onComplete', null);
      const done = () => { const t = queued; queued = null; reset(); if (t) t(); else jump(0, true); };
      if (reduce) { done(); return; }
      tl.eventCallback('onReverseComplete', done); tl.timeScale(1.8).reverse();
    }
    mItem.querySelector('button').addEventListener('click', () => { if (S.on && S.go) { S.go(items.length); return; } if (incoming) { incoming.remove(); incoming = null; } enterPhone(); });
    S.activate = k => {
      S.armed = true;
      if (k >= items.length) { if (incoming) { incoming.remove(); incoming = null; } enterPhone(); return; }
      if (phone) leavePhone(() => jump(k)); else jump(k);
    };
    let lastW = innerWidth; // only a change of width rebuilds (phone toolbars change the height)
    addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; if (phone) { tl.progress(0).kill(); reset(); jump(0, true); } });
  }

  // ---------- Live parade: phones running the real site (data-live on a parade .phone) ----------
  // Each phone names its start page and its journey track (see assets/live/README.md, "Parade"):
  //   <div class="phone" data-live="../assets/live/<site>/index.html" data-live-journey="journey.json#home">
  // The page renders at 390px CSS and is scaled to the screen. Loops are phase-locked to one
  // parade clock (data-live-loop, default 8500ms; each phone's phase is data-live-at, default
  // evenly spread), so the phones take turns instead of acting together. A phone plays only
  // while at least half of it is on screen; with reduced motion each shows its start screen.
  function liveParade(parade) {
    const phones = $$('.phone[data-live]', parade);
    if (!phones.length || !('IntersectionObserver' in window)) return;
    const LOOP = +parade.dataset.liveLoop || 8500; // journeys run at double speed (driver.js SPEED)
    const uid = Math.random().toString(36).slice(2, 7);
    const P = phones.map((ph, i) => {
      const screen = ph.querySelector('.screen'), video = screen && screen.querySelector('video');
      const box = document.createElement('div');
      box.className = 'lv-screen';
      box.style.setProperty('--vw', +ph.dataset.liveWidth || 390);
      if (video?.poster) box.style.backgroundImage = `url("${video.poster}")`;
      box.setAttribute('role', 'img');
      box.setAttribute('aria-label', video?.getAttribute('aria-label') || ph.dataset.liveLabel || 'The site running live on a phone');
      if (video) video.replaceWith(box); else (screen || ph).append(box);
      return { ph, box, i, src: new URL(ph.dataset.live, location.href).href, journey: ph.dataset.liveJourney || '',
        store: `parade-${uid}-${i}`, at: ph.dataset.liveAt != null ? +ph.dataset.liveAt : (i * LOOP) / phones.length,
        frame: null, incoming: null, state: 'idle', seen: false, slot: 0, resume: new Map() };
    });
    let near = false, seen = false, clock = 0, last = 0, ticking = false;
    const live = () => seen && !document.hidden && !reduce;
    const send = (f, m) => f?.contentWindow?.postMessage(m, location.origin);
    // the page is 390px wide and as tall as the screen's shape allows; whole-pixel sizes keep text crisp
    const fit = p => {
      const vw = +p.box.style.getPropertyValue('--vw'), w = p.box.clientWidth, h = p.box.clientHeight;
      if (!w) return;
      p.box.style.setProperty('--k', w / vw);
      p.box.style.setProperty('--vh', Math.round((h * vw) / w));
    };
    const ro = 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(e => { const p = P.find(q => q.box === e.target); if (p) fit(p); })) : null;
    P.forEach(p => { fit(p); ro?.observe(p.box); });

    const frame = (p, url) => {
      const f = document.createElement('iframe');
      f.className = 'lv-screen__frame is-in'; f.tabIndex = -1; f.title = 'Live site';
      f.setAttribute('aria-hidden', 'true'); f.setAttribute('inert', '');
      if (p.journey) f.dataset.liveJourney = p.journey;
      f.dataset.liveStore = p.store;
      f.src = url; p.box.append(f); return f;
    };
    const nextSlot = p => p.at + Math.ceil(Math.max(0, clock - p.at) / LOOP) * LOOP;
    const running = () => P.some(q => q.state === 'run' && q.seen);
    const playOrPause = p => send(p.frame, { live: p.state === 'run' && p.seen && live() ? 'play' : 'pause' });

    // one clock for the parade: it runs while the parade is on screen
    const tick = t => {
      ticking = false;
      const dt = last ? Math.min(100, t - last) : 0; last = t;
      if (live()) clock += dt;
      P.forEach(p => {
        if (p.state !== 'armed' || !p.seen || !live()) return;
        if (clock >= p.slot || !running()) { p.state = 'run'; send(p.frame, { live: 'play' }); }
      });
      if (near && !reduce) { ticking = true; requestAnimationFrame(tick); } else last = 0;
    };
    const wake = () => { if (!ticking && near && !reduce) { ticking = true; requestAnimationFrame(tick); } };

    // Which phones keep a live page loaded: none until the parade is near the viewport; in the
    // phone deck only the phone on show (the rest show their poster, the start screen, and load
    // when they slide in); otherwise every phone.
    // Pages load one at a time, the phone on show (or the earliest phase) first, so they
    // don't all load at once; a page that's no longer wanted is unloaded, so off-screen
    // sites don't keep running their own animations on the page's main thread.
    const deckOn = () => parade.classList.contains('is-deck');
    const wanted = p => {
      if (!near) return false;
      if (!deckOn()) return true;
      const k = P.findIndex(q => q.ph.classList.contains('is-on'));
      return k < 0 ? p.i === 0 : p === P[k];
    };
    const unload = p => {
      clearTimeout(p.rewind); clearTimeout(p.bootNext); clearTimeout(p.drop); p.drop = 0; p.bootNext = 0; p.loading = false;
      p.frame?.remove(); p.incoming?.remove(); p.frame = p.incoming = null;
      p.resume.clear(); p.state = 'idle';
      try { delete window.__liveStores?.[p.store]; } catch (err) {}
    };
    const boot = () => {
      P.forEach(p => {
        if (wanted(p)) { clearTimeout(p.drop); p.drop = 0; }
        else if (p.frame && !p.drop) p.drop = setTimeout(() => { p.drop = 0; if (!wanted(p)) { unload(p); } }, 1200); // after the slide/scroll settles
      });
      if (P.some(p => p.loading)) return;
      const p = P.filter(q => wanted(q) && !q.frame).sort((a, b) => (shown(b) - shown(a)) || (a.at - b.at))[0];
      if (!p) return;
      p.loading = true; p.state = 'loading';
      p.frame = frame(p, p.src);
      p.bootNext = setTimeout(() => { p.loading = false; boot(); }, 2500); // don't wait forever on a slow page
    };

    addEventListener('message', e => {
      const m = e.data;
      if (e.origin !== location.origin || !m || typeof m.live !== 'string') return;
      let p = null, f = null;
      for (const q of P) { if (q.frame?.contentWindow === e.source) { p = q; f = q.frame; } else if (q.incoming?.contentWindow === e.source) { p = q; f = q.incoming; } }
      if (!p) return;
      if (m.live === 'ready') {
        f.dataset.ready = '1';
        if (p.loading) { clearTimeout(p.bootNext); p.bootNext = 0; p.loading = false; setTimeout(boot, 300); }
        const r = p.resume.get(f) || { i: 0, at: 0 }; p.resume.delete(f);
        if (f === p.incoming) { // the new page fades in over the old one
          const old = p.frame; p.frame = f; p.incoming = null;
          requestAnimationFrame(() => f.classList.remove('is-in'));
          setTimeout(() => old?.remove(), 700);
        } else f.classList.remove('is-in');
        if (r.at > 0) { p.state = 'run'; send(f, { live: 'goto', i: r.i, at: r.at, cursor: r.cursor, track: 'mobile', play: p.seen && live() }); }
        else { p.state = 'armed'; p.slot = nextSlot(p); send(f, { live: 'goto', i: 0, track: 'mobile', play: false }); }
      } else if (m.live === 'nav' && f === p.frame) {
        p.incoming?.remove();
        p.incoming = frame(p, m.href);
        p.resume.set(p.incoming, { i: m.i, at: m.at, cursor: m.cursor });
      } else if (m.live === 'leaving' && f === p.frame) {
        f.dataset.ready = ''; p.resume.set(f, { i: m.i, at: m.at, cursor: m.cursor });
      } else if (m.live === 'end' && f === p.frame) {
        // loop: a freshly loaded start page (clean basket, menus shut) fades in and waits for this phone's next turn
        p.state = 'reset';
        try { delete window.__liveStores?.[p.store]; } catch (err) {}
        p.incoming?.remove();
        p.incoming = frame(p, p.src);
        p.resume.set(p.incoming, { i: 0, at: 0 });
      }
    });

    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !near) { near = true; boot(); wake(); }
      else if (!e.isIntersecting && near) { near = false; boot(); } // unloads them (after a moment)
    }, { rootMargin: '300px 0px' }).observe(parade);
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; P.forEach(playOrPause); wake(); }, { threshold: 0.15 }).observe(parade);
    // On phone widths case.js stacks the phones into a deck (.is-deck) and hides all but the
    // current one, which an IntersectionObserver can't see. A hidden deck phone doesn't play,
    // and once it slides away it reloads its start page, so it begins its walkthrough from
    // the top (straight away, as no other phone is playing) each time it comes round.
    const shown = p => !parade.classList.contains('is-deck') || p.ph.classList.contains('is-on');
    const look = p => {
      const was = p.seen;
      p.seen = p.inView && shown(p); playOrPause(p);
      boot(); // the deck moved on: load the phone on show, let go of the rest
      if (was && !p.seen && !shown(p) && p.frame && p.state === 'run' && wanted(p)) {
        // a moment later, so the reload doesn't slow the phone that has just come in
        clearTimeout(p.rewind);
        p.rewind = setTimeout(() => {
          if (p.seen || p.state !== 'run') return;
          p.state = 'reset';
          p.incoming?.remove();
          p.incoming = frame(p, p.src);
          p.resume.set(p.incoming, { i: 0, at: 0 });
        }, 2500);
      }
      wake();
    };
    const io = new IntersectionObserver(es => es.forEach(e => {
      const p = P.find(q => q.ph === e.target); if (!p) return;
      p.inView = e.intersectionRatio >= 0.5; look(p);
    }), { threshold: [0, 0.5, 1] });
    P.forEach(p => io.observe(p.ph));
    if ('MutationObserver' in window) {
      const mo = new MutationObserver(ms => ms.forEach(m => { const p = P.find(q => q.ph === m.target); if (p) look(p); }));
      P.forEach(p => mo.observe(p.ph, { attributes: true, attributeFilter: ['class'] }));
      new MutationObserver(() => P.forEach(look)).observe(parade, { attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('visibilitychange', () => { P.forEach(playOrPause); wake(); });
  }
  $$('[data-parade]').forEach(liveParade);

  // The browser starts tipped back at an angle and settles as the panel scrolls in
  // (live films settle flat, so the live site's text lands on whole pixels and stays sharp)
  const tilt = (film, browser, flat) => {
    if (!hasGsap || reduce || !browser) return;
    gsap.fromTo(browser, { rotationX: 16, rotationY: -18, rotationZ: 3, scale: 0.9, y: 40 }, {
      rotationX: flat ? 0 : 2, rotationY: flat ? 0 : -4, rotationZ: 0, scale: 1, y: 0, ease: 'none',
      scrollTrigger: { trigger: film.querySelector('.cp-film__stage'), start: 'top 95%', end: 'center 55%', scrub: 0.8 },
    });
  };

  // ---------- Film arrows: step back and forward beside the caption pill ----------
  const filmArrows = film => {
    const list = film.querySelector('.cp-steps'), grid = film.querySelector('.cp-film__grid');
    if (!list || !grid) return;
    const arrow = (d, label, path) => `<button type="button" class="cp-film__nav" data-d="${d}" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg></button>`;
    grid.insertAdjacentHTML('beforeend', arrow(-1, 'Previous step', 'M15 5l-7 7 7 7') + arrow(1, 'Next step', 'M9 5l7 7-7 7'));
    grid.addEventListener('click', e => {
      const b = e.target.closest('.cp-film__nav'); if (!b) return;
      const lis = $$('li', list), k = Math.max(0, lis.findIndex(li => li.classList.contains('is-on')));
      lis[(k + +b.dataset.d + lis.length) % lis.length]?.querySelector('button')?.click();
    });
  };

  $$('[data-cp-film]').forEach(film => {
    filmArrows(film);
    if (film.dataset.live && film.querySelector('.cp-browser')) { liveFilm(film); tilt(film, film.querySelector('.cp-browser'), true); return; }
    const video = film.querySelector('video');
    const items = $$('.cp-steps li', film);
    const times = items.map(li => +li.dataset.t || 0);
    let on = -1, holdEnd = Infinity; // scroll-driven: the recording pauses at the end of the current step
    const S = { on: false };
    const sync = () => {
      const t = video.currentTime, d = video.duration || 1;
      if (S.on && t >= holdEnd - 0.08) { video.pause(); return; }
      let k = 0; times.forEach((s, i) => { if (t >= s) k = i; });
      if (k !== on) {
        items.forEach((li, i) => li.classList.toggle('is-on', i === k)); on = k;
        // bring the current step into view in the sideways row (without moving the page)
        const row = items[k]?.parentElement, li = items[k];
        if (row && li && !S.on) row.scrollTo({ left: li.offsetLeft - row.offsetLeft - 2, behavior: reduce ? 'auto' : 'smooth' });
      }
      const end = times[k + 1] ?? d;
      items[k]?.style.setProperty('--p', Math.min(1, Math.max(0, (t - times[k]) / (end - times[k]))));
    };
    video.addEventListener('timeupdate', sync);
    const seek = i => { holdEnd = S.on ? (times[i + 1] ?? Infinity) : Infinity; video.currentTime = times[i] + 0.05; video.play().catch(() => {}); sync(); };
    items.forEach((li, i) => li.querySelector('button').addEventListener('click', e => {
      if (S.on && S.go) { e.stopImmediatePropagation(); S.go(i); return; } // the scroll position picks the step
      seek(i);
    }, true));
    let enterM = null, leaveM = null, isMobile = () => false;
    S.activate = k => {
      if (k >= items.length) { enterM?.(); return; }
      if (isMobile()) leaveM(() => seek(k)); else seek(k);
    };
    watch(video);
    const browser = film.querySelector('.cp-browser');

    // Last step: "Mobile responsive". When the film ends, the browser narrows into a
    // phone and the mobile page scrolls inside it, then it widens back and the film restarts.
    const mobileSrc = film.dataset.mobile;
    if (mobileSrc && browser && hasGsap) {
      video.loop = false; video.removeAttribute('loop');
      const list = film.querySelector('.cp-steps');
      const n = String(items.length + 1).padStart(2, '0');
      list.insertAdjacentHTML('beforeend', `<li class="cp-steps__mobile"><button type="button"><b>${n}</b><strong>On a phone</strong><span>${film.dataset.mobileLine || 'The same site, laid out for phones.'}</span></button><i></i></li>`);
      const mItem = list.lastElementChild;
      const showM = () => { list.scrollTo({ left: mItem.offsetLeft - list.offsetLeft - 2, behavior: reduce ? 'auto' : 'smooth' }); };
      browser.insertAdjacentHTML('beforeend', `<div class="cp-browser__mobile" aria-hidden="true"><img src="${mobileSrc}" alt="" loading="lazy"></div><i class="cp-browser__island" aria-hidden="true"></i>`);
      const layer = browser.querySelector('.cp-browser__mobile'), img = layer.querySelector('img'), island = browser.querySelector('.cp-browser__island');
      const bar = browser.querySelector('.cp-browser__bar'), stage = film.querySelector('.cp-film__stage');
      let tl = null, mobile = false;
      const build = () => {
        const W = browser.offsetWidth, H = browser.offsetHeight, w = Math.round(H / 2.05);
        stage.style.minHeight = `${stage.offsetHeight}px`;
        gsap.set(browser, { width: W, height: H });
        gsap.set(layer, { borderTop: `${Math.round(H * SAFE)}px solid #fff` }); // the page starts below the island (a border, so the scrolling capture is clipped under it)
        tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
          .to(bar, { height: 0, opacity: 0, paddingBlock: 0, borderBottomWidth: 0, duration: 0.6 }, 0)
          .to(browser, { width: w, borderRadius: w * 0.16, duration: 1.2 }, 0)
          .to(browser, { '--ring': `${Math.max(5, w * 0.035)}px`, duration: 0.8 }, 0.35)
          .to(layer, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 0.5)
          .to(island, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 1.05)
          .addLabel('phone')
          .to(img, { y: () => -Math.max(0, img.offsetHeight - layer.clientHeight) * 0.55, duration: 5, ease: 'sine.inOut' }, 'phone+=0.3')
          .eventCallback('onUpdate', () => {
            const st = tl.labels.phone, d = tl.duration();
            mItem.style.setProperty('--p', Math.max(0, (tl.time() - st) / (d - st)));
          });
      };
      const enter = () => {
        if (mobile) return; mobile = true;
        video.pause(); build();
        items.forEach(li => li.classList.remove('is-on')); mItem.classList.add('is-on'); on = -1; showM();
        tl.eventCallback('onComplete', () => { if (!S.on) gsap.delayedCall(1.2, leave); });
        reduce ? tl.progress(1) : tl.play(0);
      };
      const leave = (then) => {
        if (!mobile || !tl) return;
        tl.eventCallback('onComplete', null);
        const done = () => {
          gsap.set(browser, { clearProps: 'width,height,borderRadius,--ring' }); gsap.set([bar, layer, island, img], { clearProps: 'all' });
          stage.style.minHeight = ''; mItem.classList.remove('is-on'); mItem.style.removeProperty('--p'); mobile = false;
          if (typeof then === 'function') then(); else { video.currentTime = 0; video.play().catch(() => {}); }
        };
        if (reduce) { done(); return; }
        tl.eventCallback('onReverseComplete', done); tl.timeScale(1.8).reverse();
      };
      video.addEventListener('ended', () => { if (!S.on) enter(); });
      mItem.querySelector('button').addEventListener('click', () => { if (S.on && S.go) S.go(items.length); else enter(); });
      enterM = enter; leaveM = leave; isMobile = () => mobile;
      // picking an earlier step while it's a phone widens it back first
      items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => { if (mobile && !S.on) leave(() => { video.currentTime = times[i] + 0.05; video.play().catch(() => {}); }); }, true));
      addEventListener('resize', () => { if (mobile) { tl.progress(0).kill(); mobile = false; gsap.set(browser, { clearProps: 'width,height,borderRadius,--ring' }); gsap.set([bar, layer, island, img], { clearProps: 'all' }); stage.style.minHeight = ''; mItem.classList.remove('is-on'); } });
    }

    if (S.on) holdEnd = times[1] ?? Infinity; // before the pin picks a step, play only the first
    tilt(film, browser);
  });

  // ---------- Zooms ----------
  $$('.cp-zoom video').forEach(v => watch(v));
  if (hasGsap && !reduce) {
    $$('.cp-zoom__stage video').forEach(v => gsap.from(v, { yPercent: 12, rotation: -2, scale: 0.94, ease: 'none', scrollTrigger: { trigger: v.parentElement, start: 'top bottom', end: 'center 55%', scrub: 0.8 } }));
    $$('.cp-card').forEach((c, i) => gsap.from(c, { y: 40, opacity: 0, duration: 0.9, ease: 'expo.out', delay: (i % 3) * 0.06, scrollTrigger: { trigger: c, start: 'top 92%', once: true } }));
  }

  // ---------- Contact: check the fields, then open the email app with it all filled in ----------
  const form = document.querySelector('[data-contact]');
  if (form) {
    const error = form.querySelector('[data-contact-error]');
    const to = form.dataset.to || 'jb.designagency89@gmail.com';
    const PENS = ['#ffe45c', '#7ccfff', '#ff9ad5', '#ffb36b', '#c7f016'];
    const confetti = origin => {
      if (!hasGsap || reduce) return;
      const r = origin.getBoundingClientRect();
      for (let i = 0; i < 36; i++) {
        const c = document.createElement('span');
        c.className = 'confetti';
        c.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top}px;background:${PENS[i % PENS.length]}`;
        document.body.append(c);
        gsap.to(c, { x: gsap.utils.random(-240, 240), y: gsap.utils.random(-300, -80), rotation: gsap.utils.random(-540, 540), duration: gsap.utils.random(0.9, 1.4), ease: 'power2.out' });
        gsap.to(c, { y: '+=400', opacity: 0, delay: 0.8, duration: 1.1, ease: 'power1.in', onComplete: () => c.remove() });
      }
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const { name, email, message } = form.elements;
      [name, email, message].forEach(f => f.removeAttribute('aria-invalid'));
      const problems = [];
      if (!name.value.trim()) { problems.push('your name'); name.setAttribute('aria-invalid', 'true'); }
      if (!email.value.trim() || !email.validity.valid) { problems.push('a valid email'); email.setAttribute('aria-invalid', 'true'); }
      if (!message.value.trim()) { problems.push('a few words about the project'); message.setAttribute('aria-invalid', 'true'); }
      if (problems.length) { error.textContent = `Please add ${problems.join(', ')}.`; form.querySelector('[aria-invalid="true"]').focus(); return; }
      error.textContent = '';
      confetti(form.querySelector('button[type="submit"]'));
      const needs = $$('input[name="need"]:checked', form).map(i => i.value);
      const body = `${message.value.trim()}\n\n${needs.length ? `Looking for: ${needs.join(', ')}\n` : ''}From: ${name.value.trim()} (${email.value.trim()})\nSeen on: ${document.title}`;
      setTimeout(() => { location.href = `mailto:${to}?subject=${encodeURIComponent('New project enquiry')}&body=${encodeURIComponent(body)}`; }, 650);
    });
  }
})();
