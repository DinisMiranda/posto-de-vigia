/* Cena de abertura: um dia inteiro no posto de vigia, guiado pelo scroll.
   Tudo é desenhado em coordenadas de "mundo" (1600 x 1000) e a câmara
   faz o enquadramento e o zoom final para dentro da janela da cabine. */
(() => {
  const canvas = document.getElementById('cena');
  const ctx = canvas.getContext('2d');
  const historia = document.getElementById('historia');
  const relogio = document.getElementById('relogio');
  const humidade = document.getElementById('humidade');
  const titulo = document.getElementById('titulo');
  const hud = document.querySelector('.hud-intro');
  const entradas = [...document.querySelectorAll('.diario li')];
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MW = 1600, MH = 1000;
  const TORRE = { x: 1060, cabY: 300, cabH: 82, cabW: 128 };
  const JANELA = { x: 1020, y: 320 };      // alvo do zoom: o vidro da esquerda, aceso
  const FOGO = { x: 330 };

  // ---------- utilitários ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const suave = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function aleatorio(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mistura = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  // rampa de cor ao longo do progresso do dia
  function rampa(paragens) {
    const s = paragens.map(([p, c]) => [p, hex(c)]);
    return p => {
      if (p <= s[0][0]) return s[0][1];
      for (let i = 1; i < s.length; i++) {
        if (p <= s[i][0]) return mistura(s[i - 1][1], s[i][1], (p - s[i - 1][0]) / (s[i][0] - s[i - 1][0]));
      }
      return s[s.length - 1][1];
    };
  }
  const tempoDia = (dia, por, noite) => rampa([[0, dia], [0.42, dia], [0.55, por], [0.7, noite], [1, noite]]);

  // ---------- paleta do dia ----------
  const ceuTopo = rampa([[0, '#86B7D3'], [0.3, '#5E9CCB'], [0.45, '#7391BE'], [0.53, '#525E96'], [0.62, '#2A2F63'], [0.72, '#141B3D'], [1, '#10163A']]);
  const ceuBase = rampa([[0, '#E3ECE2'], [0.3, '#D2E5EA'], [0.45, '#F2D39A'], [0.53, '#F09A5B'], [0.62, '#8E5A73'], [0.72, '#2A3360'], [1, '#222A52']]);
  const camadas = [
    { cor: tempoDia('#A7BCC3', '#94819C', '#26325A') },
    { cor: tempoDia('#83A091', '#72637D', '#1C2748') },
    { cor: tempoDia('#5A7D60', '#4E4B62', '#141D36') },
    { cor: tempoDia('#3E6045', '#373A4D', '#0F172B') },
    { cor: tempoDia('#24412D', '#23202E', '#0A0F1E') },
  ];
  const corMetal = tempoDia('#8A4632', '#5A3440', '#0C1224');
  const corParede = tempoDia('#ECE6D6', '#C7A79B', '#1D2640');
  const corTelhado = tempoDia('#A53D2C', '#7A3439', '#0E1426');
  const corNuvem = rampa([[0, '#FFFFFF'], [0.42, '#FFFFFF'], [0.52, '#F6C39A'], [0.6, '#9A6D86'], [0.72, '#2C3561'], [1, '#2C3561']]);

  // ---------- geometria ----------
  function linhaCumeada(base, amp, seed) {
    const r = aleatorio(seed);
    const f = [r() * 6, r() * 6, r() * 6, r() * 6];
    return x => base + amp * (0.5 * Math.sin(x * 0.0037 + f[0]) + 0.28 * Math.sin(x * 0.0093 + f[1]) + 0.15 * Math.sin(x * 0.023 + f[2]) + 0.07 * Math.sin(x * 0.061 + f[3]));
  }
  const alturaMonte = x => 742 - 86 * Math.exp(-(((x - TORRE.x) / 250) ** 2)) + 10 * Math.sin(x * 0.012) + 4 * Math.sin(x * 0.041);
  const cumeadas = [
    linhaCumeada(470, 70, 3),
    linhaCumeada(560, 42, 11),
    linhaCumeada(655, 34, 23),
    alturaMonte,
    linhaCumeada(930, 40, 41),
  ];
  const BASE_TORRE = alturaMonte(TORRE.x) + 4;

  // árvores: todos os polígonos no sentido dos ponteiros do relógio (regra nonzero)
  function pinheiro(p, x, y, h) {
    const w = h * 0.26;
    p.rect(x - h * 0.02, y - h * 0.3, h * 0.04, h * 0.32);
    for (let i = 0; i < 3; i++) {
      const t = y - h * 0.22 - i * h * 0.24, ww = w * (1 - i * 0.24);
      p.moveTo(x, t - h * 0.36); p.lineTo(x + ww, t); p.lineTo(x - ww, t); p.closePath();
    }
  }
  function eucalipto(p, x, y, h, r) {
    p.rect(x - h * 0.015, y - h * 0.8, h * 0.03, h * 0.82);
    for (let i = 0; i < 4; i++) {
      const cx = x + (r() - 0.5) * h * 0.22, cy = y - h * (0.72 + r() * 0.26);
      p.moveTo(cx + h * 0.1, cy);
      p.ellipse(cx, cy, h * (0.07 + r() * 0.05), h * (0.1 + r() * 0.06), 0, 0, Math.PI * 2);
    }
  }
  function folhosa(p, x, y, h, r) {
    p.rect(x - h * 0.04, y - h * 0.45, h * 0.08, h * 0.47);
    for (let i = 0; i < 4; i++) {
      const cx = x + (r() - 0.5) * h * 0.4, cy = y - h * (0.55 + r() * 0.22), rr = h * (0.18 + r() * 0.1);
      p.moveTo(cx + rr, cy); p.arc(cx, cy, rr, 0, Math.PI * 2);
    }
  }

  function construirCamada(i) {
    const f = cumeadas[i];
    const r = aleatorio(100 + i);
    const p = new Path2D();
    p.moveTo(-200, f(-200));
    for (let x = -200; x <= MW + 200; x += 6) p.lineTo(x, f(x));
    p.lineTo(MW + 200, MH + 400); p.lineTo(-200, MH + 400); p.closePath();

    const cfg = [
      null,
      { passo: 7, h: [9, 15], mix: [0.7, 0.95] },      // eucaliptal distante a norte
      { passo: 11, h: [18, 30], mix: [0.35, 0.8] },
      { passo: 15, h: [30, 52], mix: [0.2, 0.55] },
      { passo: 34, h: [90, 170], mix: [0.1, 0.45] },
    ][i];
    if (cfg) {
      for (let x = -120; x < MW + 120; x += cfg.passo * (0.6 + r() * 0.9)) {
        if (i === 3 && Math.abs(x - TORRE.x) < 105) continue;       // clareira da torre
        if (i === 4 && x > 560 && x < 1320 && r() < 0.8) continue;   // abertura em primeiro plano
        const h = lerp(cfg.h[0], cfg.h[1], r());
        const y = f(x) + h * 0.05 + 2;
        const q = r();
        if (q < cfg.mix[0]) eucalipto(p, x, y, h * 1.25, r);
        else if (q < cfg.mix[1]) pinheiro(p, x, y, h);
        else folhosa(p, x, y, h * 0.8, r);
      }
    }
    return p;
  }
  const caminhos = cumeadas.map((_, i) => construirCamada(i));

  const rE = aleatorio(7);
  const estrelas = Array.from({ length: 220 }, () => ({ x: rE() * MW, y: rE() * 560, r: 0.4 + rE() * 1.3, f: rE() * 6 }));
  const nuvens = [
    { x: 240, y: 170, s: 1.1, v: 0.012 }, { x: 820, y: 110, s: 0.8, v: 0.008 }, { x: 1320, y: 210, s: 1.3, v: 0.01 },
  ];

  // ---------- câmara ----------
  let W = 0, H = 0, dpr = 1;
  function redimensionar() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  function camara(p) {
    const base = Math.max(W / MW, H / MH);
    // em ecrãs estreitos, o enquadramento puxa para a torre
    const vistaW = W / base;
    const naTorre = lerp(MW / 2, TORRE.x - 140, clamp((MW - vistaW) / 900, 0, 1));
    // quando o fogo começa, a câmara vira-se para ele e depois volta à torre
    const virar = suave(0.62, 0.69, p) * (1 - suave(0.79, 0.87, p));
    const cx = clamp(lerp(naTorre, FOGO.x + vistaW * 0.22, virar), vistaW / 2, MW - vistaW / 2);
    const cy = MH - (H / base) / 2;
    const zMax = Math.max(W / (30 * base), H / (18 * base)) * 1.2;
    const e = suave(0.8, 0.985, p);
    const z = Math.exp(lerp(0, Math.log(zMax), e * e));
    // a janela desliza da posição inicial no ecrã até ao centro enquanto a câmara se aproxima
    const s = base * z, resto = (1 - e) * base / s;
    return { s, fx: JANELA.x - (JANELA.x - cx) * resto, fy: JANELA.y - (JANELA.y - cy) * resto, z };
  }

  // ---------- fumo e brasas ----------
  const particulas = [];
  function atualizarFogo(intensidade, dt, t) {
    if (intensidade > 0.02 && !reduzir) {
      const n = intensidade * 2.4 * dt;
      for (let i = 0; i < n || Math.random() < n - i; i++) {
        const largura = 20 + intensidade * 190;
        particulas.push({
          x: FOGO.x + (Math.random() - 0.5) * largura, y: cumeadas[1](FOGO.x) - 4,
          vx: 0.1 + Math.random() * 0.22, vy: -(0.7 + Math.random() * 0.6),
          r: 4 + Math.random() * 5, v: 0, tipo: Math.random() < 0.18 ? 'brasa' : 'fumo',
        });
      }
    }
    for (let i = particulas.length - 1; i >= 0; i--) {
      const q = particulas[i];
      q.v += dt / (q.tipo === 'brasa' ? 110 : 420);
      q.x += (q.vx + q.v * q.v * 1.6) * dt; q.y += q.vy * dt * (q.tipo === 'brasa' ? 1.6 : 1);
      q.r += (q.tipo === 'brasa' ? 0 : 0.14) * dt;
      if (q.tipo === 'brasa') q.x += Math.sin(t * 0.01 + i) * 0.3;
      if (q.v >= 1) particulas.splice(i, 1);
    }
    if (particulas.length > 520) particulas.splice(0, particulas.length - 520);
  }

  // ---------- desenho ----------
  function desenharTorre(p, t) {
    const { x, cabY, cabH, cabW } = TORRE;
    const baixo = cabY + cabH;
    const metal = rgb(corMetal(p));
    ctx.strokeStyle = metal; ctx.lineCap = 'round';

    // pernas e contraventamentos
    const niveis = 6;
    const meia = y => lerp(34, 64, (y - baixo) / (BASE_TORRE - baixo));
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 34, baixo); ctx.lineTo(x - 64, BASE_TORRE);
    ctx.moveTo(x + 34, baixo); ctx.lineTo(x + 64, BASE_TORRE);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < niveis; i++) {
      const y1 = lerp(baixo, BASE_TORRE, i / niveis), y2 = lerp(baixo, BASE_TORRE, (i + 1) / niveis);
      ctx.moveTo(x - meia(y1), y1); ctx.lineTo(x + meia(y2), y2);
      ctx.moveTo(x + meia(y1), y1); ctx.lineTo(x - meia(y2), y2);
      ctx.moveTo(x - meia(y2), y2); ctx.lineTo(x + meia(y2), y2);
    }
    ctx.stroke();
    // escadas em ziguezague
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    for (let i = 0; i < niveis; i++) {
      const y1 = lerp(baixo, BASE_TORRE, i / niveis), y2 = lerp(baixo, BASE_TORRE, (i + 1) / niveis);
      const a = i % 2 ? -1 : 1;
      ctx.moveTo(x - a * 18, y1 + 3); ctx.lineTo(x + a * 18, y2 - 1);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // varandim
    ctx.fillStyle = metal;
    ctx.fillRect(x - cabW / 2 - 16, baixo, cabW + 32, 5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - cabW / 2 - 16, baixo - 16); ctx.lineTo(x + cabW / 2 + 16, baixo - 16);
    for (let i = 0; i <= 12; i++) { const xx = x - cabW / 2 - 16 + i * (cabW + 32) / 12; ctx.moveTo(xx, baixo - 16); ctx.lineTo(xx, baixo); }
    ctx.stroke();

    // cabine
    ctx.fillStyle = rgb(corParede(p));
    ctx.fillRect(x - cabW / 2, cabY, cabW, cabH);

    // janelas: reflexo de dia, candeeiro aceso à noite
    const aceso = suave(0.56, 0.66, p);
    const reflexo = rampa([[0, '#A9C9D8'], [0.42, '#B6D2DC'], [0.52, '#F0B27C'], [0.6, '#3A3556'], [1, '#232A45']])(p);
    const luz = mistura(reflexo, hex('#F6C46A'), aceso);
    const panos = [[-58, -22], [-18, 18], [22, 58]];
    const jy = cabY + 9, jh = 45;
    for (const [a, b] of panos) {
      ctx.fillStyle = rgb(luz);
      ctx.fillRect(x + a, jy, b - a, jh);
      if (aceso > 0) {
        const g = ctx.createLinearGradient(0, jy, 0, jy + jh);
        g.addColorStop(0, rgb(hex('#FFE3A3'), 0.5 * aceso)); g.addColorStop(1, rgb(hex('#E09A3C'), 0.4 * aceso));
        ctx.fillStyle = g; ctx.fillRect(x + a, jy, b - a, jh);
      }
    }
    // o vigia, de binóculos apontados para noroeste
    const vigia = suave(0.6, 0.68, p);
    if (vigia > 0) {
      ctx.fillStyle = rgb(hex('#2A1C14'), vigia);
      const vx = x + 2, vy = jy + jh;
      ctx.beginPath();
      ctx.moveTo(vx - 13, vy); ctx.quadraticCurveTo(vx - 12, vy - 17, vx, vy - 18); ctx.quadraticCurveTo(vx + 12, vy - 17, vx + 13, vy); ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(vx, vy - 25, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(vx - 13, vy - 29, 8, 5);
      ctx.fillRect(vx - 7, vy - 22, 5, 8);
    }
    // caixilhos
    ctx.fillStyle = rgb(corParede(p));
    ctx.fillStyle = metal;
    for (const [a, b] of panos) {
      ctx.fillRect(x + a - 1, jy + jh / 2 - 0.8, b - a + 2, 1.6);
    }
    ctx.strokeStyle = metal; ctx.lineWidth = 2.2;
    for (const [a, b] of panos) ctx.strokeRect(x + a, jy, b - a, jh);
    // luz derramada pelo vidro à noite
    if (aceso > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, jy + jh / 2, 10, x, jy + jh / 2, 140);
      g.addColorStop(0, rgb(hex('#F6B650'), 0.28 * aceso)); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 160, jy - 130, 320, 300);
      ctx.restore();
    }

    // telhado de quatro águas e para-raios
    ctx.fillStyle = rgb(corTelhado(p));
    ctx.beginPath();
    ctx.moveTo(x - cabW / 2 - 12, cabY + 2); ctx.lineTo(x - 18, cabY - 32); ctx.lineTo(x + 18, cabY - 32); ctx.lineTo(x + cabW / 2 + 12, cabY + 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = metal; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, cabY - 32); ctx.lineTo(x, cabY - 88); ctx.moveTo(x - 9, cabY - 72); ctx.lineTo(x + 9, cabY - 72); ctx.stroke();
    // farolim vermelho no topo, a piscar à noite
    const pisca = aceso * (0.5 + 0.5 * Math.sin(t * 0.004));
    if (pisca > 0.01) {
      ctx.fillStyle = rgb(hex('#FF5A3C'), pisca);
      ctx.beginPath(); ctx.arc(x, cabY - 90, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function desenharFogo(intensidade, t) {
    if (intensidade <= 0) return;
    const yR = cumeadas[1](FOGO.x);
    const largura = 20 + intensidade * 190;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // clarão no céu
    const g = ctx.createRadialGradient(FOGO.x, yR, 5, FOGO.x, yR, 380 * (0.5 + intensidade));
    g.addColorStop(0, rgb(hex('#FF8A3A'), 0.55 * intensidade));
    g.addColorStop(0.35, rgb(hex('#D9481C'), 0.22 * intensidade));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(FOGO.x - 700, yR - 600, 1400, 900);
    // línguas de fogo
    const n = 46;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      const xx = FOGO.x + u * largura;
      const y0 = cumeadas[1](xx) + 3;
      const onda = reduzir ? 0.7 : 0.55 + 0.45 * Math.sin(t * 0.017 + i * 1.7) * Math.sin(t * 0.009 + i * 0.6);
      const h = (6 + 18 * onda) * intensidade * (1 - (2 * u) ** 4);
      const w = 3 + 3 * intensidade;
      const gg = ctx.createLinearGradient(0, y0, 0, y0 - h);
      gg.addColorStop(0, 'rgba(255,90,30,0.95)'); gg.addColorStop(0.55, 'rgba(255,170,60,0.8)'); gg.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.moveTo(xx - w, y0); ctx.quadraticCurveTo(xx - w * 0.4, y0 - h * 0.6, xx + Math.sin(t * 0.02 + i) * 2, y0 - h); ctx.quadraticCurveTo(xx + w * 0.4, y0 - h * 0.6, xx + w, y0); ctx.fill();
    }
    ctx.restore();
  }

  function desenharParticulas(noite) {
    for (const q of particulas) {
      const vida = 1 - q.v;
      if (q.tipo === 'brasa') {
        ctx.fillStyle = `rgba(255,${150 + 80 * vida | 0},60,${vida * 0.9})`;
        ctx.fillRect(q.x, q.y, 1.6, 1.6);
      } else {
        const quente = clamp(1 - q.v * 3.2, 0, 1);
        const base = mistura(hex('#7C7880'), hex('#3B3845'), noite);
        const c = mistura(base, hex('#E07A3C'), quente * 0.7 * noite + quente * 0.2);
        ctx.fillStyle = rgb(c, 0.22 * vida * Math.min(1, q.v * 12));
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function nuvem(x, y, s) {
    ctx.beginPath();
    for (const [dx, dy, r] of [[0, 0, 34], [40, -14, 42], [86, 0, 32], [44, 10, 36], [-30, 8, 24]]) {
      ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  function desenhar(p, t, dt) {
    const cam = camara(p);
    const noite = suave(0.55, 0.72, p);
    const fogo = suave(0.63, 0.78, p);
    atualizarFogo(fogo, dt, t);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // céu, preso ao ecrã para não perder o gradiente com o zoom
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(ceuTopo(p))); g.addColorStop(0.75, rgb(ceuBase(p)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * (W / 2 - cam.fx * cam.s), dpr * (H / 2 - cam.fy * cam.s));

    // estrelas
    if (noite > 0) {
      for (const e of estrelas) {
        const a = noite * (reduzir ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.002 + e.f * 3));
        ctx.fillStyle = `rgba(236,236,220,${a})`;
        ctx.fillRect(e.x, e.y, e.r, e.r);
      }
    }
    // sol a atravessar o céu, põe-se atrás da serra
    const s = clamp(p / 0.56, 0, 1);
    const sx = 170 + s * 1250, sy = 560 - Math.sin(s * Math.PI) * 420 + s * s * 40;
    if (s < 1) {
      const corSol = rampa([[0, '#FFF3C8'], [0.6, '#FFF1C4'], [0.85, '#FFC46B'], [1, '#FF8A4A']])(s);
      const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 190);
      halo.addColorStop(0, rgb(corSol, 0.55)); halo.addColorStop(1, rgb(corSol, 0));
      ctx.fillStyle = halo; ctx.fillRect(sx - 200, sy - 200, 400, 400);
      ctx.fillStyle = rgb(corSol);
      ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.fill();
    }
    // lua em quarto crescente a nascer a leste... do lado oposto ao fogo
    const l = suave(0.6, 1, p);
    if (l > 0) {
      const lx = 1380 - l * 120, ly = 470 - l * 290;
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx - 40, ly - 40, 80, 80);
      ctx.arc(lx + 9, ly - 5, 20, 0, Math.PI * 2);
      ctx.clip('evenodd');
      ctx.fillStyle = `rgba(240,236,214,${l})`;
      ctx.beginPath(); ctx.arc(lx, ly, 22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // nuvens
    ctx.fillStyle = rgb(corNuvem(p), lerp(0.75, 0.35, noite));
    for (const n of nuvens) {
      const x = ((n.x + t * n.v * (reduzir ? 0 : 1)) % (MW + 400)) - 200;
      nuvem(x, n.y, n.s);
    }

    // serra, de trás para a frente
    for (let i = 0; i < caminhos.length; i++) {
      ctx.fillStyle = rgb(camadas[i].cor(p));
      ctx.fill(caminhos[i]);
      if (i === 1) desenharFogo(fogo, t);
      if (i === 2) desenharParticulas(noite);
      if (i === 3) desenharTorre(p, t);
    }

    // o fogo tinge a serra mais próxima
    if (fogo > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const yR = cumeadas[1](FOGO.x);
      const g2 = ctx.createRadialGradient(FOGO.x, yR, 20, FOGO.x, yR, 700);
      g2.addColorStop(0, rgb(hex('#C4461C'), 0.35 * fogo)); g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.fillRect(FOGO.x - 800, yR - 700, 1600, 1400);
      ctx.restore();
    }

    // entrada na cabine: a luz do candeeiro toma o ecrã
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const entrada = suave(0.965, 0.998, p);
    if (entrada > 0) {
      ctx.fillStyle = `rgba(46,33,25,${entrada})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- textos ----------
  function atualizarTextos(p) {
    const horas = [[0, 7], [0.3, 12.5], [0.55, 20.75], [0.72, 22.75], [1, 23.9]];
    let h = 7;
    for (let i = 1; i < horas.length; i++) if (p <= horas[i][0]) { h = lerp(horas[i - 1][1], horas[i][1], (p - horas[i - 1][0]) / (horas[i][0] - horas[i - 1][0])); break; }
    if (p > 1 - 1e-9) h = 23.9;
    const minutos = Math.round(h * 60 / 5) * 5;
    const hh = String(Math.floor(minutos / 60) % 24).padStart(2, '0'), mm = String(minutos % 60).padStart(2, '0');
    const hora = `${hh}:${mm}`;
    if (relogio.textContent !== hora) relogio.textContent = hora;
    const hr = `${Math.round(lerp(54, 18, suave(0.05, 0.5, p)) + 6 * suave(0.75, 1, p))}%`;
    if (humidade.textContent !== hr) humidade.textContent = hr;

    titulo.style.opacity = String(1 - suave(0.03, 0.11, p));
    hud.style.opacity = String(1 - suave(0.9, 0.96, p));
    titulo.style.visibility = p > 0.12 ? 'hidden' : 'visible';
    for (const li of entradas) {
      const de = +li.dataset.de, ate = +li.dataset.ate;
      const a = suave(de, de + 0.035, p) * (1 - suave(ate - 0.035, ate, p));
      li.style.opacity = String(a);
      li.style.transform = `translateY(${(1 - a) * 8}px)`;
      li.style.visibility = a > 0.01 ? 'visible' : 'hidden';
    }
  }

  // ---------- ciclo ----------
  let alvo = 0, atual = 0, ultimo = performance.now(), visivel = true;
  function progresso() {
    const r = historia.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight), 0, 1);
  }
  function quadro(t) {
    const dt = clamp((t - ultimo) / 16.67, 0, 4); ultimo = t;
    alvo = progresso();
    document.body.classList.toggle('na-cabine', alvo > 0.96);
    atual = reduzir ? alvo : lerp(atual, alvo, 1 - Math.pow(0.86, dt));
    if (Math.abs(atual - alvo) < 0.0004) atual = alvo;
    if (visivel) { desenhar(atual, t, dt); atualizarTextos(atual); }
    requestAnimationFrame(quadro);
  }
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(historia);
  addEventListener('resize', redimensionar);
  redimensionar();
  atual = alvo = progresso();
  requestAnimationFrame(quadro);
})();
