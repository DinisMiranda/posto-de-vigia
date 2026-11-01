/* Cena de abertura: um dia inteiro no posto de vigia, guiado pelo scroll.
   Tudo é desenhado em coordenadas de "mundo" (1600 x 1000) e a câmara
   faz o enquadramento e o zoom final para dentro da janela da cabine.

   Quatro planos, do mais claro ao mais escuro: serra ao longe, cumeada com
   floresta (onde começa o incêndio), a colina da torre e o primeiro plano.
   A torre, a colina, as árvores do primeiro plano e as nuvens são desenhadas
   à mão com curvas de Bézier; só as copas lá ao longe são geradas. Tudo o que
   é atmosférico (fumo, névoa, luz) usa gradientes de bordas suaves. */
export function iniciarCena({ canvas, historia, relogio, humidade, titulo, hud, entradas, aoEntrar }) {
  const ctx = canvas.getContext('2d');
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MW = 1600, MH = 1000;
  const TORRE = { x: 1060, cabY: 300, cabH: 82, cabW: 128 };
  const JANELA = { x: 1020, y: 320 };      // alvo do zoom: o vidro da esquerda, aceso
  const FOGO = { x: 330 };
  const CHAO = 652;                        // chão da clareira onde assenta a torre

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
  // mancha suave: gradiente radial sem borda nenhuma, opcionalmente achatada
  function mancha(x, y, r, cor, a, achatar = 1) {
    if (a <= 0.003 || r <= 0) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, achatar);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgb(cor, a)); g.addColorStop(0.45, rgb(cor, a * 0.7)); g.addColorStop(1, rgb(cor, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- paleta do dia ----------
  const ceuTopo = rampa([[0, '#8DBAD4'], [0.3, '#6AA3CF'], [0.45, '#7896C0'], [0.53, '#565F96'], [0.62, '#2A2F63'], [0.72, '#141B3D'], [1, '#10163A']]);
  const ceuBase = rampa([[0, '#E6EEE6'], [0.3, '#D6E6EB'], [0.45, '#F2D7A2'], [0.53, '#F0A266'], [0.62, '#8E5A73'], [0.72, '#2A3360'], [1, '#222A52']]);
  const corPlano = [
    tempoDia('#B4C7CB', '#B49AA8', '#2A3560'),   // serra ao longe
    tempoDia('#7F9C8A', '#76687F', '#1C2748'),   // cumeada com floresta
    tempoDia('#4D6C50', '#4A4458', '#121A33'),   // colina da torre
    tempoDia('#203528', '#211D2B', '#090E1C'),   // primeiro plano
  ];
  const corTerra = tempoDia('#BBA37B', '#9C7F72', '#2A2735');
  const corBetao = tempoDia('#B9B4A8', '#948A92', '#262C45');
  const corMetal = tempoDia('#8A4632', '#5A3440', '#0C1224');
  const corMetalClaro = tempoDia('#B86A50', '#7A4A55', '#141B33');
  const corParede = tempoDia('#ECE6D6', '#C7A79B', '#1D2640');
  const corTelhado = tempoDia('#A53D2C', '#7A3439', '#0E1426');
  const corNuvemLuz = rampa([[0, '#FFFFFF'], [0.42, '#FFFDF6'], [0.5, '#FFE2BC'], [0.56, '#F2A98A'], [0.64, '#7E5F80'], [0.74, '#2C3561'], [1, '#2C3561']]);
  const corNuvemSombra = rampa([[0, '#C7D3DE'], [0.42, '#C9D2DC'], [0.5, '#C9A9A6'], [0.56, '#9C7488'], [0.64, '#4A4470'], [0.74, '#1E2650'], [1, '#1E2650']]);
  const corSolDe = rampa([[0, '#FFE6BD'], [0.15, '#FFF4D2'], [0.6, '#FFF2C8'], [0.85, '#FFC870'], [1, '#FF8A4A']]);

  // ---------- relevo ----------
  function linhaCumeada(base, amp, seed) {
    const r = aleatorio(seed);
    const f = [r() * 6, r() * 6, r() * 6, r() * 6];
    return x => base + amp * (0.5 * Math.sin(x * 0.0037 + f[0]) + 0.28 * Math.sin(x * 0.0093 + f[1]) + 0.15 * Math.sin(x * 0.023 + f[2]) + 0.07 * Math.sin(x * 0.061 + f[3]));
  }
  const serraLonge = linhaCumeada(470, 70, 3);
  const cumeada = linhaCumeada(560, 42, 11);
  const chaoFrente = linhaCumeada(938, 26, 41);

  // colina da torre, desenhada à mão: sobe da esquerda, aplana numa clareira e desce para leste
  const COLINA = (() => {
    const segs = [
      [[-200, 800], [80, 792], [420, 762], [720, 714]],
      [[720, 714], [842, 694], [918, 664], [972, CHAO + 2]],
      [[972, CHAO + 2], [1010, CHAO - 1], [1110, CHAO - 1], [1152, CHAO + 2]],
      [[1152, CHAO + 2], [1208, 660], [1272, 680], [1362, 702]],
      [[1362, 702], [1472, 730], [1620, 744], [1800, 754]],
    ];
    const pts = [];
    for (const [a, b, c, d] of segs) {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, u = 1 - t;
        pts.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
          u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
      }
    }
    return pts;
  })();
  function colinaY(x) {
    for (let i = 1; i < COLINA.length; i++) {
      if (x <= COLINA[i][0]) { const [x0, y0] = COLINA[i - 1], [x1, y1] = COLINA[i]; return lerp(y0, y1, (x - x0) / ((x1 - x0) || 1)); }
    }
    return COLINA[COLINA.length - 1][1];
  }

  // copas ao longe: uma só massa com o recorte irregular das copas, com clareiras
  function massaDeCopas(linha, seed, alturaMin, alturaMax, passoMin, passoMax, densidade) {
    const r = aleatorio(seed);
    const p = new Path2D();
    let x = -220, h = alturaMin;
    p.moveTo(x, linha(x));
    while (x < MW + 220) {
      // larguras muito diferentes, clareiras e, de vez em quando, um eucalipto a sobressair
      const w = lerp(passoMin, passoMax, r() ** 1.6) * (r() < 0.12 ? 2.2 : 1);
      const cheia = densidade(x) > r() * 0.9;
      let hn = cheia ? lerp(alturaMin, alturaMax, r() ** 0.8) : r() * alturaMin * 0.25;
      const xm = x + w / 2, xn = x + w;
      if (cheia && r() < 0.07) {
        const e = hn * 2.3, ew = Math.min(w, 5);
        p.quadraticCurveTo(x + ew * 0.2, linha(x) - e * 0.6, x + ew * 0.5, linha(x) - e);
        p.quadraticCurveTo(x + ew * 0.8, linha(x) - e * 0.6, x + ew, linha(x + ew) - hn * 0.6);
      }
      p.quadraticCurveTo(xm + (r() - 0.5) * w * 0.4, linha(xm) - Math.max(h, hn) * (1.15 + r() * 0.5), xn, linha(xn) - hn * (0.3 + r() * 0.3));
      x = xn; h = hn;
    }
    p.lineTo(MW + 220, MH + 400); p.lineTo(-220, MH + 400); p.closePath();
    return p;
  }
  // serra ao longe: perfil suave e um pelo de copas quase invisível
  const pSerraLonge = massaDeCopas(serraLonge, 3, 1, 3, 5, 9, () => 0.7);
  // cumeada com floresta: duas faixas de copas, mais densas nos vales (onde a cumeada desce)
  const densCumeada = x => 0.55 + 0.4 * Math.sin(x * 0.004 + 1.3) + 0.25 * Math.sin(x * 0.011);
  const pCumeada = massaDeCopas(cumeada, 11, 7, 15, 7, 14, densCumeada);
  const linhaVale = x => cumeada(x) + 46 + 10 * Math.sin(x * 0.006);
  const pCumeadaVale = massaDeCopas(linhaVale, 12, 6, 13, 8, 16, x => densCumeada(x) + 0.3);
  const pColina = (() => {
    const p = new Path2D();
    p.moveTo(COLINA[0][0], COLINA[0][1]);
    for (const [x, y] of COLINA) p.lineTo(x, y);
    p.lineTo(1800, MH + 400); p.lineTo(-200, MH + 400); p.closePath();
    return p;
  })();
  // carreiro de terra que desce da clareira para poente
  const pCarreiro = (() => {
    const p = new Path2D();
    p.moveTo(992, CHAO + 4);
    p.bezierCurveTo(932, 668, 902, 688, 842, 700);
    p.bezierCurveTo(780, 712, 756, 734, 694, 748);
    p.bezierCurveTo(630, 762, 590, 792, 500, 820);
    p.lineTo(516, 828);
    p.bezierCurveTo(612, 802, 654, 772, 708, 760);
    p.bezierCurveTo(772, 744, 794, 722, 850, 708);
    p.bezierCurveTo(904, 694, 936, 674, 995, CHAO + 4);
    p.closePath();
    return p;
  })();
  // manchas de mato na colina: quebram a cor lisa sem acrescentar formas
  const rM = aleatorio(61);
  const matos = Array.from({ length: 9 }, () => { const x = 200 + rM() * 1300; return { x, dy: 30 + rM() * 120, r: 50 + rM() * 70 }; }).filter(m => Math.abs(m.x - TORRE.x) > 170);
  const pChaoFrente = (() => {
    const p = new Path2D();
    p.moveTo(-220, chaoFrente(-220));
    for (let x = -220; x <= MW + 220; x += 8) p.lineTo(x, chaoFrente(x));
    p.lineTo(MW + 220, MH + 400); p.lineTo(-220, MH + 400); p.closePath();
    return p;
  })();

  // ---------- árvores desenhadas à mão (altura de referência ~200, base em 0,0) ----------
  // A silhueta de cada copa é desenhada à mão, ponto a ponto; só a borda da folhagem
  // ganha um recorte miúdo e irregular, para não parecer recortada a tesoura.
  function copaOrganica(pts, seed, grao) {
    const r = aleatorio(seed);
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / grao));
      for (let k = 0; k < n; k++) {
        const x0 = lerp(a[0], b[0], k / n), y0 = lerp(a[1], b[1], k / n);
        const x1 = lerp(a[0], b[0], (k + 1) / n), y1 = lerp(a[1], b[1], (k + 1) / n);
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const nx = mx - cx, ny = my - cy, nl = Math.hypot(nx, ny) || 1;
        // a folhagem recorta-se para cima e para os lados; por baixo a copa é mais lisa
        const bojo = grao * (0.35 + r() * 0.75) * (ny / nl > 0.45 ? 0.3 : 1);
        p.quadraticCurveTo(mx + nx / nl * bojo, my + ny / nl * bojo, x1, y1);
      }
    }
    p.closePath();
    return p;
  }
  // tronco afilado e ligeiramente sinuoso, de (0,0) até (topoX, topoY)
  function tronco(base, topo, topoX, topoY, curva = 0) {
    const p = new Path2D();
    p.moveTo(-base, 0);
    p.bezierCurveTo(-base + curva, topoY * 0.35, topoX - topo + curva * 0.5, topoY * 0.7, topoX - topo, topoY);
    p.lineTo(topoX + topo, topoY);
    p.bezierCurveTo(topoX + topo + curva * 0.5, topoY * 0.7, base + curva, topoY * 0.35, base, 0);
    p.closePath();
    return p;
  }
  function ramo(x0, y0, x1, y1, g) {
    const p = new Path2D();
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + 6;
    p.moveTo(x0 - g, y0); p.quadraticCurveTo(mx - g * 0.5, my, x1, y1); p.quadraticCurveTo(mx + g * 0.5, my - 2, x0 + g, y0); p.closePath();
    return p;
  }
  // pequenas variações de um desenho: outra semente para a borda e um ligeiro desvio nos pontos
  const variar = (pts, seed, d) => { const r = aleatorio(seed); return pts.map(([x, y]) => [x + (r() - 0.5) * d, y + (r() - 0.5) * d * 0.7]); };

  const DESENHOS = {
    // pinheiro-bravo: tronco alto e nu, copa em guarda-chuva irregular feita de várias massas
    pinheiro: [
      { troncos: () => [tronco(7, 3, 4, -156, -6), ramo(2, -132, -48, -160, 2.5), ramo(3, -140, 52, -164, 2.5), ramo(4, -150, 12, -182, 2)],
        copas: [
          [[-92, -160], [-82, -178], [-58, -190], [-30, -186], [-14, -172], [-30, -156], [-62, -150]],
          [[-30, -186], [-10, -206], [20, -214], [50, -206], [62, -188], [40, -174], [6, -172]],
          [[26, -168], [52, -184], [84, -182], [100, -166], [84, -150], [52, -150]],
        ] },
      { troncos: () => [tronco(6, 2.5, -6, -184, 8), ramo(-4, -166, -40, -186, 2), ramo(-5, -172, 34, -194, 2)],
        copas: [
          [[-64, -186], [-50, -204], [-22, -212], [-4, -200], [-14, -184], [-42, -178]],
          [[-14, -200], [4, -222], [32, -224], [54, -210], [48, -192], [18, -186]],
          [[-30, -176], [-8, -186], [18, -182], [24, -168], [0, -162], [-22, -164]],
        ] },
      { troncos: () => [tronco(7, 3, 26, -164, 4), ramo(22, -150, -14, -170, 2.2), ramo(24, -156, 64, -178, 2.2)],
        copas: [
          [[-36, -168], [-24, -186], [4, -192], [22, -180], [8, -164], [-18, -160]],
          [[8, -186], [30, -204], [62, -202], [84, -188], [74, -172], [36, -170]],
          [[56, -172], [80, -182], [104, -172], [102, -158], [78, -154]],
        ] },
    ],
    // eucalipto: muito alto e esguio, copa estreita e pendente, com falhas
    eucalipto: [
      { troncos: () => [tronco(4, 1.6, 2, -250, -4), ramo(1, -200, -18, -214, 1.4), ramo(2, -186, 18, -200, 1.4)],
        copas: [
          [[-22, -254], [-6, -266], [12, -256], [20, -232], [10, -216], [-14, -218], [-26, -236]],
          [[-30, -212], [-12, -218], [-4, -200], [-10, -180], [-28, -178], [-34, -196]],
          [[4, -196], [22, -202], [30, -184], [22, -164], [6, -170]],
        ] },
      { troncos: () => [tronco(4, 1.5, -8, -240, 6), ramo(-6, -196, 14, -210, 1.4)],
        copas: [
          [[-28, -246], [-12, -258], [6, -248], [10, -226], [-4, -212], [-24, -216], [-34, -232]],
          [[2, -214], [18, -218], [26, -198], [16, -182], [2, -188]],
          [[-30, -196], [-16, -200], [-12, -184], [-20, -170], [-34, -176]],
        ] },
    ],
    // sobreiro: tronco curto e grosso que abre em braços, copa larga, funda e arredondada
    sobreiro: [
      { troncos: () => [tronco(14, 10, -4, -62, 3), ramo(-8, -56, -46, -104, 9), ramo(-2, -58, 40, -108, 9), ramo(-5, -60, 6, -118, 7), ramo(-6, -60, -84, -100, 5), ramo(-2, -60, 78, -104, 5)],
        copas: [
          [[-118, -92], [-122, -122], [-98, -152], [-58, -170], [-12, -176], [36, -170], [80, -154], [112, -128], [116, -98], [92, -82], [46, -90], [0, -84], [-48, -90], [-92, -82]],
          [[-150, -96], [-150, -120], [-126, -130], [-108, -112], [-118, -90]],
          [[98, -110], [124, -132], [150, -124], [152, -100], [126, -92]],
        ] },
      { troncos: () => [tronco(13, 9, 4, -56, -3), ramo(2, -50, -40, -98, 8), ramo(6, -52, 46, -96, 8), ramo(4, -54, 2, -110, 6)],
        copas: [
          [[-104, -86], [-110, -114], [-86, -142], [-44, -160], [4, -164], [50, -156], [90, -134], [108, -106], [96, -80], [50, -86], [2, -80], [-48, -86], [-86, -78]],
          [[-30, -158], [-6, -184], [30, -184], [50, -162], [10, -156]],
        ] },
    ],
  };
  // monta 3 ou 4 variantes de cada espécie a partir dos desenhos (outra borda, pontos ligeiramente desviados)
  const ARVORES = {};
  let semente = 500;
  for (const [esp, lista] of Object.entries(DESENHOS)) {
    ARVORES[esp] = [];
    const total = esp === 'pinheiro' ? 4 : esp === 'eucalipto' ? 3 : 3;
    for (let v = 0; v < total; v++) {
      const d = lista[v % lista.length];
      const desvio = v < lista.length ? 0 : 14;
      ARVORES[esp].push({
        troncoP: d.troncos(),
        copaP: d.copas.map((pts, i) => copaOrganica(desvio ? variar(pts, semente + i, desvio) : pts, semente + i * 7, esp === 'sobreiro' ? 15 : esp === 'pinheiro' ? 10 : 8)),
      });
      semente += 31;
    }
  }

  // manchas de árvores colocadas à mão: [espécie, variante, x, escala, rotação, espelhar]
  const r0 = aleatorio(77);
  const mancha1 = (esp, xs, base) => xs.map(([v, x, e, rot, esp2]) => ({ esp: esp2 || esp, v, x, e, rot, flip: r0() < 0.5, fase: r0() * 6, base }));
  // primeiro plano: poucas árvores a emoldurar os lados, cortadas pelas margens
  const FRENTE = [
    ...mancha1('pinheiro', [[0, -30, 1.75, -0.04], [1, 95, 1.45, 0.02], [0, 230, 0.9, 0, 'sobreiro']], 'frente'),
    ...mancha1('pinheiro', [[1, 1365, 0.95, 0, 'sobreiro'], [2, 1500, 1.5, 0.03], [3, 1630, 1.8, -0.02]], 'frente'),
  ];
  // colina: manchas de árvores encostadas umas às outras, com clareiras entre elas
  const grupo = (x0, n, passo, escala, seed, especies) => {
    const r = aleatorio(seed);
    return Array.from({ length: n }, (_, i) => {
      const esp = especies[(r() * especies.length) | 0];
      return { esp, v: (r() * 4) | 0, x: x0 + i * passo + (r() - 0.5) * passo * 0.6, e: escala * (0.75 + r() * 0.45), rot: (r() - 0.5) * 0.06, flip: r() < 0.5, fase: r() * 6, base: 'colina' };
    });
  };
  const COLINA_ARVORES = [
    ...grupo(40, 7, 24, 0.46, 201, ['pinheiro', 'pinheiro', 'sobreiro']),
    ...grupo(560, 9, 19, 0.4, 203, ['pinheiro', 'sobreiro', 'pinheiro', 'eucalipto']),
    ...grupo(1240, 6, 21, 0.38, 204, ['pinheiro', 'sobreiro']),
    ...grupo(1430, 5, 26, 0.44, 205, ['sobreiro', 'pinheiro', 'eucalipto']),
  ].sort((a, b) => colinaY(a.x) - colinaY(b.x));

  // ---------- céu ----------
  const rE = aleatorio(7);
  const estrelas = Array.from({ length: 220 }, () => ({ x: rE() * MW, y: rE() * 520, r: 0.4 + rE() * 1.3, f: rE() * 6 }));
  // nuvens alongadas: base plana e mais escura, topo iluminado, bordas que se desfazem
  function fazerNuvem(seed, comp) {
    const r = aleatorio(seed);
    const base = [], topo = [];
    const n = Math.round(comp / 34);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      base.push({ x: u * comp + (r() - 0.5) * 14, y: (r() - 0.5) * 4, r: 34 + r() * 22, a: 0.85 });
    }
    const m = 3 + (r() * 3 | 0);
    for (let i = 0; i < m; i++) {
      const u = (i + 0.5) / m - 0.5;
      const alto = 1 - Math.abs(u) * 1.6;
      topo.push({ x: u * comp * 0.75 + (r() - 0.5) * 20, y: -16 - alto * (18 + r() * 16), r: 30 + alto * 24 + r() * 10, a: 0.9 });
    }
    return { base, topo };
  }
  const nuvens = [
    { x: 260, y: 160, v: 0.010, ...fazerNuvem(1, 300) },
    { x: 930, y: 112, v: 0.007, ...fazerNuvem(2, 210) },
    { x: 1360, y: 220, v: 0.009, ...fazerNuvem(3, 340) },
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
    const s = base * z, resto = (1 - e) * base / s;
    return { s, fx: JANELA.x - (JANELA.x - cx) * resto, fy: JANELA.y - (JANELA.y - cy) * resto, z };
  }

  // ---------- fogo ----------
  // Nasce numa fogueira mal apagada no parque de merendas e espalha-se sobretudo para leste,
  // com o vento. Do posto vê-se sobretudo o fumo e o clarão; as chamas mal aparecem entre as copas.
  const frente = f => ({ esq: FOGO.x - (6 + f * 70), dir: FOGO.x + (6 + f * 230) });
  const N_FUMO = 30;
  const rF = aleatorio(53);
  const sopros = Array.from({ length: N_FUMO }, (_, i) => ({ fase: i / N_FUMO, lado: rF() - 0.5, f: rF() * 6 }));
  const rB = aleatorio(91);
  const faulhas = Array.from({ length: 26 }, () => ({ u: rB(), fase: rB(), v: 0.6 + rB() * 0.8 }));

  // coluna de fumo: estreita na base, a alargar e a dobrar com o vento, densa e quente em baixo
  function colunaDeFumo(p, t, intensidade, noite, fogo, brasa = 0) {
    if (intensidade <= 0.01) return;
    const { esq, dir } = frente(fogo);
    const x0 = fogo > 0.02 ? lerp(esq, dir, 0.62) : FOGO.x;
    const y0 = cumeada(x0) + 4;
    const altura = lerp(150, 560, intensidade), vento = lerp(70, 300, intensidade);
    const rBase = lerp(7, 26, intensidade), rTopo = lerp(36, 150, intensidade);
    const cinzaDia = mistura(hex('#A9A6A2'), ceuBase(p), 0.45);
    const cinzaNoite = hex('#3E3A47');
    const cinza = mistura(cinzaDia, cinzaNoite, noite);
    const quente = hex('#E58A45');
    // de tarde, um fio claro e transparente; à noite, uma coluna densa
    const aMax = lerp(0.12, 0.36, suave(0.1, 0.6, intensidade));
    const vel = reduzir ? 0 : 0.000045 * (0.7 + intensidade);
    // dos de trás para os da frente, para a base densa ficar por cima
    const ordem = sopros.map(s => ({ s, q: (s.fase + t * vel) % 1 })).sort((a, b) => b.q - a.q);
    for (const { s, q } of ordem) {
      const x = x0 + vento * q ** 1.6 + s.lado * rBase * 1.2 + (reduzir ? 0 : Math.sin(t * 0.0005 + s.f) * 10 * q);
      const y = y0 - altura * q;
      const r = lerp(rBase, rTopo, q ** 0.8);
      const a = aMax * suave(0, 0.1, q) * (1 - q) ** 1.25;
      // em baixo, à noite, o fumo é iluminado a laranja pelas chamas
      const luz = clamp(1 - q * 3.2, 0, 1) * Math.max(fogo, brasa) * (0.35 + 0.65 * noite);
      mancha(x, y, r, mistura(cinza, quente, luz * 0.85), a);
    }
  }
  function chamasEntreCopas(t, f, noite) {
    if (f <= 0.02) return;
    const { esq, dir } = frente(f);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // clarão por trás das copas
    const cx = (esq + dir) / 2, cy = cumeada(cx);
    mancha(cx, cy, 120 + 260 * f, hex('#FF7A30'), 0.35 * f * (0.5 + 0.5 * noite), 0.55);
    // línguas baixas ao longo da frente: só as pontas espreitam por cima das copas
    const n = 54;
    for (let i = 0; i < n; i++) {
      const xx = lerp(esq, dir, i / (n - 1));
      const y0 = cumeada(xx) + 2;
      const forca = Math.min(1, Math.exp(-(dir - xx) / 26) + 0.6 * Math.exp(-(xx - esq) / 20) + 0.12);
      const onda = reduzir ? 0.7 : 0.55 + 0.45 * Math.sin(t * 0.017 + i * 1.7) * Math.sin(t * 0.011 + i * 0.6);
      const h = (12 + 26 * onda) * forca * (0.4 + 0.6 * f);
      if (h < 2) continue;
      const w = 3 + 2 * f;
      const gg = ctx.createLinearGradient(0, y0, 0, y0 - h);
      gg.addColorStop(0, 'rgba(255,90,30,0.85)'); gg.addColorStop(0.6, 'rgba(255,160,60,0.55)'); gg.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = gg;
      const inc = h * 0.25;
      ctx.beginPath(); ctx.moveTo(xx - w, y0);
      ctx.quadraticCurveTo(xx - w * 0.3 + inc * 0.3, y0 - h * 0.6, xx + inc, y0 - h);
      ctx.quadraticCurveTo(xx + w * 0.4 + inc * 0.4, y0 - h * 0.6, xx + w, y0);
      ctx.fill();
    }
    ctx.restore();
  }
  function luzDoFogoNoTerreno(t, f, noite) {
    if (f <= 0.02) return;
    const { esq, dir } = frente(f);
    const cx = (esq + dir) / 2, cy = cumeada(cx) + 30;
    const tremor = reduzir ? 1 : 0.9 + 0.1 * Math.sin(t * 0.013) * Math.sin(t * 0.007);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    mancha(cx, cy, 260 + 300 * f, hex('#C4461C'), 0.42 * f * tremor * (0.4 + 0.6 * noite), 0.6);
    ctx.globalCompositeOperation = 'lighter';
    // algumas faúlhas a subir por cima das copas
    if (!reduzir) {
      for (const b of faulhas) {
        const q = (b.fase + t * 0.00018 * b.v) % 1;
        const x = lerp(esq, dir, b.u) + q * 60 + Math.sin(t * 0.004 + b.u * 20) * 4;
        const y = cumeada(x) - 10 - q * 110;
        ctx.fillStyle = `rgba(255,${170 + 60 * (1 - q) | 0},80,${0.8 * (1 - q) * f * noite})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }
    ctx.restore();
  }

  // ---------- árvores ----------
  // desenha uma árvore com luz de contorno do lado do sol (de dia) e um balanço muito leve
  function arvore(a, x, y, t, cor, rim) {
    const d = ARVORES[a.esp][a.v % ARVORES[a.esp].length];
    ctx.save();
    ctx.translate(x, y);
    const balanco = reduzir ? 0 : (a.base === 'frente' ? 0.012 : 0.004) * Math.sin(t * 0.0009 + a.fase) * (rim ? rim.vento : 1);
    ctx.rotate(a.rot + balanco);
    ctx.scale(a.flip ? -a.e : a.e, a.e);
    ctx.fillStyle = rgb(cor);
    for (const p of d.troncoP) ctx.fill(p);
    if (a.e < 0.6) { ctx.strokeStyle = rgb(cor); ctx.lineWidth = 1.4 / a.e; ctx.lineJoin = 'round'; for (const p of d.troncoP) ctx.stroke(p); }
    if (!(rim && rim.a > 0.01)) for (const p of d.copaP) ctx.fill(p);
    if (rim && rim.a > 0.01) {
      // luz suave dentro da copa: mais clara em cima, do lado do sol, sem contornos nítidos
      const l = (a.flip ? -1 : 1) * rim.lado;
      const gr = ctx.createLinearGradient(l * 110, -240, -l * 30, -90);
      gr.addColorStop(0, rgb(mistura(cor, rim.cor, rim.a)));
      gr.addColorStop(0.55, rgb(mistura(cor, rim.cor, rim.a * 0.25)));
      gr.addColorStop(1, rgb(cor));
      ctx.fillStyle = gr;
      for (const p of d.copaP) ctx.fill(p);
    }
    ctx.restore();
  }

  // ---------- torre, clareira e chão à volta ----------
  const PERNA_TOPO = 34, PERNA_BASE = 64;
  const rC = aleatorio(31);
  const pedras = Array.from({ length: 9 }, () => ({ x: TORRE.x + (rC() - 0.5) * 200, r: 2.5 + rC() * 4.5 }));
  const tufos = Array.from({ length: 26 }, () => ({ x: TORRE.x + (rC() - 0.5) * 230, h: 4 + rC() * 7, f: rC() * 6 }));
  const arbustos = [[TORRE.x - 108, 1], [TORRE.x - 92, 0.7], [TORRE.x + 96, 0.85], [TORRE.x + 118, 1.1], [TORRE.x + 30, 0.55]];

  function clareiraESombras(p, sx, sy, dia) {
    const { x } = TORRE;
    // terra batida: mancha alongada no topo plano da colina
    const terra = rgb(corTerra(p));
    ctx.fillStyle = terra;
    ctx.beginPath();
    ctx.moveTo(x - 120, CHAO + 3);
    ctx.bezierCurveTo(x - 96, CHAO - 3, x - 40, CHAO - 4, x, CHAO - 4);
    ctx.bezierCurveTo(x + 50, CHAO - 4, x + 100, CHAO - 3, x + 124, CHAO + 3);
    ctx.bezierCurveTo(x + 80, CHAO + 9, x - 70, CHAO + 9, x - 120, CHAO + 3);
    ctx.fill();
    // sombra projetada no chão, do lado oposto ao sol: mais comprida com o sol baixo
    if (dia > 0.02) {
      const lado = sx < x ? 1 : -1;
      const comp = clamp((sy - 120) * 0.55, 30, 260);
      ctx.save();
      if ('filter' in ctx) ctx.filter = 'blur(3px)';
      ctx.fillStyle = `rgba(20,30,20,${0.22 * dia})`;
      ctx.beginPath();
      ctx.moveTo(x - PERNA_BASE, CHAO); ctx.lineTo(x + PERNA_BASE, CHAO);
      ctx.lineTo(x + lado * comp + 26, CHAO + 9); ctx.lineTo(x + lado * comp - 26, CHAO + 9);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // sombra de contacto, sempre presente
    mancha(x, CHAO + 1, 96, hex('#1A160F'), 0.35, 0.09);
  }

  function chaoDaTorre(p, t, cor) {
    const { x } = TORRE;
    // sapatas de betão, meio enterradas, uma por perna (vistas de frente: duas)
    for (const sx of [x - PERNA_BASE, x + PERNA_BASE]) {
      ctx.fillStyle = rgb(corBetao(p));
      ctx.beginPath();
      ctx.moveTo(sx - 10, CHAO + 3); ctx.lineTo(sx - 8, CHAO - 9); ctx.lineTo(sx + 8, CHAO - 9); ctx.lineTo(sx + 10, CHAO + 3); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(sx + 2, CHAO - 9, 6, 12);
      // lábio de terra que enterra a sapata
      ctx.fillStyle = rgb(corTerra(p));
      ctx.beginPath(); ctx.ellipse(sx, CHAO + 3, 15, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    // pedras
    for (const s of pedras) {
      ctx.fillStyle = rgb(mistura(corBetao(p), cor, 0.35));
      ctx.beginPath(); ctx.ellipse(s.x, CHAO + 2, s.r, s.r * 0.6, 0, Math.PI, 0); ctx.fill();
    }
    // arbustos baixos e tufos de erva
    for (const [ax, e] of arbustos) {
      ctx.fillStyle = rgb(mistura(cor, [0, 0, 0], 0.15));
      ctx.beginPath();
      ctx.moveTo(ax - 16 * e, CHAO + 3);
      ctx.bezierCurveTo(ax - 18 * e, CHAO - 8 * e, ax - 8 * e, CHAO - 14 * e, ax, CHAO - 12 * e);
      ctx.bezierCurveTo(ax + 8 * e, CHAO - 16 * e, ax + 18 * e, CHAO - 8 * e, ax + 16 * e, CHAO + 3);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = rgb(mistura(cor, [0, 0, 0], 0.1));
    ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const g of tufos) {
      const b = reduzir ? 0 : Math.sin(t * 0.002 + g.f) * 1.2;
      ctx.moveTo(g.x - 2, CHAO + 3); ctx.quadraticCurveTo(g.x - 3, CHAO - g.h * 0.5, g.x - 4 + b, CHAO - g.h);
      ctx.moveTo(g.x, CHAO + 3); ctx.quadraticCurveTo(g.x, CHAO - g.h * 0.6, g.x + 1 + b, CHAO - g.h * 1.15);
      ctx.moveTo(g.x + 2, CHAO + 3); ctx.quadraticCurveTo(g.x + 3, CHAO - g.h * 0.5, g.x + 5 + b, CHAO - g.h * 0.9);
    }
    ctx.stroke();
  }

  function desenharTorre(p, t) {
    const { x, cabY, cabH, cabW } = TORRE;
    const baixo = cabY + cabH;
    const fim = CHAO - 8;                       // as pernas entram no topo das sapatas
    const metal = rgb(corMetal(p));
    const metalClaro = rgb(corMetalClaro(p));
    const meia = y => lerp(PERNA_TOPO, PERNA_BASE, (y - baixo) / (fim - baixo));
    ctx.lineCap = 'round';

    // pernas: face de sombra e face de luz
    ctx.strokeStyle = metal; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - PERNA_TOPO, baixo); ctx.lineTo(x - PERNA_BASE, fim);
    ctx.moveTo(x + PERNA_TOPO, baixo); ctx.lineTo(x + PERNA_BASE, fim);
    ctx.stroke();
    ctx.strokeStyle = metalClaro; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - PERNA_TOPO - 1.5, baixo); ctx.lineTo(x - PERNA_BASE - 1.5, fim);
    ctx.moveTo(x + PERNA_TOPO - 1.5, baixo); ctx.lineTo(x + PERNA_BASE - 1.5, fim);
    ctx.stroke();
    // contraventamentos em X e travessas
    const niveis = 6;
    ctx.strokeStyle = metal; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < niveis; i++) {
      const y1 = lerp(baixo, fim, i / niveis), y2 = lerp(baixo, fim, (i + 1) / niveis);
      ctx.moveTo(x - meia(y1), y1); ctx.lineTo(x + meia(y2), y2);
      ctx.moveTo(x + meia(y1), y1); ctx.lineTo(x - meia(y2), y2);
      ctx.moveTo(x - meia(y2), y2); ctx.lineTo(x + meia(y2), y2);
    }
    ctx.stroke();
    // rebites nas juntas
    ctx.fillStyle = rgb(mistura(corMetal(p), hex('#F3D9B0'), 0.35 * (1 - suave(0.55, 0.7, p))));
    for (let i = 0; i <= niveis; i++) {
      const yy = lerp(baixo, fim, i / niveis), m = meia(yy);
      for (const xx of [x - m, x + m]) { ctx.beginPath(); ctx.arc(xx, yy, 1.7, 0, Math.PI * 2); ctx.fill(); }
    }
    // escada de mão, do varandim até ao chão
    const e1 = x + 12, e2 = x + 22;
    ctx.strokeStyle = metalClaro; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(e1, baixo + 4); ctx.lineTo(e1 + 4, CHAO - 1);
    ctx.moveTo(e2, baixo + 4); ctx.lineTo(e2 + 4, CHAO - 1);
    for (let yy = baixo + 12; yy < CHAO - 4; yy += 11) {
      const q = (yy - baixo) / (CHAO - baixo);
      ctx.moveTo(e1 + 4 * q, yy); ctx.lineTo(e2 + 4 * q, yy);
    }
    ctx.stroke();

    // varandim
    ctx.fillStyle = metal;
    ctx.fillRect(x - cabW / 2 - 16, baixo, cabW + 32, 5);
    ctx.strokeStyle = metal; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - cabW / 2 - 16, baixo - 16); ctx.lineTo(x + cabW / 2 + 16, baixo - 16);
    for (let i = 0; i <= 12; i++) { const xx = x - cabW / 2 - 16 + i * (cabW + 32) / 12; ctx.moveTo(xx, baixo - 16); ctx.lineTo(xx, baixo); }
    ctx.stroke();

    // cabine
    ctx.fillStyle = rgb(corParede(p));
    ctx.fillRect(x - cabW / 2, cabY, cabW, cabH);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + cabW / 2 - 14, cabY, 14, cabH);

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
    {
      ctx.fillStyle = rgb(hex('#2A1C14'), 0.8 + 0.2 * aceso);
      const vx = x + 2, vy = jy + jh;
      ctx.beginPath();
      ctx.moveTo(vx - 13, vy); ctx.quadraticCurveTo(vx - 12, vy - 17, vx, vy - 18); ctx.quadraticCurveTo(vx + 12, vy - 17, vx + 13, vy); ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(vx, vy - 25, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(vx - 13, vy - 29, 8, 5);
      ctx.fillRect(vx - 7, vy - 22, 5, 8);
    }
    // reflexo do céu no vidro, que desaparece quando o candeeiro acende
    const brilhoVidro = 0.3 * (1 - aceso);
    if (brilhoVidro > 0.01) {
      for (const [a, b] of panos) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x + a, jy, b - a, jh); ctx.clip();
        const gv = ctx.createLinearGradient(x + a, jy, x + b, jy + jh);
        gv.addColorStop(0, `rgba(255,255,255,${brilhoVidro * 0.15})`);
        gv.addColorStop(0.45, `rgba(255,255,255,${brilhoVidro * 0.15})`);
        gv.addColorStop(0.5, `rgba(255,255,255,${brilhoVidro})`);
        gv.addColorStop(0.6, `rgba(255,255,255,${brilhoVidro * 0.1})`);
        gv.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gv; ctx.fillRect(x + a, jy, b - a, jh);
        ctx.restore();
      }
    }
    // caixilhos
    ctx.fillStyle = metal;
    for (const [a, b] of panos) ctx.fillRect(x + a - 1, jy + jh / 2 - 0.8, b - a + 2, 1.6);
    ctx.strokeStyle = metal; ctx.lineWidth = 2.2;
    for (const [a, b] of panos) ctx.strokeRect(x + a, jy, b - a, jh);
    // luz derramada pelo vidro à noite
    if (aceso > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      mancha(x, jy + jh / 2, 150, hex('#F6B650'), 0.3 * aceso);
      ctx.restore();
    }

    // telhado de quatro águas e para-raios
    ctx.fillStyle = rgb(corTelhado(p));
    ctx.beginPath();
    ctx.moveTo(x - cabW / 2 - 12, cabY + 2); ctx.lineTo(x - 18, cabY - 32); ctx.lineTo(x + 18, cabY - 32); ctx.lineTo(x + cabW / 2 + 12, cabY + 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.moveTo(x + 18, cabY - 32); ctx.lineTo(x + cabW / 2 + 12, cabY + 2); ctx.lineTo(x + 30, cabY + 2); ctx.closePath(); ctx.fill();
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

  // ---------- nuvens e névoa ----------
  function desenharNuvem(n, x, p, tintaFogo) {
    const noite = suave(0.55, 0.72, p);
    const a = lerp(0.95, 0.5, noite);
    let luz = corNuvemLuz(p), sombra = corNuvemSombra(p);
    if (tintaFogo > 0) { luz = mistura(luz, hex('#E07040'), tintaFogo); sombra = mistura(sombra, hex('#7A3A40'), tintaFogo * 0.7); }
    // base plana e mais escura
    for (const b of n.base) mancha(x + b.x, n.y + b.y, b.r, sombra, b.a * a, 0.42);
    // topo iluminado, ligeiramente acima
    for (const c of n.topo) mancha(x + c.x, n.y + c.y, c.r, luz, c.a * a, 0.62);
  }
  function nevoaDoVale(y, alto, cor, a, sx, corSol, dia) {
    if (a <= 0.01) return;
    const g = ctx.createLinearGradient(0, y - alto, 0, y + alto * 0.3);
    g.addColorStop(0, rgb(cor, 0)); g.addColorStop(0.7, rgb(cor, a)); g.addColorStop(1, rgb(cor, a * 0.5));
    ctx.fillStyle = g; ctx.fillRect(-220, y - alto, MW + 440, alto * 1.3);
    // do lado do sol, a névoa fica mais clara
    if (dia > 0.02) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      mancha(sx, y - alto * 0.25, 520, corSol, 0.16 * dia * a / 0.4, 0.22);
      ctx.restore();
    }
  }
  const forcaNevoa = p => lerp(0.55, 0.16, suave(0.02, 0.24, p)) + 0.14 * suave(0.42, 0.55, p) - 0.18 * suave(0.6, 0.75, p);

  // ---------- desenho ----------
  function desenhar(p, t) {
    const cam = camara(p);
    const noite = suave(0.55, 0.72, p);
    const dia = 1 - suave(0.5, 0.64, p);
    const ignicao = suave(0.57, 0.63, p);
    const fogo = suave(0.63, 0.78, p);
    // fumo: de tarde já se vê uma coluna fina; à noite cresce com o fogo
    const fumo = Math.max(0.12 * suave(0.38, 0.5, p) * (1 - suave(0.56, 0.62, p)) + 0.18 * ignicao, fogo);
    const vento = 0.6 + 0.9 * suave(0.3, 0.6, p);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // céu, preso ao ecrã para não perder o gradiente com o zoom
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(ceuTopo(p))); g.addColorStop(0.78, rgb(ceuBase(p)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * (W / 2 - cam.fx * cam.s), dpr * (H / 2 - cam.fy * cam.s));

    // parallax: a câmara sobe pela torre; o longe mexe-se menos (a colina da torre é a referência)
    const u = suave(0.02, 0.8, p);
    const dyCeu = -36 * u, dyLonge = -24 * u, dyCumeada = -14 * u, dyFrente = 60 * u;

    // --- céu ---
    ctx.save();
    ctx.translate(0, dyCeu);
    if (noite > 0) {
      for (const e of estrelas) {
        const a = noite * (reduzir ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.002 + e.f * 3));
        ctx.fillStyle = `rgba(236,236,220,${a})`;
        ctx.fillRect(e.x, e.y, e.r, e.r);
      }
    }
    // sol: disco com um halo largo e macio, sem raios
    const s = clamp(p / 0.56, 0, 1);
    const sx = 120 + s * 1420, sy = 560 - Math.sin(s * Math.PI) * 420 + s * s * 40;
    const corSol = corSolDe(s);
    if (s < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      // de manhã cedo o sol ainda está por trás da serra: só um clarão contido
      const nascer = 0.6 + 0.4 * suave(0.06, 0.16, p);
      mancha(sx, sy, 420, corSol, 0.2 * dia * nascer);
      mancha(sx, sy, 140, corSol, 0.32 * dia * nascer);
      ctx.restore();
      ctx.fillStyle = rgb(corSol);
      ctx.beginPath(); ctx.arc(sx, sy, 28, 0, Math.PI * 2); ctx.fill();
    }
    // lua em quarto crescente a nascer a leste, do lado oposto ao fogo
    const l = suave(0.6, 1, p);
    if (l > 0) {
      const lx = 1380 - l * 120, ly = 470 - l * 290;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      mancha(lx, ly, 70, hex('#C9CFE8'), 0.12 * l);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(lx - 40, ly - 40, 80, 80); ctx.arc(lx + 9, ly - 5, 20, 0, Math.PI * 2); ctx.clip('evenodd');
      ctx.fillStyle = `rgba(240,236,214,${l})`;
      ctx.beginPath(); ctx.arc(lx, ly, 22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // nuvens
    const cxFogo = (frente(fogo).esq + frente(fogo).dir) / 2;
    for (const n of nuvens) {
      const x = ((n.x + t * n.v * (reduzir ? 0 : 1)) % (MW + 500)) - 250;
      const tinta = fogo * 0.55 * Math.exp(-Math.abs(x - cxFogo) / 600);
      desenharNuvem(n, x, p, tinta);
    }
    ctx.restore();

    const horizonte = ceuBase(p);
    const nevoa = forcaNevoa(p);

    // --- serra ao longe: clara e de pouco contraste ---
    ctx.save();
    ctx.translate(0, dyLonge);
    ctx.fillStyle = rgb(mistura(corPlano[0](p), horizonte, 0.45 * (1 - 0.5 * noite)));
    ctx.fill(pSerraLonge);
    nevoaDoVale(560, 70, horizonte, nevoa * 0.7, sx, corSol, dia);
    ctx.restore();

    // --- cumeada com floresta: o fumo nasce atrás das copas ---
    ctx.save();
    ctx.translate(0, dyCumeada);
    // a fogueira mal apagada: antes de o fogo pegar, só um brilho baixo entre as copas
    const brasa = ignicao * (1 - suave(0.1, 0.5, fogo));
    if (brasa > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const tremeluz = reduzir ? 1 : 0.8 + 0.2 * Math.sin(t * 0.02) * Math.sin(t * 0.013);
      mancha(FOGO.x, cumeada(FOGO.x) - 4, 46, hex('#FF8A3A'), 0.5 * brasa * tremeluz, 0.7);
      ctx.restore();
    }
    colunaDeFumo(p, t, Math.max(fumo, 0.3 * ignicao), noite, fogo, brasa);
    chamasEntreCopas(t, fogo, noite);
    const corCumeada = mistura(corPlano[1](p), horizonte, 0.2 * (1 - 0.5 * noite));
    ctx.fillStyle = rgb(corCumeada);
    ctx.fill(pCumeada);
    ctx.fillStyle = rgb(mistura(corCumeada, [0, 0, 0], 0.1));
    ctx.fill(pCumeadaVale);
    luzDoFogoNoTerreno(t, fogo, noite);
    nevoaDoVale(690, 90, horizonte, nevoa, sx, corSol, dia);
    ctx.restore();

    // ar quente das horas secas: uma camada âmbar muito ténue sobre o horizonte
    const calor = suave(0.2, 0.4, p) * (1 - suave(0.5, 0.6, p));
    if (calor > 0.01) {
      const gq = ctx.createLinearGradient(0, 420, 0, 760);
      gq.addColorStop(0, 'rgba(255,196,120,0)'); gq.addColorStop(0.55, `rgba(255,190,110,${0.1 * calor})`); gq.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = gq; ctx.fillRect(-220, 420, MW + 440, 340);
    }

    // --- colina da torre ---
    const corColina = corPlano[2](p);
    // a colina recebe mais luz no topo e escurece para o vale
    const gc = ctx.createLinearGradient(0, CHAO - 10, 0, 900);
    gc.addColorStop(0, rgb(mistura(corColina, mistura(corSol, horizonte, 0.5), 0.16 * dia + 0.04)));
    gc.addColorStop(0.45, rgb(corColina));
    gc.addColorStop(1, rgb(mistura(corColina, [0, 0, 0], 0.22)));
    ctx.fillStyle = gc;
    ctx.fill(pColina);
    for (const m of matos) mancha(m.x, colinaY(m.x) + m.dy, m.r, mistura(corColina, [0, 0, 0], 0.3), 0.22, 0.35);
    const gt = ctx.createLinearGradient(0, CHAO, 0, 830);
    gt.addColorStop(0, rgb(corTerra(p), 0.08)); gt.addColorStop(0.35, rgb(corTerra(p), 0.26)); gt.addColorStop(1, rgb(corTerra(p), 0.36));
    ctx.fillStyle = gt;
    ctx.fill(pCarreiro);
    const lado = sx < MW / 2 ? -1 : 1;
    const rimColina = { cor: mistura(corSol, [255, 255, 255], 0.2), a: 0.45 * dia, lado: sx < TORRE.x ? -1 : 1, vento };
    for (const a of COLINA_ARVORES) arvore(a, a.x, colinaY(a.x) + 2, t, mistura(corColina, [0, 0, 0], 0.18), rimColina);
    clareiraESombras(p, sx, sy, dia);
    desenharTorre(p, t);
    chaoDaTorre(p, t, mistura(corColina, [0, 0, 0], 0.08));

    // --- primeiro plano: o mais escuro, com luz de contorno do lado do sol ---
    ctx.save();
    ctx.translate(0, dyFrente);
    const corFrente = corPlano[3](p);
    const solBaixo = 0.35 + 0.65 * Math.max(1 - suave(0.04, 0.2, p), suave(0.36, 0.48, p));
    const rimFrente = { cor: mistura(corSol, [255, 255, 255], 0.1), a: 0.42 * dia * solBaixo, lado, vento };
    for (const a of FRENTE) arvore(a, a.x, chaoFrente(a.x) + 6, t, corFrente, rimFrente);
    ctx.fillStyle = rgb(corFrente);
    ctx.fill(pChaoFrente);
    ctx.restore();

    // o fogo tinge o primeiro plano do lado do incêndio
    if (fogo > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      mancha(cxFogo, cumeada(cxFogo) + 120, 760, hex('#B4421C'), 0.26 * fogo, 0.7);
      ctx.restore();
    }

    // entrada na cabine: a luz do candeeiro toma o ecrã
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const entrada = suave(0.965, 0.998, p);
    if (entrada > 0) {
      ctx.fillStyle = `rgba(46,33,25,${entrada})`;
      ctx.fillRect(0, 0, W, H);
      const gl = ctx.createRadialGradient(W / 2, 120, 10, W / 2, 120, Math.max(W, H) * 0.7);
      gl.addColorStop(0, `rgba(246,182,80,${0.16 * entrada})`); gl.addColorStop(1, 'rgba(246,182,80,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
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
