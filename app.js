document.addEventListener('DOMContentLoaded', () => {
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ============================================================
     MÚSICA (assets/music.mp3) — botón flotante: pausar / continuar
     ============================================================ */
  const audio = $('#bg-music');
  const musicBtn = $('#music-toggle');

  function syncMusicUI() {
    const playing = !audio.paused;
    musicBtn.classList.toggle('playing', playing);
    musicBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
  }
  audio.addEventListener('play', syncMusicUI);
  audio.addEventListener('pause', syncMusicUI);
  audio.addEventListener('error', syncMusicUI);
  musicBtn.addEventListener('click', () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  syncMusicUI();

  /* ============================================================
     PANTALLA DE APERTURA (el clic es el gesto que permite iniciar la música)
     ============================================================ */
  const cover = $('#envelope-screen');
  $('#open-invitation').addEventListener('click', () => {
    audio.play().catch(() => {});
    cover.classList.add('opening');
    setTimeout(() => {
      cover.classList.add('dismiss');
      document.body.classList.add('opened');
    }, 1050);
  });

  /* ============================================================
     GALERÍA: lightbox (modal) — ya existente
     ============================================================ */
  const photos = [...document.querySelectorAll('[data-showcase-root] img')]
    .filter(i => /^Wedding photo \d+$/.test(i.alt));
  const lb = $('#local-lightbox');
  const lbImg = $('img', lb);
  const count = $('.lb-controls span', lb);
  let current = 0;

  function show(i) {
    if (!photos.length) return;
    current = (i + photos.length) % photos.length;
    lbImg.src = photos[current].src;
    lbImg.alt = photos[current].alt;
    count.textContent = (current + 1) + ' / ' + photos.length;
    lb.classList.add('show');
  }
  photos.forEach((img, i) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => show(i));
  });
  $('[data-lb-prev]').onclick = () => show(current - 1);
  $('[data-lb-next]').onclick = () => show(current + 1);
  $('[data-lb-close]').onclick = () => lb.classList.remove('show');
  lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('show'); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('show')) return;
    if (e.key === 'Escape') lb.classList.remove('show');
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  /* ============================================================
     GALERÍA: carrusel 3D de la página principal
     - Cambia solo cada 4 s, con flechas, con los puntos o deslizando el dedo
     - Cada foto gira hacia su siguiente posición
     ============================================================ */
  const stage = $('#gallery-carousel');
  if (stage) {
    const cards = [...stage.children];
    const n = cards.length;
    const dots = [...document.querySelectorAll('[aria-label^="Go to photo"]')];
    const prevBtn = $('[aria-label="Previous photo"]');
    const nextBtn = $('[aria-label="Next photo"]');
    const DURATION = 1100;   // ms de la animación (igual que el diseño original)
    const AUTO_MS = 4000;    // cambio automático

    // Posiciones por "distancia" respecto a la foto central
    const POS = {
      0:    { x: 0,    z: 0,    r: 0,    s: 1,    o: 1,    zi: 100 },
      1:    { x: 60,   z: -150, r: 45,   s: 0.85, o: 0.75, zi: 99 },
      2:    { x: 120,  z: -300, r: 90,   s: 0.7,  o: 0.5,  zi: 98 },
      3:    { x: -180, z: -450, r: -135, s: 0.7,  o: 0.3,  zi: 97 },   // atrás (lado izq.)
      '3r': { x: 180,  z: -450, r: 135,  s: 0.7,  o: 0.3,  zi: 97 },   // atrás (lado der.)
      '-2': { x: -120, z: -300, r: -90,  s: 0.7,  o: 0.5,  zi: 98 },
      '-1': { x: -60,  z: -150, r: -45,  s: 0.85, o: 0.75, zi: 99 }
    };

    // Foto que arranca al centro: la que ya trae el anillo en el HTML original
    let cur = Math.max(0, cards.findIndex(c => c.classList.contains('ring-2')));

    const dist = (i, c) => {
      let d = (((i - c) % n) + n) % n;     // 0..n-1
      if (d > 3) d -= n;                    // 4→-2, 5→-1
      return d;
    };
    function place(el, key) {
      const p = POS[key];
      el.style.transform = `translateX(${p.x}%) translateZ(${p.z}px) rotateY(${p.r}deg) scale(${p.s})`;
      el.style.opacity = p.o;
      el.style.zIndex = p.zi;
    }
    function setAnim(el, on) { el.style.transitionDuration = on ? DURATION + 'ms' : '0ms'; }

    function paint(backKey) {
      cards.forEach((el, i) => {
        const d = dist(i, cur);
        place(el, d === 3 ? backKey : d);
        el.classList.toggle('ring-2', d === 0);
        el.classList.toggle('ring-white/30', d === 0);
      });
      dots.forEach((dot, i) => {
        const on = i === cur;
        dot.classList.toggle('w-6', on);
        dot.classList.toggle('opacity-70', on);
        dot.classList.toggle('w-2', !on);
        dot.classList.toggle('opacity-25', !on);
        dot.classList.toggle('hover:opacity-40', !on);
      });
    }

    // Un paso: dir = +1 (siguiente) o -1 (anterior)
    function step(dir) {
      // La tarjeta que está atrás se coloca (sin animar) del lado desde el que va a girar,
      // así nunca cruza por delante de las demás.
      cards.forEach((el, i) => {
        if (dist(i, cur) === 3) {
          setAnim(el, false);
          place(el, dir > 0 ? '3r' : 3);
        }
      });
      void stage.offsetWidth; // fuerza el reflow antes de animar
      cur = (cur + dir + n) % n;
      cards.forEach(el => setAnim(el, true));
      paint(dir > 0 ? 3 : '3r');
    }

    let busyUntil = 0;
    function manual(dir) {
      if (Date.now() < busyUntil) return;
      busyUntil = Date.now() + 500;
      step(dir);
      restartAuto();
    }

    // Ir a una foto concreta (puntos): avanza paso a paso por el camino más corto
    let jumpTimer = null;
    function goTo(target) {
      clearTimeout(jumpTimer);
      const diff = ((target - cur) % n + n) % n;
      if (diff === 0) return;
      const dir = diff <= n / 2 ? 1 : -1;
      let steps = dir > 0 ? diff : n - diff;
      busyUntil = Date.now() + 500;
      const run = () => {
        step(dir);
        if (--steps > 0) jumpTimer = setTimeout(run, 380);
      };
      run();
      restartAuto();
    }

    // Cambio automático cada 4 s (en pausa si el modal está abierto o la pestaña oculta)
    let autoTimer = null;
    function restartAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => {
        if (document.hidden || lb.classList.contains('show')) return;
        step(1);
      }, AUTO_MS);
    }

    prevBtn && prevBtn.addEventListener('click', () => manual(-1));
    nextBtn && nextBtn.addEventListener('click', () => manual(1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

    // Deslizar con el dedo (móvil) sin disparar el modal por error
    const touchZone = stage.parentElement.parentElement;
    let sx = 0, sy = 0, swiped = false;
    touchZone.addEventListener('touchstart', e => {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiped = false;
    }, { passive: true });
    touchZone.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        swiped = true;
        manual(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
    stage.addEventListener('click', e => {
      if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; }
    }, true);

    // Estado inicial (sin animación) y arranque
    cards.forEach(el => { setAnim(el, false); el.dataset.card = ''; });
    paint(3);
    void stage.offsetWidth;
    cards.forEach(el => setAnim(el, true));
    restartAuto();
  }

  /* ============================================================
     CAJA DE REGALOS (modal con QR de Yape)
     ============================================================ */
  const giftBtn = $('[aria-label="Abrir caja de regalos"]');
  const giftModal = $('#local-gift-modal');
  if (giftBtn) {
    giftBtn.addEventListener('click', () => {
      const qr = $('img[alt*="QR - Novio"]');
      if (qr) {
        $('#gift-qr').src = qr.src;
        $('#gift-label').textContent = qr.alt.replace('QR - ', '');
      }
      giftModal.classList.add('show');
    });
  }
  document.querySelectorAll('[data-gift-close]').forEach(b =>
    b.addEventListener('click', () => giftModal.classList.remove('show')));
  giftModal.addEventListener('click', e => {
    if (e.target === giftModal) giftModal.classList.remove('show');
  });

  /* ============================================================
     CUENTA REGRESIVA — sábado 28/11/2026, 12:00 (hora de Lima, UTC-5)
     ============================================================ */
  const cd = $('#countdown');
  if (cd) {
    const target = new Date('2026-11-28T12:00:00-05:00').getTime();
    const tick = () => {
      let ms = target - Date.now();
      if (ms <= 0) { cd.textContent = '¡Llegó el gran día!'; return false; }
      const d = Math.floor(ms / 86400000); ms %= 86400000;
      const h = Math.floor(ms / 3600000);  ms %= 3600000;
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      cd.textContent = `${d} ${d === 1 ? 'día' : 'días'} ${h} h ${m} min ${s} seg`;
      return true;
    };
    if (tick()) {
      const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
    }
  }
});
