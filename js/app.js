(() => {
  const $ = id => document.getElementById(id);

  // ===== Kategori: dari <body data-cat="..."> atau ?cat=lf|transporter|sumo =====
  const params = new URLSearchParams(location.search);
  const catKey = params.get('cat') || document.body.dataset.cat || 'lf';
  const CAT = window.EWC_CATEGORIES[catKey] || window.EWC_CATEGORIES.lf;
  const C = window.EWC_COMMON;

  $('ordNum').textContent = C.editionNumber;
  $('ordSuf').textContent = C.edition;
  $('title').textContent = C.title;
  $('subtitle').textContent = CAT.subtitle;
  $('session').innerHTML = C.session.replace('\n', '<br>');
  $('badge').textContent = C.badge;
  $('n1').textContent = CAT.robots[0];
  $('n2').textContent = CAT.robots[1];
  $('setMinutes').value = CAT.defaultMinutes;
  document.title = 'Timer ' + CAT.subtitle;

  // ===== Scale stage ke ukuran layar =====
  const stage = $('stage');
  const fit = () => stage.style.setProperty('--s', Math.min(innerWidth / 1280, innerHeight / 720));
  addEventListener('resize', fit); fit();

  // Auto-kecilkan judul bila font fallback lebih lebar dari area (agar tidak menabrak logo)
  const fitText = (el, maxW, base) => {
    el.style.fontSize = base + 'px';
    const w = el.scrollWidth;
    if (w > maxW) el.style.fontSize = (base * maxW / w) + 'px';
  };
  const fitHead = () => { fitText($('title'), 690, 68); };
  fitHead();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHead);

  // ===== Timer =====
  let st = 'idle', t0 = 0, res = { 1: null, 2: null }, raf = 0, last = 0;
  let mode = 'countup', targetTime = 0, timeUp = false;

  const fmt = ms => {
    const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, x = Math.floor(ms % 1000 / 10);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(x).padStart(2, '0');
  };
  const minutes = () => (parseInt($('setMinutes').value) || CAT.defaultMinutes) * 60000;

  function tick() {
    if (mode === 'countup') {
      last = performance.now() - t0;
    } else {
      last = Math.max(0, targetTime - (performance.now() - t0));
      if (last <= 0) {
        st = 'done'; timeUp = true;
        cancelAnimationFrame(raf);
        $('time').textContent = '00:00.00';
        $('time').classList.remove('run', 'countdown');
        $('time').classList.add('low');
        ui();
        return;
      }
      $('time').classList.toggle('low', last <= 10000);
    }
    $('time').textContent = fmt(last);
    if (st === 'run') raf = requestAnimationFrame(tick);
  }

  function start() {
    if (st !== 'idle') return;
    if (mode === 'countdown') {
      targetTime = minutes();
      $('time').classList.add('countdown');
    }
    st = 'run'; timeUp = false;
    t0 = performance.now();
    $('time').classList.add('run');
    tick(); ui();
  }

  function finish(n) {
    if (st !== 'run' || res[n] !== null) return;
    const elapsed = performance.now() - t0;
    // countup: waktu tempuh; countdown: sisa waktu
    res[n] = mode === 'countup' ? elapsed : Math.max(0, targetTime - elapsed);
    if (res[1] !== null && res[2] !== null) {
      st = 'done';
      cancelAnimationFrame(raf);
      last = mode === 'countup' ? Math.max(res[1], res[2]) : Math.min(res[1], res[2]);
      $('time').textContent = fmt(last);
      $('time').classList.remove('run', 'low');
    }
    ui();
  }

  function reset() {
    cancelAnimationFrame(raf);
    st = 'idle'; timeUp = false;
    res = { 1: null, 2: null }; last = 0;
    if (mode === 'countdown') { targetTime = minutes(); $('time').textContent = fmt(targetTime); }
    else $('time').textContent = '00:00.00';
    $('time').classList.remove('run', 'countdown', 'low');
    ui();
  }

  function ui() {
    const a = res[1], b = res[2];
    $('state').textContent =
      timeUp ? 'Waktu Habis!' :
      st === 'idle' ? 'Siap' :
      st === 'run' ? (mode === 'countup' ? 'Berjalan' : 'Countdown!') : 'Selesai';

    [1, 2].forEach(n => {
      const r = res[n], o = res[n === 1 ? 2 : 1], c = $('c' + n);
      $('t' + n).textContent = r === null ? '--:--.--' : fmt(r);
      c.className = 'card' + (r !== null ? ' fin' : '');
      let s = '';
      if (r !== null) {
        const first = o === null || (mode === 'countup' ? r < o : r > o);
        if (first) c.classList.add('win');
        s = first ? 'FINISH PERTAMA' : 'FINISH';
        if (a !== null && b !== null) {
          const diff = (Math.abs(a - b) / 1000).toFixed(2);
          s = first ? 'TERCEPAT (selisih ' + diff + ' s)' : '+' + diff + ' s';
        }
      } else if (st === 'run') s = 'Menunggu finish...';
      $('s' + n).textContent = s;
    });
    $('bs').style.display = st === 'idle' ? '' : 'none';
  }

  function setMode(m) {
    if (st !== 'idle') { $(mode === 'countup' ? 'modeUp' : 'modeDown').checked = true; return; }
    mode = m;
    $('cdBox').style.display = m === 'countdown' ? '' : 'none';
    reset();
  }

  addEventListener('keydown', e => {
    if (e.repeat || e.target.tagName === 'INPUT' && e.target.type === 'number') return;
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); start(); }
    else if (e.key === '1') finish(1);
    else if (e.key === '2') finish(2);
    else if (e.key === 'r' || e.key === 'R' || e.key === 'Escape') reset();
    else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('clean');
  });
  $('bs').onclick = e => { start(); e.target.blur(); };
  $('br').onclick = e => { reset(); e.target.blur(); };
  $('c1').onclick = () => finish(1);
  $('c2').onclick = () => finish(2);
  $('modeUp').onchange = () => setMode('countup');
  $('modeDown').onchange = () => setMode('countdown');
  $('setMinutes').oninput = () => { if (st === 'idle' && mode === 'countdown') reset(); };

  $('cdBox').style.display = 'none';
  reset();
})();
