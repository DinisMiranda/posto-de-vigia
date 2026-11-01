/* Cena de abertura: um dia inteiro no posto de vigia, guiado pelo scroll.
   Tudo é desenhado em coordenadas de "mundo" (1600 x 1000) e a câmara
   faz o enquadramento e o zoom final para dentro da janela da cabine. */
export function iniciarCena({ canvas, historia, relogio, humidade, titulo, hud, entradas, aoEntrar }) {
  const ctx = canvas.getContext('2d');
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

  // árvores portuguesas, em silhueta. Todos os polígonos no sentido dos ponteiros do relógio
  // (regra nonzero), para as copas que se sobrepõem não abrirem buracos.
  function tronco(p, x, y, base, topo, alto, inclina) {
    p.moveTo(x + inclina - topo, y - alto); p.lineTo(x + inclina + topo, y - alto);
    p.lineTo(x + base, y); p.lineTo(x - base, y); p.closePath();
  }
  const tufo = (p, cx, cy, rx, ry) => { p.moveTo(cx + rx, cy); p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
  // pinheiro-bravo: tronco alto e um pouco torto; copa irregular em andares assimétricos,
  // mais larga a meio e a afinar no topo, com ramos à vista entre os tufos
  function pinheiroBravo(p, x, y, h, r) {
    const inc = (r() - 0.5) * h * 0.08;
    tronco(p, x, y, h * 0.028, h * 0.012, h * 0.94, inc);
    const andares = 5 + (r() * 2 | 0);
    for (let k = 0; k < andares; k++) {
      const q = k / (andares - 1);                       // 0 = andar de baixo, 1 = topo
      const cy = y - h * (0.5 + q * 0.46);
      const larg = h * (0.15 + 0.1 * Math.sin(q * Math.PI * 0.85)) * (1 - q * 0.45);
      const lado = (k % 2 ? 1 : -1) * (0.3 + r() * 0.5);
      const cx = x + inc * (0.5 + q * 0.5) + lado * larg * 0.55;
      // ramo até ao tufo
      tronco(p, x + inc * (0.5 + q * 0.5), cy + h * 0.03, h * 0.006, h * 0.004, h * 0.035, lado * larg * 0.5);
      tufo(p, cx, cy, larg * (0.8 + r() * 0.3), h * (0.058 + r() * 0.03));
      tufo(p, cx + (r() - 0.5) * larg * 0.9, cy - h * 0.04, larg * (0.5 + r() * 0.3), h * (0.05 + r() * 0.025));
      tufo(p, cx - lado * larg * 0.4, cy + h * 0.015, larg * (0.45 + r() * 0.2), h * (0.04 + r() * 0.02));
    }
  }
  // eucalipto: muito alto e direito, copa esparsa e pendente
  function eucalipto(p, x, y, h, r) {
    tronco(p, x, y, h * 0.018, h * 0.01, h * 0.86, (r() - 0.5) * h * 0.04);
    for (let i = 0; i < 6; i++) {
      const cx = x + (r() - 0.45) * h * 0.26, cy = y - h * (0.55 + r() * 0.42);
      tufo(p, cx, cy, h * (0.035 + r() * 0.035), h * (0.07 + r() * 0.07));
    }
  }
  // sobreiro: tronco curto e grosso que abre em braços, copa larga e baixa
  function sobreiro(p, x, y, h, r) {
    tronco(p, x, y, h * 0.08, h * 0.06, h * 0.34, 0);
    const lado = r() < 0.5 ? -1 : 1;
    tronco(p, x - lado * h * 0.02, y - h * 0.3, h * 0.04, h * 0.025, h * 0.26, -lado * h * 0.2);
    tronco(p, x + lado * h * 0.02, y - h * 0.3, h * 0.035, h * 0.02, h * 0.22, lado * h * 0.24);
    const n = 9 + (r() * 4 | 0);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI;
      const cx = x - Math.cos(ang) * h * (0.32 + r() * 0.2), cy = y - h * (0.58 + Math.sin(ang) * 0.2 + r() * 0.06);
      tufo(p, cx, cy, h * (0.17 + r() * 0.1), h * (0.11 + r() * 0.05));
    }
    tufo(p, x, y - h * 0.7, h * 0.42, h * 0.14);
  }
  // carvalho: copa redonda e densa
  function carvalho(p, x, y, h, r) {
    tronco(p, x, y, h * 0.05, h * 0.03, h * 0.5, (r() - 0.5) * h * 0.05);
    for (let i = 0; i < 6; i++) {
      const cx = x + (r() - 0.5) * h * 0.46, cy = y - h * (0.58 + r() * 0.28), rr = h * (0.14 + r() * 0.09);
      tufo(p, cx, cy, rr, rr * 0.92);
    }
  }
  const ESPECIES = [pinheiroBravo, eucalipto, sobreiro, carvalho];

  // cada camada: terreno, linha de cumeada (para a luz rasante) e árvores agrupadas
  // em faixas de 180 unidades, que podem balançar com o vento cada uma à sua maneira
  function construirCamada(i) {
    const f = cumeadas[i];
    const r = aleatorio(100 + i);
    const terreno = new Path2D();
    const linha = new Path2D();
    terreno.moveTo(-200, f(-200)); linha.moveTo(-200, f(-200));
    for (let x = -200; x <= MW + 200; x += 6) { terreno.lineTo(x, f(x)); linha.lineTo(x, f(x)); }
    terreno.lineTo(MW + 200, MH + 400); terreno.lineTo(-200, MH + 400); terreno.closePath();

    // pesos de cada espécie [pinheiro-bravo, eucalipto, sobreiro, carvalho] e tamanhos por camada
    const cfg = [
      null,
      { passo: 7, h: [10, 17], mix: [0.25, 0.7, 0, 0.05] },    // eucaliptal distante a norte
      { passo: 10, h: [20, 34], mix: [0.45, 0.25, 0.15, 0.15] },
      { passo: 14, h: [32, 58], mix: [0.35, 0.15, 0.3, 0.2] },
      { passo: 30, h: [100, 190], mix: [0.4, 0.1, 0.35, 0.15] },
    ][i];
    const grupos = [];
    if (cfg) {
      const porFaixa = new Map();
      for (let x = -120; x < MW + 120; x += cfg.passo * (0.5 + r() * 1.1)) {
        if (i === 3 && Math.abs(x - TORRE.x) < 105) continue;       // clareira da torre
        if (i === 4 && x > 560 && x < 1320 && r() < 0.8) continue;   // abertura em primeiro plano
        let h = lerp(cfg.h[0], cfg.h[1], r() ** 1.4);
        let q = r(), e = 0;
        while (e < 3 && q > cfg.mix[e]) { q -= cfg.mix[e]; e++; }
        if (e === 1) h *= 1.3;           // os eucaliptos são os mais altos
        if (e === 2) h *= 0.72;          // os sobreiros, baixos e largos
        const y = f(x) + h * 0.04 + 2;
        const faixa = Math.floor((x + 200) / 180);
        if (!porFaixa.has(faixa)) porFaixa.set(faixa, { p: new Path2D(), x0: faixa * 180 - 110, base: 0, n: 0, tom: (r() - 0.5) * 0.08 });
        const g = porFaixa.get(faixa);
        ESPECIES[e](g.p, x, y, h, r);
        g.base += y; g.n++;
      }
      for (const g of porFaixa.values()) { g.base /= g.n; grupos.push(g); }
    }
    return { terreno, linha, grupos };
  }
  const camadasDesenho = cumeadas.map((_, i) => construirCamada(i));
  const BASES = [470, 560, 655, 700, 930];

  const rE = aleatorio(7);
  const estrelas = Array.from({ length: 220 }, () => ({ x: rE() * MW, y: rE() * 560, r: 0.4 + rE() * 1.3, f: rE() * 6 }));
  const rP = aleatorio(19);
  const passaros = Array.from({ length: 7 }, (_, k) => ({ x0: rP() * MW, y: 170 + rP() * 160 + (k % 3) * 18, v: 0.025 + rP() * 0.02, f: rP() * 6, s: 0.8 + rP() * 0.5 }));
  const nuvensVisiveis = [];
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

  // ---------- fogo: ignição, frente que avança com o vento e rasto ardido ----------
  // O fogo nasce numa fogueira mal apagada no parque de merendas e espalha-se sobretudo
  // para leste, para onde sopra o vento ("vento a rodar para leste", diz o diário).
  const frente = f => ({ esq: FOGO.x - (6 + f * 70), dir: FOGO.x + (6 + f * 230) });
  const rB = aleatorio(91);
  const brasasChao = Array.from({ length: 160 }, () => ({ u: rB(), dy: rB() * 5, f: rB() * 6 }));
  const particulas = [];
  function atualizarFogo(intensidade, ignicao, dt, t) {
    if (!reduzir) {
      // antes de pegar: só um fio de fumo a sair da fogueira
      if (ignicao > 0.05 && intensidade < 0.05 && Math.random() < 0.3 * dt) {
        particulas.push({
          x: FOGO.x + (Math.random() - 0.5) * 4, y: cumeadas[1](FOGO.x) - 3,
          vx: 0.04, vy: -(0.3 + Math.random() * 0.2), r: 1.4, v: 0, tipo: 'fumo', fino: true,
        });
      }
      if (intensidade > 0.02) {
        const { esq, dir } = frente(intensidade);
        const n = intensidade * 3 * dt;
        for (let i = 0; i < n || Math.random() < n - i; i++) {
          // a maior parte do fumo nasce nas frentes, onde arde com mais força
          const naFrente = Math.random() < 0.7;
          const x = naFrente ? (Math.random() < 0.75 ? dir : esq) + (Math.random() - 0.5) * 30 : lerp(esq, dir, Math.random());
          particulas.push({
            x, y: cumeadas[1](x) - 4,
            vx: 0.08 + Math.random() * 0.2, vy: -(0.7 + Math.random() * 0.7),
            r: 4 + Math.random() * 6, v: 0, tipo: Math.random() < 0.2 ? 'brasa' : 'fumo',
          });
        }
      }
    }
    for (let i = particulas.length - 1; i >= 0; i--) {
      const q = particulas[i];
      q.v += dt / (q.tipo === 'brasa' ? 120 : q.fino ? 260 : 480);
      // o vento é mais forte lá em cima: a coluna de fumo dobra para leste
      const vento = q.v * q.v * 2.2;
      q.x += (q.vx + vento) * dt;
      q.y += q.vy * dt * (q.tipo === 'brasa' ? 1.5 : 1) * (1 - q.v * 0.35);
      q.r += (q.tipo === 'brasa' ? 0 : q.fino ? 0.04 : 0.16) * dt;
      if (q.tipo === 'brasa') q.x += Math.sin(t * 0.01 + i) * 0.35;
      if (q.v >= 1) particulas.splice(i, 1);
    }
    if (particulas.length > 700) particulas.splice(0, particulas.length - 700);
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
    // rebites nas juntas
    ctx.fillStyle = rgb(mistura(corMetal(p), hex('#F3D9B0'), 0.35 * (1 - suave(0.55, 0.7, p))));
    for (let i = 0; i <= niveis; i++) {
      const yy = lerp(baixo, BASE_TORRE, i / niveis), m = meia(yy);
      for (const xx of [x - m, x + m]) { ctx.beginPath(); ctx.arc(xx, yy, 1.7, 0, Math.PI * 2); ctx.fill(); }
    }
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
    // o vigia está sempre no posto; de dia vê-se em contraluz, à noite recortado pelo candeeiro
    const vigia = 0.75 + 0.25 * suave(0.6, 0.68, p);
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
    // reflexo do céu no vidro, que desaparece quando o candeeiro acende
    const brilhoVidro = 0.32 * (1 - aceso);
    if (brilhoVidro > 0.01) {
      for (const [a, b] of panos) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x + a, jy, b - a, jh); ctx.clip();
        const gv = ctx.createLinearGradient(x + a, jy, x + b, jy + jh);
        gv.addColorStop(0, `rgba(255,255,255,${brilhoVidro * 0.2})`);
        gv.addColorStop(0.42, `rgba(255,255,255,${brilhoVidro * 0.2})`);
        gv.addColorStop(0.48, `rgba(255,255,255,${brilhoVidro})`);
        gv.addColorStop(0.58, `rgba(255,255,255,${brilhoVidro * 0.15})`);
        gv.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gv; ctx.fillRect(x + a, jy, b - a, jh);
        ctx.restore();
      }
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
    // manga de vento: aponta para leste e enche-se mais quando o vento aperta à tarde
    {
      const px = x + cabW / 2 + 10, topoM = cabY - 50;
      ctx.strokeStyle = metal; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, cabY + 2); ctx.lineTo(px, topoM); ctx.stroke();
      const vento = 0.55 + 0.45 * suave(0.3, 0.6, p);
      const ang = (1 - vento) * 0.9 + (reduzir ? 0 : Math.sin(t * 0.007) * 0.08 * vento);
      const comp = 34;
      const corR = rgb(mistura(hex('#E0482A'), hex('#141B3D'), suave(0.6, 0.72, p)));
      const corB = rgb(mistura(hex('#F4EEE2'), hex('#1D2640'), suave(0.6, 0.72, p)));
      for (let k = 0; k < 4; k++) {
        const q0 = k / 4, q1 = (k + 1) / 4;
        const r0 = 6 * (1 - q0 * 0.55), r1 = 6 * (1 - q1 * 0.55);
        const onda = reduzir ? 0 : Math.sin(t * 0.012 - k) * 1.2 * vento;
        const ponto = (q, r, sinal) => [px + Math.cos(ang) * comp * q - Math.sin(ang) * r * sinal, topoM + 6 + Math.sin(ang) * comp * q + Math.cos(ang) * r * sinal + onda * q];
        const [a1, a2] = [ponto(q0, r0, -1), ponto(q1, r1, -1)], [b2, b1] = [ponto(q1, r1, 1), ponto(q0, r0, 1)];
        ctx.fillStyle = k % 2 ? corB : corR;
        ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...a2); ctx.lineTo(...b2); ctx.lineTo(...b1); ctx.closePath(); ctx.fill();
      }
    }
    // farolim vermelho no topo, a piscar à noite
    const pisca = aceso * (0.5 + 0.5 * Math.sin(t * 0.004));
    if (pisca > 0.01) {
      ctx.fillStyle = rgb(hex('#FF5A3C'), pisca);
      ctx.beginPath(); ctx.arc(x, cabY - 90, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function desenharFogo(intensidade, ignicao, t) {
    const yR = cumeadas[1](FOGO.x);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // a fogueira: uma brasa a piscar no parque de merendas, antes de o fogo pegar
    if (ignicao > 0 && intensidade < 0.6) {
      const a = ignicao * (1 - suave(0.2, 0.6, intensidade)) * (reduzir ? 1 : 0.7 + 0.3 * Math.sin(t * 0.02));
      const g0 = ctx.createRadialGradient(FOGO.x, yR - 2, 0, FOGO.x, yR - 2, 26);
      g0.addColorStop(0, rgb(hex('#FFD07A'), 0.9 * a));
      g0.addColorStop(0.3, rgb(hex('#FF7A2A'), 0.5 * a));
      g0.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g0;
      ctx.fillRect(FOGO.x - 30, yR - 30, 60, 60);
    }
    if (intensidade <= 0) { ctx.restore(); return; }
    const { esq, dir } = frente(intensidade);
    const centro = (esq + dir) / 2;

    // rasto ardido: atrás da frente a encosta fica negra, com brasas a piscar
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.moveTo(esq, cumeadas[1](esq));
    for (let x = esq; x <= dir; x += 6) ctx.lineTo(x, cumeadas[1](x) - 1);
    for (let x = dir; x >= esq; x -= 6) ctx.lineTo(x, cumeadas[1](x) + 11 + 4 * Math.sin(x * 0.07));
    ctx.closePath();
    ctx.fillStyle = `rgba(20,12,10,${0.85 * Math.min(1, intensidade * 4)})`;
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of brasasChao) {
      const x = lerp(esq, dir, b.u);
      const brilho = reduzir ? 0.6 : 0.4 + 0.6 * Math.max(0, Math.sin(t * 0.006 + b.f * 7));
      ctx.fillStyle = `rgba(255,${110 + 60 * brilho | 0},40,${0.55 * brilho * intensidade})`;
      ctx.fillRect(x, cumeadas[1](x) + 1 + b.dy, 1.6, 1.6);
    }

    // clarão no céu, a acompanhar a frente
    const g = ctx.createRadialGradient(centro, yR, 5, centro, yR, 420 * (0.5 + intensidade));
    g.addColorStop(0, rgb(hex('#FF8A3A'), 0.55 * intensidade));
    g.addColorStop(0.35, rgb(hex('#D9481C'), 0.22 * intensidade));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(centro - 800, yR - 650, 1600, 1000);

    // línguas de fogo em duas camadas: altas nas frentes, baixas no interior que já ardeu,
    // todas inclinadas pelo vento
    const n = 72;
    for (let camada = 0; camada < 2; camada++) {
      for (let i = 0; i < n; i++) {
        const xx = lerp(esq, dir, i / (n - 1));
        const y0 = cumeadas[1](xx) + 3;
        const forca = Math.min(1, Math.exp(-(dir - xx) / 24) + 0.6 * Math.exp(-(xx - esq) / 18) + 0.16);
        const onda = reduzir ? 0.7 : 0.55 + 0.45 * Math.sin(t * 0.017 + i * 1.7 + camada) * Math.sin(t * 0.011 + i * 0.6);
        const h = (camada ? 0.55 : 1) * (10 + 34 * onda) * forca * (0.4 + 0.6 * intensidade);
        if (h < 1.5) continue;
        const w = (camada ? 2 : 3.4) + 2 * intensidade;
        const inclina = h * 0.28 + Math.sin(t * 0.02 + i) * 2;
        const gg = ctx.createLinearGradient(0, y0, 0, y0 - h);
        if (camada === 0) {
          gg.addColorStop(0, 'rgba(255,80,25,0.95)'); gg.addColorStop(0.55, 'rgba(255,150,50,0.8)'); gg.addColorStop(1, 'rgba(255,210,120,0)');
        } else {
          gg.addColorStop(0, 'rgba(255,230,140,0.9)'); gg.addColorStop(1, 'rgba(255,250,210,0)');
        }
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.moveTo(xx - w, y0);
        ctx.quadraticCurveTo(xx - w * 0.4 + inclina * 0.3, y0 - h * 0.6, xx + inclina, y0 - h);
        ctx.quadraticCurveTo(xx + w * 0.4 + inclina * 0.4, y0 - h * 0.6, xx + w, y0);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // as nuvens perto do fogo ficam tingidas pelo clarão
  function tingirNuvens(intensidade) {
    if (intensidade <= 0) return;
    const { esq, dir } = frente(intensidade);
    const centro = (esq + dir) / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const n of nuvensVisiveis) {
      const d = Math.hypot(n.x - centro, n.y - cumeadas[1](centro));
      const a = 0.45 * intensidade * Math.exp(-d / 650);
      if (a < 0.01) continue;
      ctx.fillStyle = `rgba(230,100,40,${a})`;
      nuvem(n.x, n.y, n.s);
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
        ctx.fillStyle = rgb(c, (q.fino ? 0.35 : 0.22) * vida * Math.min(1, q.v * 12));
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

  // ---------- ambiente: luz, névoa, vento, pássaros, ar quente ----------
  // névoa nos vales: mais densa de manhã, quase nenhuma a meio do dia
  function forcaNevoa(p) { return lerp(0.5, 0.12, suave(0.02, 0.22, p)) + 0.12 * suave(0.42, 0.55, p) - 0.14 * suave(0.6, 0.75, p); }
  function nevoaVale(i, p, cor) {
    const y = BASES[i + 1] ?? MH;
    const a = forcaNevoa(p) * (i === 0 ? 1 : i === 1 ? 0.85 : 0.6);
    if (a <= 0.01) return;
    const g = ctx.createLinearGradient(0, y - 90, 0, y + 30);
    g.addColorStop(0, rgb(cor, 0)); g.addColorStop(0.75, rgb(cor, a)); g.addColorStop(1, rgb(cor, a * 0.6));
    ctx.fillStyle = g; ctx.fillRect(-200, y - 90, MW + 400, 160);
  }
  // luz rasante nas cumeadas: fria ao amanhecer, dourada ao fim da tarde
  const corRasante = rampa([[0, '#DDEBFF'], [0.2, '#FFF6E0'], [0.42, '#FFE2A0'], [0.52, '#FFB067'], [0.6, '#C9707A'], [0.7, '#000000']]);
  function forcaRasante(p) { return 0.28 * (1 - suave(0.05, 0.2, p)) + 0.1 + 0.32 * suave(0.36, 0.48, p) * (1 - suave(0.54, 0.62, p)) - 0.1 * suave(0.58, 0.66, p); }
  // raios de sol: fortes ao amanhecer e ao fim da tarde, discretos a meio do dia
  function raios(p, t, sx, sy) {
    const acima = suave(500, 400, sy);                      // o sol tem de estar acima das cumeadas
    const a = acima * (0.012 + 0.05 * (1 - suave(0.1, 0.2, p)) + 0.07 * suave(0.38, 0.46, p) * (1 - suave(0.51, 0.56, p)));
    if (a <= 0.004 || p > 0.56) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const c = corRasante(p);
    const rot = reduzir ? 0 : t * 0.000015;
    for (let k = 0; k < 14; k++) {
      const ang = Math.PI * (0.08 + k * 0.06) + Math.sin(rot * 3 + k * 2.1) * 0.03;
      const larg = 0.01 + ((k * 7) % 5) * 0.006;
      const comp = 900 + ((k * 13) % 7) * 90;
      const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(ang) * comp, sy + Math.sin(ang) * comp);
      const forca = a * (0.5 + 0.5 * Math.sin(k * 1.9 + rot * 20));
      g.addColorStop(0, rgb(c, forca)); g.addColorStop(0.5, rgb(c, forca * 0.5)); g.addColorStop(1, rgb(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(ang - larg) * comp, sy + Math.sin(ang - larg) * comp);
      ctx.lineTo(sx + Math.cos(ang + larg) * comp, sy + Math.sin(ang + larg) * comp);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function desenharPassaros(p, t) {
    const a = 1 - suave(0.45, 0.56, p);
    if (a <= 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(32,36,44,${0.65 * a})`; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of passaros) {
      const x = ((b.x0 + t * b.v * (reduzir ? 0 : 1)) % (MW + 200)) - 100;
      const y = b.y + Math.sin(t * 0.0011 + b.f) * 10;
      const asa = reduzir ? 0.5 : Math.sin(t * 0.013 + b.f * 3);
      const w = 7 * b.s;
      ctx.lineWidth = 1.5 * b.s;
      ctx.beginPath();
      ctx.moveTo(x - w, y - 3 * asa * b.s); ctx.quadraticCurveTo(x - w * 0.4, y - 4 * b.s, x, y);
      ctx.quadraticCurveTo(x + w * 0.4, y - 4 * b.s, x + w, y - 3 * asa * b.s);
      ctx.stroke();
    }
    ctx.restore();
  }
  // ar seco e quente: depois do meio-dia a humidade cai e o horizonte tremula
  const calorDoDia = p => suave(0.2, 0.4, p) * (1 - suave(0.5, 0.6, p));
  // coluna de fumo distante, quando o perigo já é elevado (antes do incêndio da noite)
  function fumoDistante(p, t) {
    const a = suave(0.36, 0.46, p) * (1 - suave(0.6, 0.68, p));
    if (a <= 0.01) return;
    const x0 = 1480, y0 = cumeadas[0](x0) + 6;
    const cinza = mistura(hex('#9C9AA0'), ceuBase(p), 0.35);
    for (let k = 0; k < 18; k++) {
      const q = k / 17;
      const px = x0 + q * q * 190 + (reduzir ? 0 : Math.sin(t * 0.0008 + k * 0.9) * 5 * q);
      const py = y0 - q * 280;
      ctx.fillStyle = rgb(cinza, a * 0.26 * (1 - q * 0.75));
      ctx.beginPath(); ctx.arc(px, py, 5 + q * 36, 0, Math.PI * 2); ctx.fill();
    }
  }
  // desenha uma camada (terreno + árvores), com balanço do vento e, se houver calor, a tremular
  function preencherCamada(i, p, t, cor) {
    const c = camadasDesenho[i];
    const vento = 0.6 + 0.9 * suave(0.3, 0.6, p);
    const amp = [0, 0, 0.002, 0.006, 0.013][i] * vento;
    const calor = i <= 1 && !reduzir ? calorDoDia(p) : 0;
    const desenhar1 = () => {
      ctx.fillStyle = rgb(cor);
      ctx.fill(c.terreno);
      for (const g of c.grupos) {
        ctx.fillStyle = rgb(mistura(cor, g.tom > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(g.tom)));
        const k = reduzir ? 0 : amp * Math.sin(t * 0.0011 + g.x0 * 0.013) + amp * 0.5 * Math.sin(t * 0.0029 + g.x0 * 0.031);
        if (k) { ctx.save(); ctx.transform(1, 0, k, 1, -k * g.base, 0); ctx.fill(g.p); ctx.restore(); } else ctx.fill(g.p);
      }
    };
    if (calor > 0.05) {
      // em tiras verticais com pequenos desvios: o ar quente faz tremer o horizonte
      const tiras = 14, larg = (MW + 400) / tiras;
      for (let k = 0; k < tiras; k++) {
        ctx.save();
        ctx.beginPath(); ctx.rect(-200 + k * larg, 0, larg + 1, MH + 400); ctx.clip();
        ctx.translate(0, Math.sin(t * 0.006 + k * 1.3) * 1.3 * calor);
        desenhar1();
        ctx.restore();
      }
    } else desenhar1();
  }

  function desenhar(p, t, dt) {
    const cam = camara(p);
    const noite = suave(0.55, 0.72, p);
    const ignicao = suave(0.57, 0.63, p);
    const fogo = suave(0.63, 0.78, p);
    atualizarFogo(fogo, ignicao, dt, t);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // céu, preso ao ecrã para não perder o gradiente com o zoom
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(ceuTopo(p))); g.addColorStop(0.75, rgb(ceuBase(p)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * (W / 2 - cam.fx * cam.s), dpr * (H / 2 - cam.fy * cam.s));

    // parallax: a câmara sobe pela torre; o longe mexe-se menos do que o perto (a torre é a referência)
    const u = suave(0.02, 0.8, p);
    const dy = [-26, -16, -8, 0, 60].map(v => v * u);
    const dyCeu = -36 * u;

    ctx.save();
    ctx.translate(0, dyCeu);
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
      const corSol = rampa([[0, '#FFE9C2'], [0.15, '#FFF3C8'], [0.6, '#FFF1C4'], [0.85, '#FFC46B'], [1, '#FF8A4A']])(s);
      const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 260);
      halo.addColorStop(0, rgb(corSol, 0.6)); halo.addColorStop(0.3, rgb(corSol, 0.18)); halo.addColorStop(1, rgb(corSol, 0));
      ctx.fillStyle = halo; ctx.fillRect(sx - 270, sy - 270, 540, 540);
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
    nuvensVisiveis.length = 0;
    for (const n of nuvens) {
      const x = ((n.x + t * n.v * (reduzir ? 0 : 1)) % (MW + 400)) - 200;
      nuvem(x, n.y, n.s);
      nuvensVisiveis.push({ x, y: n.y, s: n.s });
    }
    tingirNuvens(fogo);
    desenharPassaros(p, t);
    ctx.restore();

    // serra, de trás para a frente, cada vez mais escura e nítida (perspetiva atmosférica)
    const horizonte = ceuBase(p);
    const NEVOA = [0.42, 0.3, 0.17, 0.06, 0];
    const rasante = corRasante(p), aRasante = Math.max(0, forcaRasante(p));
    for (let i = 0; i < camadasDesenho.length; i++) {
      ctx.save();
      ctx.translate(0, dy[i]);
      if (i === 0) fumoDistante(p, t);
      const cor = mistura(camadas[i].cor(p), horizonte, NEVOA[i] * (1 - 0.6 * noite));
      preencherCamada(i, p, t, cor);
      if (i < 4 && aRasante > 0.01) {
        ctx.strokeStyle = rgb(rasante, aRasante * (1 - i * 0.18));
        ctx.lineWidth = 1.6;
        ctx.stroke(camadasDesenho[i].linha);
      }
      if (i === 1) desenharFogo(fogo, ignicao, t);
      if (i === 3) desenharTorre(p, t);
      if (i < 3) nevoaVale(i, p, horizonte);
      ctx.restore();
      if (i === 1) {
        ctx.save(); ctx.translate(0, dyCeu * 0.4); raios(p, t, sx, sy); ctx.restore();
      }
      if (i === 2) { ctx.save(); ctx.translate(0, dy[1]); desenharParticulas(noite); ctx.restore(); }
    }

    // ar quente: uma camada âmbar ténue sobre o horizonte nas horas secas
    const calor = calorDoDia(p);
    if (calor > 0.01) {
      ctx.save();
      const gq = ctx.createLinearGradient(0, 380, 0, 820);
      gq.addColorStop(0, 'rgba(255,196,120,0)'); gq.addColorStop(0.5, `rgba(255,190,110,${0.14 * calor})`); gq.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = gq; ctx.fillRect(-200, 380, MW + 400, 440);
      ctx.restore();
    }

    // o fogo tinge a serra mais próxima
    if (fogo > 0) {
      ctx.save();
      ctx.translate(0, dy[1]);
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
  let alvo = 0, atual = 0, ultimo = performance.now(), visivel = true, pedido = 0, dentro = false;
  function progresso() {
    const r = historia.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight), 0, 1);
  }
  function quadro(t) {
    const dt = clamp((t - ultimo) / 16.67, 0, 4); ultimo = t;
    alvo = progresso();
    if ((alvo > 0.96) !== dentro) { dentro = alvo > 0.96; aoEntrar?.(dentro); }
    atual = reduzir ? alvo : lerp(atual, alvo, 1 - Math.pow(0.86, dt));
    if (Math.abs(atual - alvo) < 0.0004) atual = alvo;
    if (visivel) { desenhar(atual, t, dt); atualizarTextos(atual); }
    pedido = requestAnimationFrame(quadro);
  }
  const observador = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; });
  observador.observe(historia);
  addEventListener('resize', redimensionar);
  redimensionar();
  atual = alvo = progresso();
  pedido = requestAnimationFrame(quadro);

  return () => {
    cancelAnimationFrame(pedido);
    observador.disconnect();
    removeEventListener('resize', redimensionar);
  };
}
