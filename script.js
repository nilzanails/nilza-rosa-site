(() => {
  'use strict';

  /* ---------- Configuração do salão ---------- */
  const CONFIG = {
    whatsapp: '5511952544413',
    profissional: '',
  };

  // Opções do seletor de agendamento
  const BOOK_OPTIONS = [
    'Fibra de vidro · Colocação', 'Fibra de vidro · Manutenção',
    'Molde F1 · Colocação', 'Molde F1 · Manutenção',
    'Reposição de unha caída', 'Banho em gel', 'Esmaltação em gel', 'Remoção',
  ];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  const state = { service: null };

  /* ---------- Acordeão do agendamento ---------- */
  const toggle = $('#booking-toggle');
  const body = $('#booking-body');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    body.hidden = open;
  });

  function setPill(open) {
    $('.pill__btn', $('#pill-service')).setAttribute('aria-expanded', String(open));
    $('#panel-service').hidden = !open;
  }
  $('.pill__btn', $('#pill-service')).addEventListener('click', () => setPill($('#panel-service').hidden));

  /* ---------- Escolha do serviço ---------- */
  const optList = $('#service-options');
  BOOK_OPTIONS.forEach(nome => {
    const li = document.createElement('li');
    li.innerHTML = '<button type="button" aria-pressed="false"></button>';
    const b = li.firstChild;
    b.textContent = nome;
    b.addEventListener('click', () => chooseService(nome));
    optList.appendChild(li);
  });

  function chooseService(nome) {
    state.service = nome;
    $$('button', optList).forEach(b => b.setAttribute('aria-pressed', String(b.textContent === nome)));
    $('#label-service').textContent = nome;
    $('#pill-service').classList.add('is-set');
    setPill(false);
    renderSummary();
  }

  /* ---------- Resumo e envio ---------- */
  function renderSummary() {
    const el = $('#sum-service');
    el.textContent = state.service || 'Escolha o serviço';
    el.parentElement.classList.toggle('is-set', !!state.service);
    $('#btn-send').disabled = !state.service;
  }

  function whatsappUrl(text) {
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
  }

  $('#btn-send').addEventListener('click', () => {
    const msg = [
      'Olá! Gostaria de fazer um agendamento:',
      '',
      `Serviço: ${state.service}`,
      '',
      'Quais dias e horários você tem disponíveis?',
    ].join('\n');
    window.open(whatsappUrl(msg), '_blank', 'noopener');
  });

  $('#btn-edit').addEventListener('click', () => {
    setPill(true);
    $('#pill-service').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ---------- Galeria com dots e leve inclinação ---------- */
  const gTrack = $('#gallery');
  const gItems = $$('figure', gTrack);
  const dots = $('#gallery-dots');
  gItems.forEach(() => dots.appendChild(document.createElement('i')));
  function updateGallery() {
    const c = gTrack.scrollLeft + gTrack.clientWidth / 2;
    let best = 0, bestD = Infinity;
    gItems.forEach((f, i) => {
      const mid = f.offsetLeft + f.offsetWidth / 2;
      const off = Math.max(-1, Math.min(1, (mid - c) / f.offsetWidth));
      f.style.transform = `translate3d(0,0,0) scale(${(1 - Math.abs(off) * .16).toFixed(3)})`;
      if (Math.abs(mid - c) < bestD) { bestD = Math.abs(mid - c); best = i; }
    });
    $$('i', dots).forEach((d, i) => d.classList.toggle('is-on', i === best));
  }
  let gTick = false;
  gTrack.addEventListener('scroll', () => { if (!gTick) { gTick = true; requestAnimationFrame(() => { gTick = false; updateGallery(); }); } }, { passive: true });
  window.addEventListener('load', () => {
    const second = gItems[1];
    gTrack.scrollLeft = second.offsetLeft - (gTrack.clientWidth - second.offsetWidth) / 2;
    updateGallery();
  });
  window.addEventListener('resize', updateGallery);


  /* ---------- Visualizador: toque numa foto da galeria para ampliar ---------- */
  {
    const box = $('#lb'), img = $('#lb-img'), count = $('#lb-count');
    let cur = 0, busy = false, startX = null, startY = null, dx = 0, dragging = false;
    const big = i => 'img/grande/' + gItems[i].querySelector('img').getAttribute('src').split('/').pop();
    const wrap = i => (i + gItems.length) % gItems.length;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const load = src => new Promise(res => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = src; });
    const preload = i => { const im = new Image(); im.src = big(wrap(i)); };
    const setImg = i => {
      cur = wrap(i);
      img.src = big(cur);
      img.alt = gItems[cur].querySelector('img').alt;
      count.textContent = `${cur + 1} / ${gItems.length}`;
      preload(cur + 1); preload(cur - 1);
    };
    const resetInline = () => { img.style.transition = ''; img.style.transform = ''; img.style.opacity = ''; };

    // troca de foto: a atual sai deslizando, a nova entra do lado oposto (sem piscar)
    async function go(dir) {            // dir: +1 próxima, -1 anterior
      if (busy) return;
      busy = true;
      const from = dragging ? dx : 0;
      img.style.transition = 'transform .2s ease-in, opacity .2s ease-in';
      img.style.transform = `translateX(${-dir * 70}px)`;
      img.style.opacity = '0';
      const next = wrap(cur + dir);
      await Promise.all([wait(200), load(big(next))]);
      setImg(next);
      img.style.transition = 'none';
      img.style.transform = `translateX(${dir * 70}px)`;
      img.getBoundingClientRect();      // força o recálculo antes de animar a entrada
      img.style.transition = 'transform .32s cubic-bezier(.22, 1, .36, 1), opacity .32s ease-out';
      img.style.transform = 'translateX(0)';
      img.style.opacity = '1';
      await wait(330);
      busy = false;
    }

    const open = i => {
      box.hidden = false;
      document.body.classList.add('lb-open');
      resetInline();
      img.classList.remove('is-in');
      setImg(i);
      setTimeout(() => { box.classList.add('is-open'); img.classList.add('is-in'); }, 20);
    };
    const close = () => {
      box.classList.remove('is-open');
      img.classList.remove('is-in');
      document.body.classList.remove('lb-open');
      setTimeout(() => { box.hidden = true; img.removeAttribute('src'); resetInline(); }, 260);
    };

    gItems.forEach((f, i) => { f.style.cursor = 'zoom-in'; f.addEventListener('click', () => open(i)); });
    $('#lb-close').addEventListener('click', close);
    $('#lb-prev').addEventListener('click', e => { e.stopPropagation(); go(-1); });
    $('#lb-next').addEventListener('click', e => { e.stopPropagation(); go(1); });
    box.addEventListener('click', e => { if (e.target === box) close(); });
    document.addEventListener('keydown', e => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });

    // arrastar com o dedo: a foto acompanha o toque
    box.addEventListener('touchstart', e => {
      if (busy) return;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; dx = 0; dragging = false;
    }, { passive: true });
    box.addEventListener('touchmove', e => {
      if (startX === null || busy) return;
      const mx = e.touches[0].clientX - startX, my = e.touches[0].clientY - startY;
      if (!dragging && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) dragging = true;
      if (!dragging) return;
      dx = mx;
      img.style.transition = 'none';
      img.style.transform = `translateX(${dx}px)`;
      img.style.opacity = String(Math.max(.35, 1 - Math.abs(dx) / 420));
    }, { passive: true });
    box.addEventListener('touchend', () => {
      if (startX === null) return;
      const moved = dx, was = dragging;
      startX = null;
      if (was && Math.abs(moved) > 60) { go(moved < 0 ? 1 : -1).then(() => { dragging = false; dx = 0; }); return; }
      if (was) {                          // não passou do limite: volta suave ao lugar
        img.style.transition = 'transform .28s cubic-bezier(.22, 1, .36, 1), opacity .28s ease-out';
        img.style.transform = 'translateX(0)';
        img.style.opacity = '1';
      }
      dragging = false; dx = 0;
    }, { passive: true });
  }


  /* ---------- Zoom leve ao tocar nos serviços ---------- */
  $$('.svc-wide, .svc-photo, .svc-mini').forEach(card => {
    let t = 0;
    const down = () => { clearTimeout(t); card.classList.add('is-press'); };
    const up = () => { clearTimeout(t); t = setTimeout(() => card.classList.remove('is-press'), 180); };
    card.addEventListener('pointerdown', down, { passive: true });
    card.addEventListener('pointerup', up, { passive: true });
    card.addEventListener('pointercancel', up, { passive: true });
    card.addEventListener('pointerleave', up, { passive: true });
    // toque rápido: garante o "pulso" mesmo que o dedo solte antes da animação
    card.addEventListener('click', () => { down(); up(); });
  });

  /* ---------- FAQ: só uma pergunta aberta por vez ---------- */
  const faq = $$('#faq details');
  faq.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) faq.forEach(o => { if (o !== d) o.open = false; });
  }));

  /* ---------- Animações no celular ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Luz da borda girada por JS: funciona igual em qualquer iPhone (não depende de @property animado)
  // e só anima o que está visível na tela.
  {
    const spinners = [
      ...$$('.lumi[data-variant="original"]').map(el => ({ el, prop: '--orbit-deg', period: 2400, deg: Math.random() * 360, mult: 1, boost: false, seen: false })),
      ...$$('.shiny-buy').map(el => ({ el, prop: '--gradient-angle', period: 3000, deg: 0, mult: 1, boost: true, seen: false })),
    ];
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => entries.forEach(e => {
        const s = spinners.find(x => x.el === e.target); if (s) s.seen = e.isIntersecting;
      }), { rootMargin: '80px' });
      spinners.forEach(s => io.observe(s.el));
    } else { spinners.forEach(s => { s.seen = true; }); }

    // no toque não existe hover: encostar no botão "acende" a luz por um instante
    $$('.shiny-buy').forEach(el => {
      let t = 0;
      el.addEventListener('pointerdown', () => { el.classList.add('is-hot'); clearTimeout(t); t = setTimeout(() => el.classList.remove('is-hot'), 1500); }, { passive: true });
    });

    let last = performance.now();
    const tick = now => {
      const dt = Math.min(now - last, 100); last = now;
      if (!document.hidden) {
        spinners.forEach(s => {
          if (!s.seen) return;
          if (s.el.matches('.faq details:not([open])')) return;   // sem luz nos fechados
          const hot = s.boost && (s.el.matches(':hover') || s.el.classList.contains('is-hot'));
          s.mult += ((hot ? 2.6 : 1) - s.mult) * 0.08;
          s.deg = (s.deg + (dt / s.period) * 360 * s.mult) % 360;
          s.el.style.setProperty(s.prop, s.deg.toFixed(1) + 'deg');
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Entrada suave dos blocos ao rolar
  if ('IntersectionObserver' in window) {
    const targets = [
      ...$$('.section h2, .section__sub, .svc-wide, .svc-photo, .svc-mini, .map, .map__addr, .faq details, .gallery'),
    ];
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('is-in');
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el, i) => {
      if (seen.has(el)) return;
      seen.add(el);
      const siblings = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.style.setProperty('--d', Math.min(siblings, 5) * 0.06 + 's');
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // Galeria em carrossel automático (pausa quando a pessoa mexe).
  // Roda mesmo com "Reduzir movimento" ligado: é um carrossel pedido, não um efeito decorativo.
  {
    let paused = false, resume = 0;
    const pause = () => { paused = true; clearTimeout(resume); resume = setTimeout(() => { paused = false; }, 7000); };
    ['touchstart', 'pointerdown', 'wheel'].forEach(ev => gTrack.addEventListener(ev, pause, { passive: true }));
    // visibilidade checada na hora (mais confiável que IntersectionObserver em qualquer celular)
    const onScreen = () => { const r = gTrack.getBoundingClientRect(); return r.bottom > 80 && r.top < innerHeight - 80; };
    setInterval(() => {
      if (paused || document.hidden || document.body.classList.contains('lb-open') || !onScreen()) return;
      const center = gTrack.scrollLeft + gTrack.clientWidth / 2;
      let idx = gItems.findIndex(f => f.offsetLeft + f.offsetWidth / 2 > center + 4);
      if (idx < 0) idx = 0;   // chegou na última: volta para a primeira
      const f = gItems[idx];
      gTrack.scrollTo({ left: f.offsetLeft - (gTrack.clientWidth - f.offsetWidth) / 2, behavior: 'smooth' });
    }, 3200);
  }

  /* ---------- Menu bolacha ---------- */
  {
    const btn = $('#menu-btn'), panel = $('#menu-panel'), backdrop = $('#menu-backdrop');
    const links = $$('a', panel);
    const setMenu = open => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      panel.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-open', open);
    };
    btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
    backdrop.addEventListener('click', () => setMenu(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    panel.addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a) return;
      setMenu(false);
      if (a.getAttribute('href') === '#agendamento' && body.hidden) toggle.click();   // abre o formulário junto
    });

    // destaca no menu a seção em que a pessoa está
    const targets = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    let ticking = false;
    const spy = () => {
      ticking = false;
      const line = innerHeight * 0.35;
      let current = targets[0];
      targets.forEach(t => { if (t.getBoundingClientRect().top <= line) current = t; });
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) current = targets[targets.length - 1];
      links.forEach(a => a.classList.toggle('is-active', $(a.getAttribute('href')) === current));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    addEventListener('resize', spy);
    spy();
  }

  /* ---------- Diagnóstico (só com ?debug na URL) ---------- */
  if (location.search.includes('debug')) {
    const mq = q => window.matchMedia(q).matches;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.85);color:#fff;font:12px/1.5 monospace;white-space:pre-wrap;pointer-events:none';
    const paint = () => {
      const buy = document.querySelector('.shiny-buy');
      const top = document.querySelector('.lumi');
      const shine = buy ? getComputedStyle(buy, '::after').animationName : '(sem botão)';
      box.textContent = [
        'reduzir movimento: ' + (mq('(prefers-reduced-motion: reduce)') ? 'LIGADO (desliga brilho/entradas)' : 'desligado'),
        'hover: ' + (mq('(hover: none)') ? 'none (toque)' : 'hover (mouse)'),
        '@property: ' + ((window.CSS && CSS.registerProperty) ? 'ok' : 'SEM SUPORTE'),
        'faixa de luz do Comprar: ' + shine,
        'luz do topo (JS): ' + (top.style.getPropertyValue('--orbit-deg') || 'parado'),
        'luz do Comprar (JS): ' + (buy && buy.style.getPropertyValue('--gradient-angle') || 'fora da tela'),
        'largura: ' + innerWidth,
      ].join('\n');
    };
    paint(); setInterval(paint, 500);
    document.body.appendChild(box);
  }

  // Links do rodapé
  $('#foot-wa').href = whatsappUrl('Olá! Gostaria de agendar um horário.');
  $('#fab-wa').href = whatsappUrl('Olá! Vim pelo site e gostaria de atendimento.');

  renderSummary();
})();
