// What's in my Fridge: the app's screens and pieces, rebuilt from its source and set
// moving. Each demo plays on its own while it's on screen and pauses when it isn't;
// the pull-out pieces also work by tapping. Reduced motion shows every demo finished.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- App screens: laid out at 390px like the app, scaled to the phone ----------
  const fit = el => {
    const box = el.parentElement;
    const k = box.clientWidth / 390;
    if (!k) return;
    el.style.transform = `scale(${k})`;
    el.style.height = `${box.clientHeight / k}px`;
  };
  const fits = $$('[data-fit]');
  fits.forEach(fit);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(entries => entries.forEach(e => { const el = e.target.querySelector(':scope > [data-fit]'); if (el) fit(el); }));
    fits.forEach(el => ro.observe(el.parentElement));
  } else addEventListener('resize', () => fits.forEach(fit));

  // ---------- Demos: one looping timeline each, played only while in view ----------
  const demos = {};
  const watch = (root, build) => {
    if (!root) return;
    const name = root.dataset.demo;
    if (!hasGsap || reduce) { build(null); return; }
    let tl = null, seen = false;
    // On phones the demo sits under its copy, so it starts as soon as a sliver shows
    // and loops with a shorter breath; desktop keeps its thresholds
    const phone = matchMedia('(max-width: 760px)').matches;
    const start = () => { tl?.kill(); tl = build(gsap.timeline({ repeat: -1, repeatDelay: phone ? 0.8 : 1.6 })); };
    demos[name] = () => { start(); seen = true; };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!seen) { seen = true; start(); } else tl?.play(); }
      else tl?.pause();
    }, phone ? { threshold: 0.08, rootMargin: '0px 0px -8% 0px' } : { threshold: 0.3 }).observe(root);
  };
  $$('[data-replay]').forEach(b => b.addEventListener('click', () => demos[b.dataset.replay]?.()));
  if (reduce || !hasGsap) $$('[data-replay]').forEach(b => { b.hidden = true; });

  const show = (el, on) => { if (el) el.hidden = !on; };
  const press = (tl, el, at) => tl.call(() => el.classList.add('is-press'), null, at).call(() => el.classList.remove('is-press'), null, at + 0.28);

  // 01 Scan: snap, read, check the list, add it
  watch($('[data-demo="scan"]'), tl => {
    const r = $('[data-demo="scan"]');
    const s = k => $(`[data-s="${k}"]`, r);
    const rows = $$('.fa-crow', s('confirm'));
    const filedRows = $$('.fa-item', s('filed'));
    const navs = $$('.fa-nav > span', r);
    const title = $('.fa-title', r);
    const flag = $('.fa-flag', r);
    const set = phase => {
      ['idle', 'reading', 'confirm', 'filed'].forEach(p => show(s(p), p === phase));
      show(s('dock'), phase === 'confirm');
      show(title, phase !== 'filed'); show(s('sub'), phase !== 'filed');
      s('sub').textContent = phase === 'confirm' ? 'Check what I saw, then confirm.' : 'A photo proposes items. You decide.';
      navs.forEach((n, i) => n.classList.toggle('on', i === (phase === 'filed' ? 3 : 2)));
    };
    if (!tl) { set('confirm'); return; }
    const sweep = $('.fa-sweep', r);
    tl.call(() => set('idle'), null, 0)
      .fromTo(s('shutter'), { scale: 1 }, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.7);
    press(tl, s('shutter'), 1.1);
    tl.call(() => set('reading'), null, 1.5)
      .fromTo(sweep, { y: 0 }, { y: 400, duration: 1.1, ease: 'none', repeat: 1 }, 1.5)
      .call(() => set('confirm'), null, 3.8)
      .fromTo(rows, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.13 }, 3.85)
      .fromTo(s('dock'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 4.3)
      .fromTo(flag, { scale: 1 }, { scale: 1.25, duration: 0.22, yoyo: true, repeat: 3, ease: 'power1.inOut', transformOrigin: '0 50%' }, 5.2);
    press(tl, s('add'), 7.2);
    tl.call(() => set('filed'), null, 7.6)
      .fromTo($('.fa-cat', s('filed')), { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 7.65)
      .fromTo(filedRows, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.1 }, 7.8)
      .to({}, { duration: 2.4 }, 8.4);
    return tl;
  });

  // Scan pull-out: where to file the items
  const FILE_HINT = {
    auto: 'Each item is filed where it usually lives: fridge, freezer or pantry.',
    fridge: 'Everything goes in the fridge.',
    freezer: 'Everything goes in the freezer.',
    pantry: 'Everything goes in the pantry.',
  };
  $$('[data-file]').forEach(b => b.addEventListener('click', () => {
    $$('[data-file]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    const hint = $('[data-file-hint]'); if (hint) hint.textContent = FILE_HINT[b.dataset.file];
  }));

  // 02 Receipt: a beam reads each line; shorthand turns into a real name
  watch($('[data-demo="receipt"]'), tl => {
    const r = $('[data-demo="receipt"]');
    const lines = $$('[data-r="lines"] li', r);
    const rows = $$('[data-r="rows"] .wf-frow', r);
    const skips = [...$$('li[data-skip]', r), ...$$('.wf-receipt__foot[data-skip]', r)];
    const beam = $('[data-r="beam"]', r), paper = $('.wf-receipt', r);
    const date = $('.wf-found__date', r);
    if (!tl) { skips.forEach(l => l.classList.add('is-skip')); return; }
    tl.call(() => { lines.forEach(l => l.classList.remove('is-on', 'is-skip')); skips.forEach(l => l.classList.remove('is-skip')); }, null, 0)
      .set(rows, { opacity: 0, x: -16 }, 0)
      .set(date, { opacity: 0, y: -8 }, 0)
      .set(beam, { opacity: 1, y: 40 }, 0.3)
      .to(date, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 0.4);
    const targets = [...lines, ...$$('.wf-receipt__foot', r)];
    targets.forEach((line, i) => {
      const at = 0.8 + i * 0.62;
      tl.to(beam, { y: () => line.offsetTop + line.offsetHeight / 2, duration: 0.5, ease: 'power2.inOut' }, at - 0.5);
      if (line.hasAttribute('data-skip')) tl.call(() => line.classList.add('is-skip'), null, at);
      else {
        tl.call(() => { lines.forEach(l => l.classList.remove('is-on')); line.classList.add('is-on'); }, null, at);
        const row = rows[+line.dataset.to];
        if (row) tl.to(row, { opacity: 1, x: 0, duration: 0.5, ease: 'back.out(2)' }, at + 0.1);
      }
    });
    const end = 0.8 + targets.length * 0.62;
    tl.to(rows[rows.length - 1], { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' }, end)
      .call(() => lines.forEach(l => l.classList.remove('is-on')), null, end)
      .to(beam, { opacity: 0, duration: 0.3 }, end)
      .to({}, { duration: 2.6 }, end + 0.4);
    void paper;
    return tl;
  });

  // 03 Use it up: tap Used to clear an item, or the snowflake to freeze it
  const soonList = $('[data-soon-list]');
  const soonCount = () => {
    const n = $$('.fa-item.soon, .fa-item.expired', soonList).length;
    const c = $('[data-soon-count]'); if (c) c.textContent = n;
    const banner = $('[data-soon-banner]');
    if (banner) banner.style.display = n ? '' : 'none';
  };
  const resetSoon = () => {
    $$('.fa-item', soonList).forEach(li => {
      li.style.display = ''; li.style.opacity = ''; li.style.transform = '';
      li.className = li.dataset.cls; li.innerHTML = li.dataset.html;
    });
    soonCount();
  };
  if (soonList) {
    $$('.fa-item', soonList).forEach(li => { li.dataset.cls = li.className; li.dataset.html = li.innerHTML; });
    const leave = (li, then) => {
      if (!hasGsap || reduce) { li.style.display = 'none'; then?.(); return; }
      gsap.to(li, { opacity: 0, scale: 0.97, duration: 0.2, delay: 0.3, onComplete: () => {
        const h = li.offsetHeight;
        gsap.fromTo(li, { height: h }, { height: 0, marginTop: -9, paddingBlock: 0, borderWidth: 0, duration: 0.3, ease: 'power2.inOut', onComplete: () => { li.style.display = 'none'; gsap.set(li, { clearProps: 'height,marginTop,paddingBlock,borderWidth,scale' }); then?.(); } });
      } });
    };
    soonList.addEventListener('click', e => {
      const used = e.target.closest('[data-used]'), freeze = e.target.closest('[data-freeze]');
      const li = e.target.closest('.fa-item');
      if (!li) return;
      if (used && !used.classList.contains('on')) {
        used.classList.add('on'); used.setAttribute('aria-pressed', 'true');
        leave(li, () => { soonCount(); if (!$$('.fa-item', soonList).some(x => x.style.display !== 'none')) setTimeout(resetSoon, 900); });
      }
      if (freeze && !freeze.classList.contains('on')) {
        freeze.classList.add('on');
        setTimeout(() => {
          freeze.classList.remove('on'); freeze.style.visibility = 'hidden';
          $('[data-where]', li).textContent = 'Freezer';
          li.classList.remove('soon', 'expired');
          const exp = $('.fa-exp', li); exp.previousElementSibling.remove(); exp.remove();
          soonCount();
        }, 350);
      }
    });
  }
  // On screen, it shows itself once: one item used
  watch($('[data-demo="soon"]'), tl => {
    if (!tl) return;
    const used = $$('[data-used]', soonList)[0];
    tl.repeat(0);
    tl.call(() => used?.click(), null, 1.6);
    return tl;
  });

  // 04 The usuals: Add puts it on the list; ticking files it back into the fridge
  const usuals = $('[data-demo="usuals"]');
  if (usuals) {
    const shop = $('[data-shop]', usuals), done = $('[data-done]', usuals), head = $('[data-tickhead]', usuals);
    const ticked = $('[data-ticked]', usuals), toast = $('[data-usuals-toast]', usuals);
    const count = () => { const n = $$('.fa-shop.done', usuals).length; ticked.textContent = n; head.hidden = !n; };
    const flash = () => {
      if (!hasGsap || reduce) return;
      gsap.killTweensOf(toast);
      gsap.fromTo(toast, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)' });
      gsap.to(toast, { opacity: 0, y: 12, duration: 0.25, delay: 1.8 });
    };
    const row = name => {
      const d = document.createElement('div');
      d.className = 'fa-shop';
      d.innerHTML = `<button type="button" class="fa-box" aria-label="Tick off ${name}" aria-pressed="false"><svg width="15" height="15"><use href="#fa-check"/></svg></button><b>${name}</b><i><svg width="17" height="17" aria-hidden="true"><use href="#fa-pin"/></svg></i>`;
      return d;
    };
    usuals.addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      if (add && !add.classList.contains('done')) {
        add.classList.add('done'); $('span', add).textContent = 'On list';
        // never list the same thing twice (a tap and the loop can land together)
        if ($$('.fa-shop b', usuals).some(b => b.textContent === add.dataset.add)) return;
        const r = row(add.dataset.add);
        shop.prepend(r);
        if (hasGsap && !reduce) gsap.from(r, { opacity: 0, y: -12, duration: 0.45, ease: 'back.out(2)' });
        flash();
      }
      const box = e.target.closest('.fa-box');
      if (box) {
        const r = box.closest('.fa-shop');
        const on = !r.classList.contains('done');
        r.classList.toggle('done', on); box.setAttribute('aria-pressed', on);
        setTimeout(() => {
          (on ? done : shop).append(r);
          if (hasGsap && !reduce) gsap.from(r, { opacity: 0, y: on ? -8 : 8, duration: 0.35, ease: 'expo.out' });
          count();
        }, on ? 320 : 0);
      }
    });
    const reset = () => {
      $$('[data-add]', usuals).forEach(b => { b.classList.remove('done'); $('span', b).textContent = 'Add'; });
      $$('.fa-shop', usuals).forEach(r => { if (!['Lemons', 'Garlic'].includes($('b', r).textContent)) r.remove(); else { r.classList.remove('done'); $('.fa-box', r).setAttribute('aria-pressed', 'false'); shop.append(r); } });
      count();
    };
    watch(usuals, tl => {
      if (!tl) return;
      const addMilk = () => $$('[data-add]', usuals)[2];
      tl.call(reset, null, 0)
        .call(() => addMilk().click(), null, 1.2)
        .call(() => $$('[data-add]', usuals)[0].click(), null, 2.6)
        .call(() => { const r = $$('.fa-shop', shop).find(x => $('b', x).textContent === 'Milk'); $('.fa-box', r)?.click(); }, null, 4.2)
        .call(() => { const r = $$('.fa-shop', shop).find(x => $('b', x).textContent === 'Lemons'); $('.fa-box', r)?.click(); }, null, 5.4)
        .to({}, { duration: 3.4 }, 6);
      return tl;
    });
  }

  // 05 Dinner, the centrepiece: pick a dinner, make it step by step, then it's cooked.
  // The phone plays the app; the cards either side follow the same story.
  const cook = $('[data-cook]');
  if (cook) {
    const k = n => $(`[data-k="${n}"]`, cook);
    const acts = $$('[data-actpill]', cook.parentElement);
    const cardsFor = n => $$(`.wf-ccard[data-act="${n}"]`, cook);
    const haveRows = $$('[data-have]', cook), usedRows = $$('[data-used]', cook);
    const steps = $$('.wf-steps li', cook), stepTexts = $$('[data-step]', cook), segs = $$('.wf-stepbar i', cook);
    const ingRows = $$('.wf-ing li', cook);
    const qtys = $$('[data-q2]', cook);
    const press = (el, at, tl) => tl.call(() => { el.classList.add('is-press'); setTimeout(() => el.classList.remove('is-press'), 260); }, null, at);
    const flipTo = (el, text) => gsap.timeline().to(el, { yPercent: -50, autoAlpha: 0, duration: 0.15 }).call(() => { el.textContent = text; }).fromTo(el, { yPercent: 50 }, { yPercent: 0, autoAlpha: 1, duration: 0.22, ease: 'back.out(2)' });
    const showAct = n => {
      acts.forEach(p => p.classList.toggle('on', +p.dataset.actpill === n));
      [1, 2, 3].forEach(a => cardsFor(a).forEach(c => {
        if (a === n) gsap.fromTo(c, { autoAlpha: 0, y: 24, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.6)', delay: c.closest('.wf-cook__col--r') ? 0.12 : 0 });
        else gsap.to(c, { autoAlpha: 0, y: -12, duration: 0.25 });
      }));
    };
    const setStep = i => {
      steps.forEach((li, j) => { li.classList.toggle('on', j === i); li.classList.toggle('done', j < i); });
      segs.forEach((sg, j) => sg.style.setProperty('--f', j < i ? 1 : 0));
      const uses = (steps[i]?.dataset.uses || '').split(' ');
      ingRows.forEach(li => li.classList.toggle('hl', uses.includes(li.dataset.ing)));
      stepTexts.forEach((p, j) => { if (j === i) gsap.fromTo(p, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out' }); else gsap.set(p, { autoAlpha: 0 }); });
      const sn = k('sn'); if (sn) flipTo(sn, String(i + 1));
    };
    const reset = () => {
      showAct(1);
      ['saved', 'choose'].forEach(n => { k(n).hidden = true; }); k('ask').hidden = false; k('foot').hidden = false;
      gsap.set(k('sheet'), { yPercent: 105, autoAlpha: 1 });
      gsap.set([k('update'), k('writing'), k('recipe'), k('toast')], { autoAlpha: 0 });
      gsap.set([k('q'), k('meal')], { autoAlpha: 0 });
      gsap.set(k('rscroll'), { y: 0 });
      k('serves').textContent = '2'; k('serves2').textContent = '2'; k('for').textContent = '2';
      qtys.forEach(q => { q.textContent = q.dataset.q2; });
      [k('buy'), k('cbuy')].forEach(c => c.classList.remove('on'));
      $('em', k('buy')).textContent = 'Garlic · 1 bulb'; $('em', k('cbuy')).textContent = 'Garlic · 1 bulb';
      gsap.set(k('lgarlic'), { autoAlpha: 0 });
      $$('.wf-tickbox', cook).forEach(t => t.classList.remove('on'));
      $$('.wf-usesup', cook).forEach(u => gsap.set(u, { autoAlpha: 0 }));
      usedRows.forEach(r => { gsap.set(r, { autoAlpha: 1, x: 0 }); $('.fa-used', r).classList.remove('on'); });
      steps.forEach(li => li.classList.remove('on', 'done')); segs.forEach(sg => sg.style.setProperty('--f', 0));
      ingRows.forEach(li => li.classList.remove('hl'));
      gsap.set(stepTexts, { autoAlpha: 0 }); gsap.set(stepTexts[0], { autoAlpha: 1 }); k('sn').textContent = '1';
      k('cooked').classList.remove('on'); k('made').textContent = 'Saved today';
      gsap.set([k('cmade'), k('cleft')], { autoAlpha: 0 });
      $$('[data-tab]', k('nav')).forEach(t => t.classList.toggle('on', t.dataset.tab === 'Ask'));
    };
    if (!hasGsap || reduce) {
      // Static: act one, what you have and what to buy, beside the meal idea
      acts[0]?.classList.add('on');
    } else {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
      const bar = n => $('em', acts[n - 1]);
      tl.call(reset, null, 0).set(acts.map(a => $('em', a)), { scaleX: 0 }, 0)
        .fromTo(bar(1), { scaleX: 0 }, { scaleX: 1, duration: 6.2, ease: 'none' }, 0)
        // Act 1: what you have, what to buy
        .fromTo(k('q'), { autoAlpha: 0, y: 10, scale: 0.95 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2)', transformOrigin: '100% 100%' }, 0.5)
        .fromTo(k('meal'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)' }, 1.2);
      haveRows.forEach((r, i) => tl.call(() => $('.wf-tickbox', r).classList.add('on'), null, 1.0 + i * 0.3));
      tl.fromTo($$('[data-have] .wf-usesup', cook), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2.5)', stagger: 0.2 }, 2.4);
      press(k('buy'), 3.4, tl);
      press(k('cbuy'), 3.4, tl);
      tl.call(() => { [k('buy'), k('cbuy')].forEach(c => { c.classList.add('on'); $('em', c).textContent = 'Added'; }); }, null, 3.6)
        .fromTo(k('lgarlic'), { autoAlpha: 0, y: -26, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(2)' }, 3.75);
      press(k('howto'), 5.3, tl);
      // Act 2: the recipe, for four, step by step
      tl.call(() => showAct(2), null, 6.2)
        .fromTo(bar(2), { scaleX: 0 }, { scaleX: 1, duration: 12, ease: 'none' }, 6.2)
        .to(k('sheet'), { yPercent: 0, duration: 0.6, ease: 'expo.out' }, 6.2);
      press(k('plus'), 7.0, tl); tl.call(() => flipTo(k('serves'), '3'), null, 7.05);
      press(k('plus'), 7.5, tl); tl.call(() => flipTo(k('serves'), '4'), null, 7.55)
        .to(k('update'), { autoAlpha: 1, duration: 0.3 }, 7.8);
      press(k('update'), 8.5, tl);
      tl.to(k('update'), { autoAlpha: 0, duration: 0.2 }, 8.75)
        .to(k('writing'), { autoAlpha: 1, duration: 0.2 }, 8.8)
        .to(k('writing'), { autoAlpha: 0, duration: 0.2 }, 9.9)
        .call(() => { k('serves2').textContent = '4'; qtys.forEach(q => flipTo(q, q.dataset.q4)); flipTo(k('for'), '4'); }, null, 10.0)
        .fromTo(k('recipe'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out' }, 10.0);
      steps.forEach((li, i) => {
        const at = 10.8 + i * 1.45;
        tl.call(() => setStep(i), null, at)
          .to(k('rscroll'), { y: () => -Math.max(0, li.offsetTop - 210), duration: 0.6, ease: 'power2.inOut' }, at);
      });
      tl.call(() => { steps.forEach(li => { li.classList.remove('on'); li.classList.add('done'); }); segs.forEach(sg => sg.style.setProperty('--f', 1)); }, null, 18.0)
        // Act 3: cooked, used up, leftovers in the freezer
        .call(() => showAct(3), null, 18.6)
        .fromTo(bar(3), { scaleX: 0 }, { scaleX: 1, duration: 7, ease: 'none' }, 18.6)
        .to(k('sheet'), { yPercent: 105, duration: 0.45, ease: 'power2.in' }, 18.6)
        .call(() => { k('ask').hidden = true; k('saved').hidden = false; $$('[data-tab]', k('nav')).forEach(t => t.classList.toggle('on', t.dataset.tab === 'Fridge')); }, null, 19.05)
        .fromTo(k('saved'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 19.05);
      press(k('cooked'), 19.8, tl);
      tl.call(() => { k('cooked').classList.add('on'); flipTo(k('made'), 'Made 1× · last 10 Oct'); }, null, 20.0)
        .fromTo(k('cmade'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 20.1);
      usedRows.slice(0, 3).forEach((r, i) => {
        const at = 20.4 + i * 0.5;
        tl.call(() => $('.fa-used', r).classList.add('on'), null, at)
          .to(r, { autoAlpha: 0.35, x: 14, duration: 0.4, ease: 'power2.in' }, at + 0.3);
      });
      press(k('left'), 22.2, tl);
      tl.call(() => { k('foot').hidden = true; k('choose').hidden = false; }, null, 22.4);
      press(k('frz'), 23.2, tl);
      tl.call(() => { k('choose').hidden = true; k('foot').hidden = false; }, null, 23.5)
        .fromTo(k('toast'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'back.out(2)' }, 23.5)
        .fromTo(k('cleft'), { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, 23.6)
        .to(k('toast'), { autoAlpha: 0, duration: 0.3 }, 25.2)
        .to({}, { duration: 0.2 }, 25.4);
      const phoneNow = matchMedia('(max-width: 760px)').matches;
      new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), phoneNow ? { threshold: 0.05 } : { threshold: 0.25 }).observe(cook);
    }
  }

  // 06 Home screen: Share, Add to Home Screen, the icon lands
  watch($('[data-demo="home"]'), tl => {
    const r = $('[data-demo="home"]');
    const h = k => $(`[data-h="${k}"]`, r);
    const steps = $$('li', h('steps'));
    const step = i => steps.forEach((li, k) => li.classList.toggle('now', k === i));
    if (!tl) { h('browser').style.visibility = 'hidden'; h('hs').style.visibility = 'visible'; step(2); return; }
    tl.call(() => { step(0); h('add').classList.remove('hot'); }, null, 0)
      .set(h('browser'), { visibility: 'visible' }, 0)
      .set(h('hs'), { visibility: 'hidden' }, 0)
      .set(h('sheet'), { visibility: 'hidden', yPercent: 110 }, 0)
      .fromTo(h('ring'), { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, 0.8)
      .to(h('ring'), { opacity: 0, duration: 0.3 }, 2)
      .call(() => step(1), null, 2)
      .set(h('sheet'), { visibility: 'visible' }, 2)
      .to(h('sheet'), { yPercent: 0, duration: 0.55, ease: 'expo.out' }, 2)
      .call(() => h('add').classList.add('hot'), null, 3.1)
      .call(() => step(2), null, 4.2)
      .to(h('sheet'), { yPercent: 110, duration: 0.4, ease: 'power2.in' }, 4.2)
      .set(h('browser'), { visibility: 'hidden' }, 4.65)
      .set(h('hs'), { visibility: 'visible' }, 4.65)
      .fromTo(h('icon'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2.4)' }, 4.8)
      .to({}, { duration: 2.6 }, 5.6);
    return tl;
  });

  // ---------- Phones: the hero plays a walkthrough ----------
  // The centre phone steps through the real screens (a push, like the app's own
  // navigation), the side phones show the screens either side of it, and the pieces
  // around them answer whatever is on screen. A caption pill names the feature.
  const MOBILE = '(max-width: 760px)';
  const stage = $('.wf-stage');
  const HERO = [
    { img: 'home', name: 'Home: one tap for each job', cue: 'icon' },
    { img: 'scan', name: 'Snap your shopping', cue: 'snap' },
    { img: 'scan-check', name: 'Check what it found', cue: 'found' },
    { img: 'fridge', name: 'Use it up first', cue: 'soon' },
    { img: 'list', name: 'Your shopping list', cue: 'garlic' },
    { img: 'tonight', name: 'Dinner from what’s in', cue: 'meal' },
  ];
  const CUES = {
    snap: '<span class="wf-cue__chip"><svg width="14" height="14"><use href="#fa-camera"/></svg>Snap the shopping</span>',
    found: '<span class="wf-cue__chip is-on"><svg width="14" height="14"><use href="#fa-check"/></svg>7 items found</span>',
    soon: '<span class="wf-cue__chip is-warn"><svg width="14" height="14"><use href="#fa-warning"/></svg>4 to use soon</span>',
    garlic: '<span class="fa-buy-chip on"><svg class="fa-tick" width="13" height="13"><use href="#fa-check"/></svg>Garlic · on your list</span>',
    meal: '<span class="wf-cue__meal"><b>Creamy chicken and spinach</b><small>Uses the spinach · 30 min</small></span>',
  };
  if (stage && hasGsap && !reduce) gsap.matchMedia().add(MOBILE, () => {
    const STEP = 3.2;
    const phoneC = $('.wf-ph--c', stage), phoneL = $('.wf-ph--l', stage), phoneR = $('.wf-ph--r', stage);
    const base = $('.screen img', phoneC).getAttribute('src').replace(/[^/]+$/, '');
    const reel = phone => {
      const box = document.createElement('div');
      box.className = 'wf-reel'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = HERO.map(s => `<img src="${base}${s.img}.webp" alt="" width="511" height="1080" decoding="async">`).join('');
      $('.screen', phone).append(box);
      return $$('img', box);
    };
    const C = reel(phoneC), L = reel(phoneL), R = reel(phoneR);
    stage.classList.add('is-reel');
    const pill = document.createElement('div');
    pill.className = 'parade__now wf-hero-now';
    pill.setAttribute('aria-hidden', 'true');
    pill.innerHTML = '<b></b><strong></strong><i><em></em></i>';
    const cueBox = document.createElement('div');
    cueBox.className = 'wf-cue fa'; cueBox.setAttribute('aria-hidden', 'true');
    cueBox.innerHTML = Object.entries(CUES).map(([k, h]) => `<div data-cue="${k}">${h}</div>`).join('');
    stage.append(pill, cueBox);
    const bar = $('em', pill);
    const cues = Object.fromEntries($$('[data-cue]', cueBox).map(el => [el.dataset.cue, el]));
    const pops = $$('.pop > .fa', stage);
    const icon = pops.find(p => p.classList.contains('wf-pop-logo'));
    const row = pops.find(p => p.classList.contains('wf-pop-row'));
    const used = row && $('.fa-used', row);
    const n = HERO.length, at = k => (k + n) % n;
    gsap.set([...C, ...L, ...R], { autoAlpha: 0 });
    gsap.set([C[0], L[n - 1], R[1]], { autoAlpha: 1 });
    gsap.set(Object.values(cues), { autoAlpha: 0, scale: 0.4, y: 16 });
    let cur = 0, cue = null;
    const side = (imgs, k) => imgs.forEach((im, i) => gsap.to(im, { autoAlpha: i === k ? 1 : 0, duration: 0.6, ease: 'power1.inOut', overwrite: 'auto' }));
    const label = k => {
      $('b', pill).textContent = String(k + 1).padStart(2, '0');
      $('strong', pill).textContent = HERO[k].name;
      gsap.fromTo(pill, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(2)', overwrite: true });
    };
    const react = k => {
      const want = HERO[k].cue;
      if (cue && cue !== cues[want]) gsap.to(cue, { autoAlpha: 0, scale: 0.6, y: -10, duration: 0.3, ease: 'power2.in', overwrite: true });
      cue = cues[want] || null;
      if (cue) gsap.fromTo(cue, { autoAlpha: 0, scale: 0.4, y: 16, rotation: -6 }, { autoAlpha: 1, scale: 1, y: 0, rotation: 0, duration: 0.7, delay: 0.45, ease: 'back.out(2.4)', overwrite: true });
      if (want === 'icon' && icon) gsap.fromTo(icon, { scale: 1, rotation: 0 }, { keyframes: [{ scale: 1.22, rotation: -10, duration: 0.25 }, { scale: 0.96, rotation: 6, duration: 0.2 }, { scale: 1, rotation: 0, duration: 0.35 }], delay: 0.4, ease: 'power2.out', transformOrigin: '50% 50%' });
      if (want === 'soon' && row) gsap.fromTo(row, { scale: 1 }, { scale: 1.08, duration: 0.28, yoyo: true, repeat: 3, delay: 0.4, ease: 'power1.inOut', transformOrigin: '30% 50%' });
      // the spinach goes into tonight's dinner, so it's marked used
      used?.classList.toggle('on', want === 'meal');
    };
    const show = k => {
      if (k !== cur) {
        const a = C[cur], b = C[k];
        gsap.set(b, { zIndex: 2 }); gsap.set(a, { zIndex: 1 });
        gsap.to(a, { xPercent: -32, autoAlpha: 0, duration: 0.75, ease: 'power3.inOut', overwrite: 'auto' });
        gsap.fromTo(b, { xPercent: 100, autoAlpha: 1, scale: 1, yPercent: 0 }, { xPercent: 0, duration: 0.75, ease: 'power3.inOut', overwrite: 'auto' });
        side(L, at(k - 1)); side(R, at(k + 1));
        cur = k;
      }
      // the screen drifts up and in a touch while it's showing, as if being read
      gsap.fromTo(C[k], { scale: 1, yPercent: 0 }, { scale: 1.05, yPercent: -4, duration: STEP - 0.4, delay: 0.7, ease: 'sine.inOut', transformOrigin: '50% 0%' });
      label(k); react(k);
    };
    const tl = gsap.timeline({ repeat: -1, paused: true });
    HERO.forEach((s, k) => {
      tl.call(() => show(k), null, k * STEP + 0.001)
        .fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: STEP, ease: 'none', immediateRender: false }, k * STEP);
    });
    // starts once the phones have stood up (case.js), and only runs while the hero is in view
    let ready = false, inView = false;
    const sync = () => (ready && inView ? tl.play() : tl.pause());
    const wait = gsap.delayedCall(1.9, () => { ready = true; sync(); });
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: 0.25 });
    io.observe(stage);
    return () => {
      io.disconnect(); wait.kill(); tl.kill();
      [pill, cueBox, ...$$('.wf-reel', stage)].forEach(el => el.remove());
      stage.classList.remove('is-reel'); used?.classList.remove('on');
      if (icon) gsap.set(icon, { clearProps: 'transform' });
      if (row) gsap.set(row, { clearProps: 'transform' });
    };
  });

  // ---------- Phones: the screen parade comes alive ----------
  // Each phone plays a short walkthrough over its real screenshot, as if someone were
  // using it: a flick that scrolls the list and bounces back, then a tap on the thing that
  // matters there (a ripple, the row or chip lighting up, a toast). In the phone deck
  // (case.js, phones) the showing phone plays; on desktop they all play, out of step.
  // Positions are percentages of the screenshot.
  const WALK = {
    home: { tap: [72, 50], ring: [51, 42.5, 44, 14.5] },
    fridge: { tap: [64, 37], ring: [4, 33.4, 92, 7], toast: 'Added to your shopping list' },
    'scan-check': { tap: [9, 69.5], ring: [4, 65.6, 92, 8.4] },
    tonight: { tap: [30, 42.6], ring: [20.5, 40.6, 20, 4.2], toast: 'Garlic is on your list' },
  };
  const parade = $('[data-parade]');
  // (desktop only: the parade is hidden on phones)
  if (parade && hasGsap && !reduce && !matchMedia(MOBILE).matches) {
    const phones = $$('.parade__row > .phone', parade);
    const walks = phones.map((phone, i) => {
      const shot = $('.screen img', phone);
      const key = (shot?.getAttribute('src') || '').replace(/^.*\/|\.webp$/g, '');
      const w = WALK[key];
      if (!w) return null;
      const live = document.createElement('div');
      live.className = 'wf-live fa'; live.setAttribute('aria-hidden', 'true');
      live.innerHTML = `<div class="wf-live__body"><img src="${shot.getAttribute('src')}" alt="" width="511" height="1080" decoding="async"></div>
        <i class="wf-live__ring" style="left:${w.ring[0]}%;top:${w.ring[1]}%;width:${w.ring[2]}%;height:${w.ring[3]}%"></i>
        <i class="wf-live__ripple" style="left:${w.tap[0]}%;top:${w.tap[1]}%"></i>
        <i class="wf-live__finger"></i>
        ${w.toast ? `<span class="wf-live__toast"><svg width="14" height="14"><use href="#fa-check"/></svg>${w.toast}</span>` : ''}`;
      $('.screen', phone).append(live);
      const body = $('.wf-live__body img', live), finger = $('.wf-live__finger', live);
      const ring = $('.wf-live__ring', live), ripple = $('.wf-live__ripple', live), toast = $('.wf-live__toast', live);
      gsap.set([ring, ripple, finger, toast].filter(Boolean), { autoAlpha: 0 });
      const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 });
      // a flick up the screen: the list scrolls and rubber-bands back
      tl.set(finger, { left: '52%', top: '78%', xPercent: -50, yPercent: -50, scale: 1 }, 0)
        .to(finger, { autoAlpha: 1, duration: 0.2 }, 0.3)
        .to(finger, { top: '46%', duration: 0.55, ease: 'power2.out' }, 0.5)
        .to(body, { yPercent: -7, duration: 0.55, ease: 'power2.out' }, 0.5)
        .to(finger, { autoAlpha: 0, duration: 0.2 }, 1.0)
        .to(body, { yPercent: 0, duration: 0.8, ease: 'back.out(1.6)' }, 1.15)
        // then a tap on the thing that matters on this screen
        .set(finger, { left: `${w.tap[0] + 6}%`, top: `${w.tap[1] + 10}%` }, 1.9)
        .to(finger, { autoAlpha: 1, left: `${w.tap[0]}%`, top: `${w.tap[1]}%`, duration: 0.5, ease: 'power3.out' }, 1.9)
        .to(finger, { scale: 0.78, duration: 0.12, yoyo: true, repeat: 1 }, 2.45)
        .fromTo(ripple, { autoAlpha: 0.55, scale: 0.2 }, { autoAlpha: 0, scale: 1, duration: 0.6, ease: 'power2.out' }, 2.5)
        .fromTo(ring, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 2.55)
        .to(finger, { autoAlpha: 0, duration: 0.25 }, 2.8);
      if (toast) tl.fromTo(toast, { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, duration: 0.4, ease: 'back.out(2)' }, 2.9)
        .to(toast, { autoAlpha: 0, yPercent: 30, duration: 0.3 }, 4.5);
      tl.to(ring, { autoAlpha: 0, duration: 0.35 }, 4.6).to({}, { duration: 0.2 }, 4.95);
      return { tl, delay: i * 1.3 };
    });
    let inView = false, deck = false;
    const playing = () => walks.forEach((w, i) => {
      if (!w) return;
      const on = inView && (!deck || phones[i].classList.contains('is-on'));
      if (deck) { if (!on) w.tl.pause(0); else if (!w.tl.isActive()) w.tl.restart(); return; }
      // side by side: each phone starts a little after the last, so they're out of step
      if (!on) { w.tl.pause(); w.wait?.pause(); return; }
      if (!w.wait) w.wait = gsap.delayedCall(w.delay, () => w.tl.play());
      else if (w.wait.progress() < 1) w.wait.resume(); else w.tl.play();
    });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; playing(); }, { threshold: 0.25 }).observe(parade);
    const mo = new MutationObserver(() => { deck = parade.classList.contains('is-deck'); playing(); });
    mo.observe(parade, { attributes: true, attributeFilter: ['class'] });
    phones.forEach(p => mo.observe(p, { attributes: true, attributeFilter: ['class'] }));
    deck = parade.classList.contains('is-deck');
  }

  // ---------- Get the app: iPhone / Android steps ----------
  const guide = $('[data-guide]');
  if (guide) {
    const tabs = $$('[role="tab"]', guide);
    const pick = t => tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        pick(n); n.focus();
      });
    });
    if (/Android/i.test(navigator.userAgent)) pick(tabs[1]);
  }

  // ---------- Up close: the icon draws itself ----------
  const mark = $('[data-mark]');
  if (mark) {
    const m = k => $(`[data-m="${k}"]`, mark);
    const play = () => {
      if (!hasGsap || reduce) return;
      const draw = m('draw'), len = draw.getTotalLength();
      gsap.timeline()
        .set(draw, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 })
        .set([m('fill'), m('door'), m('handle'), m('vein')], { opacity: 0 })
        .set(m('leaf'), { opacity: 0, scale: 0, transformOrigin: '50% 50%' })
        .to(draw, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0.2)
        .to(m('fill'), { opacity: 1, duration: 0.35 }, 0.9)
        .to(m('door'), { opacity: 1, duration: 0.3 }, 1.05)
        .to(m('handle'), { opacity: 1, duration: 0.3 }, 1.13)
        .to(m('leaf'), { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2.2)' }, 1.05)
        .to(m('vein'), { opacity: 1, duration: 0.3 }, 1.35);
    };
    mark.addEventListener('click', play);
    if (hasGsap && !reduce) new IntersectionObserver(([e], io) => { if (e.isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.6 }).observe(mark);
  }

  // ---------- Up close: the tab bar pulses where things land ----------
  const navbox = $('[data-navbox]');
  if (navbox) {
    const tabs = $$('[data-tab]', navbox);
    const pulse = i => { i.classList.remove('pulse'); void i.offsetWidth; i.classList.add('pulse'); };
    const pick = t => { tabs.forEach(x => x.classList.toggle('on', x === t)); pulse($('i', t)); };
    tabs.forEach(t => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(t); } });
    });
    if (!reduce) {
      let timer = null;
      new IntersectionObserver(([e]) => {
        clearInterval(timer);
        if (e.isIntersecting) { pulse($('[data-pulse]', navbox)); timer = setInterval(() => pulse($('[data-pulse]', navbox)), 3200); }
      }, { threshold: 0.6 }).observe(navbox);
    }
  }

  // ---------- Motion that starts as each part enters view ----------
  if (hasGsap && !reduce) {
    const whileSeen = (el, tl, threshold = 0.35) => new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), { threshold }).observe(el);

    // Hero: the phones rise (case.js) and fan out from behind the centre one, like a hand of cards
    if (stage) {
      const st = { trigger: stage, start: 'top 92%', once: true };
      gsap.from($('.wf-ph--l', stage), { xPercent: 72, rotation: 7, duration: 1.5, ease: 'expo.out', delay: 0.45, scrollTrigger: st });
      gsap.from($('.wf-ph--r', stage), { xPercent: -72, rotation: -7, duration: 1.5, ease: 'expo.out', delay: 0.5, scrollTrigger: st });
      gsap.from($('.wf-ph--c', stage), { scale: 0.9, duration: 1.3, ease: 'expo.out', delay: 0.35, scrollTrigger: st });
    }

    // ---------- The clever bits: each tile plays a piece of the app on a loop ----------
    const tile = k => $(`[data-tile="${k}"]`);
    const bump = el => gsap.fromTo(el, { scale: 1 }, { scale: 1.14, duration: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    const flip = (el, text) => gsap.timeline().to(el, { yPercent: -60, autoAlpha: 0, duration: 0.16 }).call(() => { el.textContent = text; }).fromTo(el, { yPercent: 60 }, { yPercent: 0, autoAlpha: 1, duration: 0.22, ease: 'back.out(2)' });
    const toastIn = (tl, el, at, out) => tl.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'back.out(2)' }, at).to(el, { autoAlpha: 0, y: 10, duration: 0.25 }, out);

    // Step-by-step: one more person, then the method lights up a step at a time
    const tm = tile('method');
    if (tm) {
      const steps = $$('.wf-steps li', tm), serves = $('[data-serves]', tm), serves2 = $('[data-serves2]', tm), plus = $('[data-plus]', tm);
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4, paused: true });
      tl.call(() => { serves.textContent = '2'; serves2.textContent = '2'; steps.forEach(li => li.classList.remove('on', 'done')); }, null, 0)
        .call(() => { bump(plus); flip(serves, '3'); flip(serves2, '3'); }, null, 0.7);
      steps.forEach((li, i) => {
        tl.call(() => { steps.forEach((x, k) => { x.classList.toggle('on', k === i); x.classList.toggle('done', k < i); }); }, null, 1.5 + i * 1.4)
          .fromTo(li, { x: 0 }, { x: 6, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.5 + i * 1.4);
      });
      tl.call(() => steps.forEach(x => { x.classList.remove('on'); x.classList.add('done'); }), null, 1.5 + steps.length * 1.4)
        .to({}, { duration: 1.2 }, 1.5 + steps.length * 1.4);
      whileSeen(tm, tl, 0.3);
    }

    // Saved meals: tap Cooked on the top card (the count goes up), then it goes to the back
    const ts = tile('saved');
    if (ts) {
      const cards = $$('[data-mcard]', ts);
      let order = cards.map((c, i) => i);
      const place = dur => order.forEach((c, p) => { gsap.set(cards[c], { zIndex: 3 - p }); gsap.to(cards[c], { x: 0, rotation: 0, y: p * 26, scale: 1 - p * 0.06, autoAlpha: 1, duration: dur, ease: 'power3.out' }); });
      place(0);
      const tl = gsap.timeline({ repeat: -1, paused: true });
      cards.forEach((_, k) => {
        const at = k * 3.6;
        tl.call(() => {
          const front = cards[order[0]], btn = $('[data-cooked]', front), made = $('[data-made]', front);
          made.dataset.orig ??= made.textContent;
          btn.classList.add('on'); bump(btn);
          flip(made, made.dataset.orig.replace(/(\d+)×.*$/, (m, n) => `${+n + 1}× · last 10 Oct`));
        }, null, at + 0.9)
          .call(() => {
            const front = cards[order[0]];
            gsap.to(front, { x: '-115%', rotation: -9, autoAlpha: 0, duration: 0.5, ease: 'power2.in', onComplete: () => {
              $('[data-cooked]', front).classList.remove('on');
              const made = $('[data-made]', front); made.textContent = made.dataset.orig;
              order.push(order.shift()); gsap.set(front, { x: 0, rotation: 0 }); place(0.6);
            } });
          }, null, at + 2.6);
      });
      tl.to({}, { duration: 0.01 }, cards.length * 3.6);
      whileSeen(ts, tl, 0.3);
    }

    // Freeze it: the snowflake sends the chicken down into the freezer, and its date stops counting down
    const tf = tile('freeze');
    if (tf) {
      const mover = $('[data-mover]', tf), snow = $('[data-snow]', mover), exp = $('[data-exp]', mover), where = $('[data-where]', mover);
      const lists = $$('.wf-fz-list', tf), cats = $$('.wf-fz-cat', tf);
      const above = [...$$('.fa-item', lists[0]).filter(r => r !== mover), cats[1]];
      const peas = $('.fa-item', lists[1]);
      const all = [mover, ...above, peas];
      const reset = () => {
        gsap.set(all, { y: 0, autoAlpha: 1 });
        mover.classList.add('soon'); exp.classList.add('soon'); $('em', exp).textContent = 'Use by Tomorrow'; where.textContent = 'Fridge';
        snow.classList.remove('on'); snow.style.visibility = '';
        $('[data-nfr]', tf).textContent = '3'; $('[data-nfz]', tf).textContent = '1';
      };
      const tl = gsap.timeline({ repeat: -1, paused: true });
      tl.call(reset, null, 0)
        .call(() => { snow.classList.add('on'); bump(snow); }, null, 0.9)
        .call(() => {
          const k = tf.getBoundingClientRect().width / 390 || 1;
          const step = (mover.offsetHeight + 8);
          const dy = (peas.getBoundingClientRect().top - mover.getBoundingClientRect().top) / k - step;
          gsap.to(above, { y: -step, duration: 0.7, ease: 'power3.inOut' });
          gsap.to(mover, { y: dy, duration: 0.8, ease: 'power3.inOut', onComplete: () => {
            mover.classList.remove('soon'); exp.classList.remove('soon'); snow.style.visibility = 'hidden';
            where.textContent = 'Freezer'; flip($('em', exp), 'Use by 9 Dec');
            flip($('[data-nfr]', tf), '2'); flip($('[data-nfz]', tf), '2');
          } });
        }, null, 1.4);
      toastIn(tl, $('[data-ttoast]', tf), 2.5, 4.4);
      tl.to(all, { autoAlpha: 0, duration: 0.3 }, 5.4).to({}, { duration: 0.1 }, 5.7);
      whileSeen(tf, tl, 0.3);
    }

    // Coach tips: the tour walks from screen to screen, one friendly tip at a time
    const tc = tile('coach');
    if (tc) {
      const tips = $$('.coach-tip', tc), title = $('[data-ctitle]', tc), dots = $$('.wf-cdots i', tc), navs = $$('.wf-tnav span', tc), ghosts = $$('.wf-ghost i', tc);
      const NAME = { Scan: 'Scan', Fridge: 'My food', List: 'My list', Ask: 'Ask' };
      gsap.set(tips, { autoAlpha: 0 });
      const tl = gsap.timeline({ repeat: -1, paused: true });
      tips.forEach((tip, i) => {
        const at = i * 2.8, key = tip.dataset.tip;
        tl.call(() => {
          title.textContent = NAME[key];
          dots.forEach((d, k) => d.classList.toggle('on', k === i));
          navs.forEach(n => n.classList.toggle('on', n.dataset.tn === key));
          const ic = navs.find(n => n.dataset.tn === key)?.querySelector('i');
          if (ic) { ic.classList.remove('pulse'); void ic.offsetWidth; ic.classList.add('pulse'); }
        }, null, at)
          .fromTo(title, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35 }, at)
          .fromTo(ghosts, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' }, at + 0.1)
          .fromTo(tip, { autoAlpha: 0, y: -12, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(2)' }, at + 0.35)
          .fromTo($('.coach-x', tip), { scale: 1 }, { scale: 0.7, duration: 0.12, yoyo: true, repeat: 1 }, at + 2.2)
          .to(tip, { autoAlpha: 0, y: -8, duration: 0.25 }, at + 2.45);
      });
      whileSeen(tc, tl, 0.3);
    }

    // Overlays: they drop in one after another as their demo arrives, then float on their own
    $$('.wf-demo').forEach(demo => {
      const ovs = $$('.wf-ov', demo);
      if (!ovs.length) return;
      gsap.set(ovs, { autoAlpha: 0, y: 24, scale: 0.85 });
      const floats = [];
      let started = false;
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !started) {
          started = true;
          gsap.to(ovs, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.8)', stagger: 0.18, delay: 0.3,
            onComplete: () => ovs.forEach((o, i) => floats.push(gsap.to(o, { y: i % 2 ? -7 : 7, duration: 2.4 + i * 0.45, ease: 'sine.inOut', repeat: -1, yoyo: true }))) });
        }
        floats.forEach(f => (e.isIntersecting ? f.play() : f.pause()));
      }, { threshold: 0.1 }).observe(demo);
    });

    // ---------- In detail: each band runs its own story on a loop ----------
    const deep = k => $(`[data-deep="${k}"]`);
    const callsIn = (tl, root, at) => tl.fromTo($$('.wf-call', root), { autoAlpha: 0, scale: 0.7, y: 10 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(2.2)', stagger: 0.5 }, at);

    // Freshness: day by day along the dairy window, amber, red, then the freezer stops the clock
    const df = deep('fresh');
    if (df) {
      const track = $('[data-track]', df), fill = $('[data-fill]', df), dot = $('[data-dot]', df), day = $('[data-day]', df), pill = $('[data-fpill]', df);
      const it = $('[data-fitem]', df), exp = $('[data-exp]', it), snow = $('[data-snow]', it), where = $('[data-where]', it), endl = $('[data-endlabel]', df);
      const lifeD = $('[data-life="dairy"]', df), lifeF = $('[data-life="freezer"]', df);
      const W = () => track.offsetWidth;
      const state = (cls, label) => { ['is-soon', 'is-past', 'is-frozen'].forEach(c => { track.classList.toggle(c, c === cls); pill.classList.toggle(c, c === cls); }); pill.textContent = label; };
      const LABELS = ['Use by 15 Oct', 'Use by 15 Oct', 'Use by 15 Oct', 'Use by 15 Oct', 'Use by 15 Oct', 'Use by 2 days', 'Use by Tomorrow', 'Use by Today', 'Expired Yesterday', 'Expired 2 days ago'];
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
      tl.call(() => {
        state(null, 'Fresh'); day.textContent = 'Day 0'; it.className = 'fa-item'; exp.className = 'fa-exp'; $('em', exp).textContent = 'Use by 15 Oct';
        snow.classList.remove('on'); where.textContent = 'Fridge'; endl.textContent = 'Dairy · 7 days';
        lifeD.classList.add('on'); lifeF.classList.remove('on'); gsap.set($$('i', track), { autoAlpha: 1 });
      }, null, 0).set(fill, { scaleX: 0 }, 0).set(dot, { x: 0 }, 0);
      callsIn(tl, df, 0.4);
      for (let d = 1; d <= 9; d++) {
        const at = 0.6 + d * 0.75;
        tl.to(fill, { scaleX: d / 9, duration: 0.5, ease: 'power2.out' }, at)
          .to(dot, { x: () => W() * d / 9, duration: 0.5, ease: 'power2.out' }, at)
          .call(() => {
            day.textContent = `Day ${d}`;
            const cls = d >= 8 ? 'is-past' : d >= 5 ? 'is-soon' : null;
            state(cls, d >= 8 ? 'Past its date' : d >= 5 ? 'Use soon' : 'Fresh');
            it.className = 'fa-item' + (d >= 8 ? ' expired' : d >= 5 ? ' soon' : '');
            exp.className = 'fa-exp' + (d >= 8 ? ' expired' : d >= 5 ? ' soon' : '');
            $('em', exp).textContent = LABELS[d];
          }, null, at);
      }
      // back to day 6, and freeze it instead
      tl.call(() => { day.textContent = 'Day 6'; state('is-soon', 'Use soon'); it.className = 'fa-item soon'; exp.className = 'fa-exp soon'; $('em', exp).textContent = 'Use by Tomorrow'; }, null, 8.4)
        .to(fill, { scaleX: 6 / 9, duration: 0.5 }, 8.4).to(dot, { x: () => W() * 6 / 9, duration: 0.5 }, 8.4)
        .call(() => { snow.classList.add('on'); bump(snow); }, null, 9.3)
        .call(() => {
          where.textContent = 'Freezer'; it.className = 'fa-item'; exp.className = 'fa-exp'; flip($('em', exp), 'Use by 7 Dec');
          state('is-frozen', 'Frozen'); endl.textContent = 'Freezer · 60 days'; day.textContent = 'Day 6 of 60';
          lifeD.classList.remove('on'); lifeF.classList.add('on');
        }, null, 9.8)
        .to($$('i', track), { autoAlpha: 0.15, duration: 0.3 }, 9.8)
        .to(fill, { scaleX: 6 / 60, duration: 0.8, ease: 'power3.inOut' }, 9.8)
        .to(dot, { x: () => W() * 6 / 60, duration: 0.8, ease: 'power3.inOut' }, 9.8)
        .to({}, { duration: 2.4 }, 10.6);
      whileSeen(df, tl, 0.25);
    }

    // Usuals: Milk turns up on three separate days, becomes a usual, runs out, back on the list
    const du = deep('usuals');
    if (du) {
      const cells = $$('.wf-cal__d', du), seen = $('[data-seen]', du), usual = $('[data-usual]', du);
      const milk = $('[data-milk]', du), used = $('[data-usedbtn]', milk), low = $('[data-low]', du), add = $('[data-ladd]', du);
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
      tl.call(() => { cells.forEach(c => c.classList.remove('on')); seen.textContent = '0'; used.classList.remove('on'); add.classList.remove('done'); $('span', add).textContent = 'Add'; }, null, 0)
        .set(usual, { autoAlpha: 0, scale: 0.5 }, 0).set(low, { autoAlpha: 0.4, scale: 0.96 }, 0).set(milk, { autoAlpha: 1, y: 0 }, 0);
      callsIn(tl, du, 0.4);
      [1, 5, 10].forEach((d, i) => tl.call(() => { cells[d].classList.add('on'); flip(seen, String(i + 1)); }, null, 0.8 + i * 1.1).fromTo(cells[d], { scale: 0.6 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' }, 0.8 + i * 1.1));
      tl.to(usual, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2.5)' }, 4.2)
        .call(() => { used.classList.add('on'); bump(used); }, null, 5.2)
        .to(milk, { autoAlpha: 0.35, y: -6, duration: 0.4 }, 5.6)
        .to(low, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'back.out(1.8)' }, 6.0)
        .call(() => { add.classList.add('done'); $('span', add).textContent = 'On list'; bump(add); }, null, 7.4)
        .to({}, { duration: 2.2 }, 7.6);
      whileSeen(du, tl, 0.25);
    }

    // The list puts it away: tick each item and it flies to the fridge, freezer or pantry
    const dfl = deep('file');
    if (dfl) {
      const box = $('.wf-file', dfl), rows = $$('[data-to]', dfl), ticked = $('[data-fticked]', dfl);
      const dests = Object.fromEntries($$('[data-dest]', dfl).map(d => [d.dataset.dest, d]));
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, paused: true });
      tl.call(() => { rows.forEach(r => r.classList.remove('done')); ticked.textContent = '0'; Object.values(dests).forEach(d => { const b = $('b', d); b.textContent = b.dataset.n; }); }, null, 0);
      callsIn(tl, dfl, 0.4);
      rows.forEach((r, i) => {
        const at = 0.8 + i * 1.15;
        tl.call(() => {
          r.classList.add('done'); flip(ticked, String(i + 1));
          const d = dests[r.dataset.to], br = box.getBoundingClientRect(), rr = $('b', r).getBoundingClientRect(), dr = d.getBoundingClientRect();
          const chip = document.createElement('span');
          chip.className = 'wf-fly'; chip.textContent = $('b', r).textContent; box.append(chip);
          const k = br.width / box.offsetWidth || 1;
          gsap.fromTo(chip, { x: (rr.left - br.left) / k, y: (rr.top - br.top) / k, scale: 1, autoAlpha: 1 },
            { x: (dr.left - br.left) / k + (dr.width / k) * 0.55, y: (dr.top - br.top) / k + 8, scale: 0.6, duration: 0.75, ease: 'power2.inOut',
              onComplete: () => { gsap.to(chip, { autoAlpha: 0, duration: 0.2, onComplete: () => chip.remove() }); const b = $('b', d); b.textContent = String(+b.textContent + 1); bump(d); } });
        }, null, at);
      });
      tl.to({}, { duration: 1.8 }, 0.8 + rows.length * 1.15);
      whileSeen(dfl, tl, 0.25);
    }

    // Offline: the signal drops, the list still works and says so, then it syncs; and it installs
    const dof = deep('offline');
    if (dof) {
      const sig = $('[data-sig]', dof), sync = $('[data-sync]', dof), rows = $$('[data-oshop]', dof);
      const on = $('[data-neton]', dof), off = $('[data-netoff]', dof), a2hs = $('[data-a2hs]', dof), sheet = $('.wf-a2hs', dof);
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
      tl.call(() => { sig?.classList.remove('is-off'); rows.forEach(r => r.classList.remove('done')); a2hs.classList.remove('hot'); }, null, 0)
        .set(sync, { autoAlpha: 0, height: 'auto' }, 0).set([on, off], { autoAlpha: 0 }, 0).set(sheet, { autoAlpha: 0, y: 30 }, 0);
      callsIn(tl, dof, 0.3);
      tl.call(() => sig?.classList.add('is-off'), null, 0.8)
        .fromTo(off, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2.4)' }, 0.8)
        .fromTo(sync, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'back.out(1.8)' }, 1.2);
      rows.slice(0, 2).forEach((r, i) => tl.call(() => { r.classList.add('done'); bump($('.fa-box', r)); }, null, 2.2 + i * 0.9));
      tl.call(() => sig?.classList.remove('is-off'), null, 4.4)
        .to(off, { autoAlpha: 0, duration: 0.25 }, 4.4)
        .fromTo(on, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2.4)' }, 4.5)
        .to(sync, { autoAlpha: 0, y: -8, duration: 0.35 }, 4.6)
        .to(sheet, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'expo.out' }, 5.6)
        .call(() => a2hs.classList.add('hot'), null, 6.5)
        .to({}, { duration: 2 }, 6.8);
      whileSeen(dof, tl, 0.25);
    }

    // Colour swatches drop in one after another
    const sw = $$('.palette .swatch');
    if (sw.length && window.ScrollTrigger) gsap.from(sw, { y: 28, autoAlpha: 0, duration: 0.6, ease: 'back.out(1.8)', stagger: 0.06, scrollTrigger: { trigger: sw[0].parentElement, start: 'top 88%', once: true } });

    // The pieces around each demo drift at their own pace as the page scrolls (transform only)
    if (window.ScrollTrigger) $$('.wf-demo .wf-pull, .wf-demo .wf-note, .wf-found, .wf-receipt').forEach((el, i) => {
      const d = i % 2 ? 1 : -1;
      gsap.fromTo(el, { y: 20 * d }, { y: -20 * d, ease: 'none', scrollTrigger: { trigger: el.closest('.wf-demo'), start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });
  }

  // ---------- The timeline: a node per item, the line draws down as you scroll ----------
  const tlEl = $('[data-tl]');
  if (tlEl) {
    const items = $$(':scope > section', tlEl);
    items.forEach(sec => {
      const node = document.createElement('span');
      node.className = 'wf-node'; node.setAttribute('aria-hidden', 'true');
      const num = $('.wf-step b', sec);
      if (num && /^\d+$/.test(num.textContent.trim())) node.textContent = num.textContent.trim();
      else node.innerHTML = '<svg viewBox="0 0 24 24"><use href="#fa-sparkle"/></svg>';
      sec.append(node);
    });
    const fill = $('.wf-tl__line i', tlEl), nodes = $$('.wf-node', tlEl);
    if (!hasGsap || reduce || !window.ScrollTrigger) {
      if (fill) fill.style.transform = 'scaleY(1)';
      nodes.forEach(n => n.classList.add('is-lit'));
    } else {
      gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tlEl, start: 'top 60%', end: 'bottom 60%', scrub: 0.4 } });
      nodes.forEach(n => {
        ScrollTrigger.create({ trigger: n, start: 'top 60%', onEnter: () => { n.classList.add('is-lit'); gsap.fromTo(n, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); }, onLeaveBack: () => n.classList.remove('is-lit') });
      });
      // each side slides in from its own side (desktop); on phones everything rises from the right
      const wide = matchMedia('(min-width: 761px)').matches;
      items.forEach(sec => {
        const row = sec.querySelector(':scope > .wf-deep') || sec;
        const copy = row.querySelector('.wf-feat__copy, .wf-deep__copy');
        const demo = row.querySelector('.wf-demo, .wf-deep__stage');
        if (!copy || !demo || sec.classList.contains('wf-cook')) return;
        const flip = row.classList.contains('wf-feat--flip') || row.classList.contains('wf-deep--flip');
        const cs = wide ? (flip ? 1 : -1) : 1;
        // phones: rise instead of sliding sideways, so nothing pokes past the screen edge
        const from = wide ? { x: 46 * cs } : { y: 26 };
        const fromD = wide ? { x: -46 * cs } : { y: 34 };
        gsap.from(copy, { ...from, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 82%', once: true } });
        gsap.from(demo, { ...fromD, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 82%', once: true } });
      });
    }
  }
})();
