/* Jogo: dez anos a gerir a serra a partir do posto de vigia.
   Métricas: RiscoDeIncêndio (0-100%), OrçamentoDisponível (€), ResiliênciaEcológica (0-100%). */
(() => {
  const ANOS = 10;
  const ORCAMENTO_INICIAL = 2500;
  const APOIO_ANUAL = 500;
  const CUSTO_ALDEIA = 1500;
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const euros = v => `${Math.round(v).toLocaleString('pt-PT').replace(/[\u202f\u00a0]/g, ' ')} €`;
  const pct = v => `${Math.round(v)}%`;
  const espera = ms => new Promise(r => setTimeout(r, reduzir ? Math.min(ms, 60) : ms));

  // ---------- regras ----------
  const TIPOS = {
    mato: {
      nome: 'Mato por limpar', cor: '#E4DDBC', tinta: '#857543',
      texto: 'Giesta, tojo e silvas. Não rende nada e junta combustível todos os anos.',
      crescimento: 18,
    },
    eucalipto: {
      nome: 'Eucaliptal', cor: '#CFE0D7', tinta: '#4B7C6F',
      texto: 'Cresce depressa e vende-se ao fim de 3 anos. Também arde depressa, e volta a rebentar depois do fogo.',
      crescimento: 20,
    },
    pinhal: {
      nome: 'Pinhal', cor: '#D5DEC0', tinta: '#3D5A33',
      texto: 'Madeira ao fim de 4 anos. Acumula caruma e mato por baixo.',
      crescimento: 14,
    },
    autoctone: {
      nome: 'Folhosas autóctones', cor: '#C6DBB2', tinta: '#355F2E',
      texto: 'Carvalho, sobreiro e medronheiro. Caro de plantar e sem lucro rápido. A partir dos 3 anos, resiste ao fogo metade das vezes e a partir dos 4 dá cortiça e medronho.',
      crescimento: 7,
    },
    ardido: {
      nome: 'Área ardida', cor: '#6E6660', tinta: '#2F2926',
      texto: 'Cinza e troncos queimados. Não volta a arder tão cedo, mas não protege nada.',
      crescimento: 0,
    },
    aldeia: {
      nome: 'Aldeia', cor: '#EADCC6', tinta: '#23321F',
      texto: `Aqui não se planta. Se o fogo chegar às casas, a reconstrução custa ${euros(CUSTO_ALDEIA)}.`,
      crescimento: 0,
    },
  };

  const ACOES = {
    limpar: { nome: 'Limpar terreno', icone: 'axe', custo: 300, texto: 'Corta o mato e retira o combustível.' },
    autoctone: { nome: 'Plantar autóctones', icone: 'sprout', custo: 900, texto: 'Substitui o que lá está por carvalho, sobreiro e medronheiro.' },
    eucalipto: { nome: 'Plantar eucalipto', icone: 'trending-up', custo: 400, texto: 'Pronto a vender em 3 anos por 1 400 €.' },
    colher: { nome: 'Cortar e vender', icone: 'coins', custo: 0, texto: 'Vende a madeira. A parcela fica em mato.' },
  };
  const VENDA = { eucalipto: { idade: 3, valor: 1400 }, pinhal: { idade: 4, valor: 900 } };

  const TEMPO = [
    { id: 'ameno', nome: 'Verão ameno', mult: 0.55, icone: 'cloud-sun' },
    { id: 'normal', nome: 'Verão normal', mult: 1, icone: 'sun' },
    { id: 'seco', nome: 'Verão seco', mult: 1.45, icone: 'thermometer-sun' },
    { id: 'calor', nome: 'Onda de calor', mult: 2, icone: 'flame' },
  ];

  // Classes de perigo de incêndio usadas pelo IPMA
  const CLASSES = [
    { ate: 20, nome: 'Reduzido', cor: '#6E9F4B' },
    { ate: 40, nome: 'Moderado', cor: '#D9B92E' },
    { ate: 60, nome: 'Elevado', cor: '#E3872D' },
    { ate: 80, nome: 'Muito elevado', cor: '#D2461B' },
    { ate: 101, nome: 'Máximo', cor: '#8A1C1C' },
  ];
  const classeDe = r => CLASSES.find(c => r < c.ate);

  const INSIGNIAS = [
    { id: 'guardiao', nome: 'Guardião da Floresta', icone: 'trees', principal: true, texto: 'Acaba os dez anos com resiliência ecológica de 70% ou mais, sem deixar a aldeia arder.' },
    { id: 'estrategista', nome: 'Estrategista Preventivo', icone: 'shield-check', principal: true, texto: 'Entra em três verões seguidos com o risco de incêndio abaixo de 40%.' },
    { id: 'aldeia', nome: 'Aldeia a Salvo', icone: 'house', texto: 'Dez verões sem o fogo entrar na aldeia.' },
    { id: 'semeador', nome: 'Semeador', icone: 'sprout', texto: 'Planta folhosas autóctones em 4 parcelas diferentes.' },
  ];

  // ---------- parcelas ----------
  const PARCELAS = [
    { nome: 'Encosta Norte', x: 165, y: 115, tipo: 'ardido', ardidoDe: 'eucalipto', idade: 0, comb: 0 },
    { nome: 'Cumeada', x: 430, y: 95, tipo: 'eucalipto', idade: 2, comb: 55 },
    { nome: 'Cabeço Alto', x: 715, y: 105, tipo: 'pinhal', idade: 5, comb: 45 },
    { nome: 'Portela', x: 895, y: 250, tipo: 'eucalipto', idade: 3, comb: 60 },
    { nome: 'Mata Velha', x: 610, y: 265, tipo: 'autoctone', idade: 7, comb: 20 },
    { nome: 'Outeiro', x: 300, y: 285, tipo: 'mato', idade: 0, comb: 70 },
    { nome: 'Lameiro', x: 95, y: 380, tipo: 'eucalipto', idade: 1, comb: 40 },
    { nome: 'Souto', x: 415, y: 430, tipo: 'autoctone', idade: 2, comb: 25 },
    { nome: 'Várzea', x: 640, y: 465, tipo: 'aldeia', idade: 0, comb: 0 },
    { nome: 'Chão do Moinho', x: 865, y: 480, tipo: 'mato', idade: 0, comb: 50 },
    { nome: 'Vale do Ribeiro', x: 225, y: 575, tipo: 'pinhal', idade: 3, comb: 50 },
    { nome: 'Barroca', x: 500, y: 615, tipo: 'eucalipto', idade: 3, comb: 65 },
    { nome: 'Tapada', x: 790, y: 630, tipo: 'mato', idade: 0, comb: 35 },
  ];
  const MAPA_W = 1000, MAPA_H = 680;
  const TORRE_MAPA = { x: 700, y: 330 };

  // ---------- estado ----------
  let E;
  function novoEstado() {
    return {
      ano: 1,
      orcamento: ORCAMENTO_INICIAL,
      zonas: PARCELAS.map((p, id) => ({ ...p, id, agiu: null, desfazer: null })),
      previsao: null,
      historico: [],
      insignias: new Set(),
      serieBaixa: 0,
      plantadas: new Set(),
      aldeiaArdeu: false,
      totalArdido: 0,
      selecionada: null,
      vista: 'vegetacao',
      aArder: new Set(),
      acabou: false,
      ocupado: false,
    };
  }

  // ---------- geometria do mapa ----------
  const delaunay = d3.Delaunay.from(PARCELAS, d => d.x, d => d.y);
  const voronoi = delaunay.voronoi([0, 0, MAPA_W, MAPA_H]);
  const vizinhos = PARCELAS.map((_, i) => [...voronoi.neighbors(i)]);

  // fronteiras orgânicas: cada aresta partilhada é deslocada da mesma forma dos dois lados
  function hash(a, b, c, d) {
    let h = 2166136261;
    for (const v of [a, b, c, d]) { h ^= Math.round(v * 10); h = Math.imul(h, 16777619); }
    return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
  }
  function poligono(i) {
    const cel = voronoi.cellPolygon(i);
    const pts = [];
    for (let k = 0; k < cel.length - 1; k++) {
      const a = cel[k], b = cel[k + 1];
      const trocar = a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
      let seg = arestaSinuosaOrdenada(trocar ? b : a, trocar ? a : b);
      if (trocar) seg = seg.slice().reverse();
      pts.push(...seg.slice(0, -1));
    }
    return pts;
  }
  // devolve todos os pontos de p até q (inclusive), já deslocados
  function arestaSinuosaOrdenada(p, q) {
    const noBordo = (Math.abs(p[0] - q[0]) < 0.01 && (p[0] <= 0.01 || p[0] >= MAPA_W - 0.01)) ||
      (Math.abs(p[1] - q[1]) < 0.01 && (p[1] <= 0.01 || p[1] >= MAPA_H - 0.01));
    if (noBordo) return [p, q];
    const r = hash(p[0], p[1], q[0], q[1]);
    let pts = [p, q];
    for (let nivel = 0; nivel < 3; nivel++) {
      const novos = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const d = (r() - 0.5) * len * 0.3;
        novos.push([(x1 + x2) / 2 + (-(y2 - y1) / len) * d, (y1 + y2) / 2 + ((x2 - x1) / len) * d], pts[i]);
      }
      pts = novos;
    }
    return pts;
  }
  const poligonos = PARCELAS.map((_, i) => poligono(i));
  const areas = poligonos.map(p => Math.abs(d3.polygonArea(p)));
  const centroides = poligonos.map(p => d3.polygonCentroid(p));
  const caminhoDe = pts => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';

  // relevo: mais alto a norte, vale ao longo do ribeiro
  function relevo() {
    const n = 100, m = 68, v = new Float64Array(n * m);
    const ribeiro = y => 360 + 90 * Math.sin(y / 180) + y * 0.18;
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const x = i * 10, y = j * 10;
      let h = 620 - y * 0.55;
      h += 90 * Math.exp(-(((x - 715) / 170) ** 2 + ((y - 110) / 140) ** 2));
      h += 70 * Math.exp(-(((x - 170) / 160) ** 2 + ((y - 120) / 150) ** 2));
      h += 55 * Math.exp(-(((x - 870) / 140) ** 2 + ((y - 470) / 150) ** 2));
      h -= 85 * Math.exp(-(((x - ribeiro(y)) / 70) ** 2));
      h += 14 * Math.sin(x / 47 + y / 83) + 9 * Math.sin(x / 23 - y / 37);
      v[j * n + i] = h;
    }
    return { n, m, v };
  }

  // ---------- métricas ----------
  const INFLAMAVEL = new Set(['mato', 'eucalipto', 'pinhal']);
  function riscoZona(z, zonas = E.zonas) {
    if (z.tipo === 'aldeia') {
      const exp = vizinhos[z.id].reduce((s, j) => s + zonas[j].comb, 0) / vizinhos[z.id].length;
      return clamp(12 + exp * 0.35, 0, 99);
    }
    const base = { mato: 50, eucalipto: 68, pinhal: 56, autoctone: z.idade < 3 ? 38 : 22, ardido: 10 }[z.tipo];
    let continuidade = 0;
    if (INFLAMAVEL.has(z.tipo)) {
      for (const j of vizinhos[z.id]) { const o = zonas[j]; if (INFLAMAVEL.has(o.tipo) && o.comb > 45) continuidade += 4; }
    }
    return clamp(base + z.comb * 0.32 + Math.min(12, continuidade), 2, 99);
  }
  function resilienciaZona(z) {
    switch (z.tipo) {
      case 'mato': return 28 - z.comb * 0.1;
      case 'eucalipto': return 10;
      case 'pinhal': return 34;
      case 'autoctone': return Math.min(95, 42 + z.idade * 6);
      case 'ardido': return 4;
      default: return null;
    }
  }
  function metricas(zonas = E.zonas) {
    let a = 0, r = 0, res = 0;
    for (const z of zonas) {
      if (z.tipo === 'aldeia') continue;
      const w = areas[z.id];
      a += w; r += riscoZona(z, zonas) * w; res += resilienciaZona(z) * w;
    }
    return { risco: r / a, resiliencia: res / a };
  }

  // ---------- ações ----------
  function acoesPara(z) {
    if (z.tipo === 'aldeia') return [];
    const lista = [];
    if (z.comb > 0 && z.tipo !== 'ardido') lista.push('limpar');
    if (VENDA[z.tipo]) lista.push('colher');
    if (z.tipo !== 'autoctone') lista.push('autoctone');
    if (z.tipo !== 'eucalipto') lista.push('eucalipto');
    return lista;
  }
  function podeAcao(z, id) {
    if (E.acabou || E.ocupado) return { ok: false, porque: '' };
    if (z.agiu === E.ano) return { ok: false, porque: 'Já agiste nesta parcela este ano.' };
    if (id === 'colher') {
      const v = VENDA[z.tipo];
      if (z.idade < v.idade) return { ok: false, porque: `Só dá para vender com ${v.idade} anos (faltam ${v.idade - z.idade}).` };
      return { ok: true };
    }
    if (ACOES[id].custo > E.orcamento) return { ok: false, porque: `Faltam ${euros(ACOES[id].custo - E.orcamento)}.` };
    return { ok: true };
  }
  function aplicar(z, id) {
    const antes = { tipo: z.tipo, idade: z.idade, comb: z.comb, ardidoDe: z.ardidoDe };
    let dinheiro = -ACOES[id].custo;
    if (id === 'limpar') z.comb = 0;
    if (id === 'autoctone') Object.assign(z, { tipo: 'autoctone', idade: 0, comb: 5 });
    if (id === 'eucalipto') Object.assign(z, { tipo: 'eucalipto', idade: 0, comb: 5 });
    if (id === 'colher') { dinheiro = VENDA[z.tipo].valor; Object.assign(z, { tipo: 'mato', idade: 0, comb: 35 }); }
    z.ardidoDe = null;
    return { antes, dinheiro };
  }
  function simular(z, id) {
    const copia = E.zonas.map(o => ({ ...o }));
    const alvo = copia[z.id];
    const { dinheiro } = aplicar(alvo, id);
    return { ...metricas(copia), dinheiro };
  }
  function agir(z, id) {
    if (!podeAcao(z, id).ok) return;
    const { antes, dinheiro } = aplicar(z, id);
    E.orcamento += dinheiro;
    z.agiu = E.ano;
    if (id === 'autoctone') { E.plantadas.add(z.id); if (E.plantadas.size >= 4) ganhar('semeador'); }
    z.desfazer = { antes, dinheiro, id };
    registar(`${ACOES[id].nome}: ${z.nome}${dinheiro ? ` (${dinheiro > 0 ? '+' : ''}${euros(dinheiro)})` : ''}.`);
    atualizarTudo();
    animarNumero('orcamento', dinheiro);
  }
  function desfazer(z) {
    if (!z.desfazer || z.agiu !== E.ano) return;
    Object.assign(z, z.desfazer.antes);
    E.orcamento -= z.desfazer.dinheiro;
    registar(`Anulado: ${ACOES[z.desfazer.id].nome.toLowerCase()} em ${z.nome}.`);
    z.agiu = null; z.desfazer = null;
    atualizarTudo();
  }

  // ---------- tempo ----------
  function sortearPrevisao(ano) {
    const aquecimento = (ano - 1) * 0.025;       // os verões pioram com os anos
    const pesos = [0.27 - aquecimento, 0.4 - aquecimento * 0.4, 0.23 + aquecimento * 0.6, 0.1 + aquecimento * 0.8];
    let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return i; }
    return 1;
  }

  // ---------- verão ----------
  async function verao() {
    if (E.ocupado || E.acabou) return;
    E.ocupado = true;
    E.selecionada = null;
    $('#delta-orcamento').textContent = '';
    atualizarTudo();

    const antes = metricas();
    const orcAntes = E.orcamento;
    E.serieBaixa = antes.risco < 40 ? E.serieBaixa + 1 : 0;
    if (E.serieBaixa >= 3) ganhar('estrategista');

    // a previsão acerta quase sempre; às vezes o verão sai pior
    let ti = E.previsao;
    if (Math.random() < 0.2 && ti < 3) ti += 1;
    const tempo = TEMPO[ti];

    // ignições e propagação em vagas
    const riscos = E.zonas.map(z => riscoZona(z));
    const ardeu = new Set(), resistiu = new Set();
    let vaga = [];
    for (const z of E.zonas) {
      if (z.tipo === 'ardido') continue;
      const pr = z.tipo === 'aldeia' ? 0.02 : (riscos[z.id] / 100) ** 2 * 0.2 * tempo.mult;
      if (Math.random() < pr) vaga.push(z.id);
    }
    const vagas = [];
    const visto = new Set(vaga);
    while (vaga.length) {
      vagas.push(vaga);
      const prox = [];
      for (const id of vaga) {
        for (const j of vizinhos[id]) {
          if (visto.has(j)) continue;
          const o = E.zonas[j];
          if (o.tipo === 'ardido') continue;
          let pr = (riscos[j] / 100) * 0.52 * Math.sqrt(tempo.mult);
          if (o.comb < 15) pr *= 0.4;          // terreno limpo trava o fogo
          if (Math.random() < clamp(pr, 0, 0.95)) { visto.add(j); prox.push(j); }
        }
      }
      vaga = prox;
    }

    // animação no mapa
    $('#resumo-ano').textContent = `${tempo.nome}. ${vagas.length ? 'Há fogo na serra.' : 'A serra aguenta.'}`;
    for (const v of vagas) {
      for (const id of v) E.aArder.add(id);
      desenharZonas();
      atualizarJanela(true);
      await espera(750);
    }
    await espera(vagas.length ? 700 : 300);

    // consequências
    for (const v of vagas) for (const id of v) {
      const z = E.zonas[id];
      if (z.tipo === 'aldeia') {
        E.orcamento -= CUSTO_ALDEIA; E.aldeiaArdeu = true; ardeu.add(id); continue;
      }
      if (z.tipo === 'autoctone' && z.idade >= 3 && Math.random() < 0.5) {
        z.idade = Math.max(3, z.idade - 2); z.comb = 0; resistiu.add(id); continue;
      }
      ardeu.add(id);
      Object.assign(z, { ardidoDe: z.tipo, tipo: 'ardido', idade: 0, comb: 0, ardeuNoAno: E.ano });
    }
    E.aArder.clear();
    E.totalArdido += [...ardeu].filter(id => E.zonas[id].tipo !== 'aldeia').length;

    // o ano avança: crescimento, rendimentos, regeneração
    let rendimento = APOIO_ANUAL;
    let cortica = 0;
    for (const z of E.zonas) {
      if (z.tipo === 'autoctone' && z.idade >= 4) cortica += 150;
      if (z.tipo === 'ardido' && z.ardeuNoAno !== E.ano) {
        if (z.ardidoDe === 'eucalipto') Object.assign(z, { tipo: 'eucalipto', idade: 0, comb: 20, ardidoDe: null });
        else Object.assign(z, { tipo: 'mato', idade: 0, comb: 25, ardidoDe: null });
        continue;
      }
      if (z.tipo !== 'ardido' && z.tipo !== 'aldeia') {
        z.idade += 1;
        z.comb = clamp(z.comb + TIPOS[z.tipo].crescimento, 0, 100);
      }
    }
    rendimento += cortica;
    E.orcamento += rendimento;
    const depois = metricas();

    const relatorio = {
      ano: E.ano, tempo, previsto: TEMPO[E.previsao], vagas, ardeu: [...ardeu], resistiu: [...resistiu],
      apoio: APOIO_ANUAL, cortica, antes, depois, orcAntes, orcDepois: E.orcamento,
      aldeia: ardeu.has(E.zonas.findIndex(z => z.tipo === 'aldeia')),
    };
    E.historico.push({ ano: E.ano, ardeu: ardeu.size, risco: depois.risco, resiliencia: depois.resiliencia, tempo: tempo.id });
    registar(ardeu.size
      ? `Ano ${E.ano}, ${tempo.nome.toLowerCase()}: arderam ${nomes([...ardeu])}.`
      : `Ano ${E.ano}, ${tempo.nome.toLowerCase()}: nenhuma parcela ardeu.`, ardeu.size ? 'fogo' : 'calmo');
    if (resistiu.size) registar(`As folhosas de ${nomes([...resistiu])} aguentaram o fogo.`, 'bom');

    E.ano += 1;
    if (E.ano > ANOS) {
      E.acabou = true;
      const m = metricas();
      if (m.resiliencia >= 70 && !E.aldeiaArdeu) ganhar('guardiao');
      if (!E.aldeiaArdeu) ganhar('aldeia');
    } else {
      E.previsao = sortearPrevisao(E.ano);
    }
    E.ocupado = false;
    for (const z of E.zonas) z.desfazer = null;
    atualizarTudo();
    atualizarJanela(false);
    mostrarRelatorio(relatorio);
  }
  const nomes = ids => {
    const n = ids.map(id => E.zonas[id].nome);
    return n.length > 1 ? n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1] : n[0];
  };

  // ---------- insígnias ----------
  function ganhar(id) {
    if (E.insignias.has(id)) return;
    E.insignias.add(id);
    const ins = INSIGNIAS.find(i => i.id === id);
    registar(`Insígnia conquistada: ${ins.nome}.`, 'bom');
    avisar(ins);
    desenharInsignias(id);
  }
  function emblema(ins, ganho) {
    return `<span class="emblema ${ganho ? 'ganho' : ''} ${ins.principal ? 'principal' : ''}" aria-hidden="true">
      <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30"/><circle cx="32" cy="32" r="25.5" class="costura"/></svg>
      <i data-lucide="${ins.icone}"></i></span>`;
  }
  function desenharInsignias(nova) {
    $('#insignias').innerHTML = INSIGNIAS.map(ins => {
      const g = E.insignias.has(ins.id);
      return `<li class="${g ? 'ganha' : ''} ${nova === ins.id ? 'nova' : ''}">
        ${emblema(ins, g)}
        <div><strong>${ins.nome}</strong><span>${g ? 'Conquistada.' : ins.texto}</span></div></li>`;
    }).join('');
    lucide.createIcons();
  }
  let avisoTimer;
  function avisar(ins) {
    const el = $('#aviso');
    el.innerHTML = `${emblema(ins, true)}<div><strong>${ins.nome}</strong><span>${ins.texto}</span></div>`;
    lucide.createIcons();
    el.classList.add('visivel');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => el.classList.remove('visivel'), 5200);
  }

  // ---------- registo ----------
  function registar(texto, tipo = '') {
    const li = document.createElement('li');
    li.className = tipo;
    li.innerHTML = `<span class="ano-reg">Ano ${Math.min(E.ano, ANOS)}</span> ${texto}`;
    $('#registo').prepend(li);
  }

  // ---------- desenho do mapa ----------
  const mapa = d3.select('#mapa');
  function padroes(defs) {
    const p = (id, cor, desenho, t = 22) => {
      const pat = defs.append('pattern').attr('id', 'p-' + id).attr('width', t).attr('height', t).attr('patternUnits', 'userSpaceOnUse');
      pat.append('rect').attr('width', t).attr('height', t).attr('fill', cor);
      desenho(pat);
    };
    // símbolos da cartografia militar: resinosas em triângulo, folhosas em círculo, mato em pontos
    p('mato', TIPOS.mato.cor, g => {
      for (const [x, y] of [[4, 5], [14, 9], [8, 17], [19, 19]]) g.append('circle').attr('cx', x).attr('cy', y).attr('r', 1.2).attr('fill', TIPOS.mato.tinta);
      g.append('path').attr('d', 'M15 3l2 3M2 13l2 3').attr('stroke', TIPOS.mato.tinta).attr('stroke-width', 1);
    });
    p('eucalipto', TIPOS.eucalipto.cor, g => {
      for (const [x, y] of [[5, 9], [16, 20]]) {
        g.append('path').attr('d', `M${x} ${y}v-6`).attr('stroke', TIPOS.eucalipto.tinta).attr('stroke-width', 1.2);
        g.append('ellipse').attr('cx', x).attr('cy', y - 7.5).attr('rx', 2).attr('ry', 2.8).attr('fill', TIPOS.eucalipto.tinta);
      }
    });
    p('pinhal', TIPOS.pinhal.cor, g => {
      for (const [x, y] of [[6, 9], [17, 20]]) g.append('path').attr('d', `M${x} ${y - 6}l3.5 6h-7z`).attr('fill', TIPOS.pinhal.tinta);
    });
    p('autoctone', TIPOS.autoctone.cor, g => {
      for (const [x, y] of [[6, 7], [17, 17]]) g.append('circle').attr('cx', x).attr('cy', y).attr('r', 3.4).attr('fill', 'none').attr('stroke', TIPOS.autoctone.tinta).attr('stroke-width', 1.3);
    });
    p('ardido', TIPOS.ardido.cor, g => {
      g.append('path').attr('d', 'M0 22L22 0M-5 5L5 -5M17 27L27 17').attr('stroke', TIPOS.ardido.tinta).attr('stroke-width', 2);
      g.append('circle').attr('cx', 15).attr('cy', 14).attr('r', 1).attr('fill', '#C9774A');
    }, 11);
    p('aldeia', TIPOS.aldeia.cor, () => {});
    // grão do papel
    const f = defs.append('filter').attr('id', 'papel').attr('x', 0).attr('y', 0).attr('width', 1).attr('height', 1);
    f.append('feTurbulence').attr('type', 'fractalNoise').attr('baseFrequency', 0.9).attr('numOctaves', 2).attr('seed', 4);
    f.append('feColorMatrix').attr('values', '0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0.06 0');
    f.append('feComposite').attr('in2', 'SourceGraphic').attr('operator', 'in');
  }

  let gZonas, gRotulos, gFogo;
  function construirMapa() {
    const defs = mapa.append('defs');
    padroes(defs);
    mapa.append('rect').attr('class', 'papel').attr('width', MAPA_W).attr('height', MAPA_H);

    gZonas = mapa.append('g').attr('class', 'zonas');

    // curvas de nível: mestras mais grossas, como nas cartas
    const { n, m, v } = relevo();
    const lim = d3.range(260, 760, 22);
    const curvas = d3.contours().size([n, m]).thresholds(lim)(v);
    const escala = d3.geoTransform({ point(x, y) { this.stream.point(x * 10 - 5, y * 10 - 5); } });
    mapa.append('g').attr('class', 'curvas').selectAll('path').data(curvas).join('path')
      .attr('d', d3.geoPath(escala))
      .attr('class', (_, i) => i % 5 === 0 ? 'mestra' : '');

    // quadrícula quilométrica
    const q = mapa.append('g').attr('class', 'quadricula');
    for (let x = 100; x < MAPA_W; x += 100) {
      q.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', MAPA_H);
      q.append('text').attr('x', x + 3).attr('y', 12).text(40 + x / 100);
    }
    for (let y = 100; y < MAPA_H; y += 100) {
      q.append('line').attr('y1', y).attr('y2', y).attr('x1', 0).attr('x2', MAPA_W);
      q.append('text').attr('x', 4).attr('y', y - 4).text(212 - y / 100);
    }

    // ribeiro e afluente
    const linha = d3.line().curve(d3.curveCatmullRom.alpha(0.5));
    const rio = mapa.append('g').attr('class', 'ribeiro');
    rio.append('path').attr('id', 'ribeiro').attr('d', linha([[372, 150], [360, 230], [398, 330], [445, 405], [480, 480], [520, 560], [560, 640], [585, 690]]));
    rio.append('path').attr('class', 'afluente').attr('d', linha([[830, 360], [760, 410], [690, 440], [610, 520], [540, 590]]));
    rio.append('text').attr('class', 'nome-rio').append('textPath').attr('href', '#ribeiro').attr('startOffset', '38%').text('Ribeiro da Vigia');

    gFogo = mapa.append('g').attr('class', 'fogo-camada');
    gRotulos = mapa.append('g').attr('class', 'rotulos');

    // aldeia: casas como quadrados pretos e a igreja com a cruz
    const iA = PARCELAS.findIndex(p => p.tipo === 'aldeia');
    const [ax, ay] = [PARCELAS[iA].x, PARCELAS[iA].y];
    const casas = mapa.append('g').attr('class', 'casas');
    for (const [dx, dy, s] of [[-30, -6, 7], [-18, -16, 6], [-6, -4, 8], [8, -18, 6], [18, -2, 7], [-22, 10, 6], [4, 12, 6], [28, 14, 5]]) {
      casas.append('rect').attr('x', ax + dx).attr('y', ay + dy - 22).attr('width', s).attr('height', s);
    }
    casas.append('path').attr('d', `M${ax + 40} ${ay - 34}v12M${ax + 36} ${ay - 29}h8`).attr('class', 'cruz');

    // o posto de vigia: vértice com triângulo
    const t = mapa.append('g').attr('class', 'posto').attr('transform', `translate(${TORRE_MAPA.x},${TORRE_MAPA.y})`);
    t.append('path').attr('d', 'M0 -11L10 7H-10Z');
    t.append('circle').attr('r', 2.2);
    t.append('text').attr('x', 14).attr('y', 5).text('Posto de vigia (estás aqui)');

    mapa.append('rect').attr('class', 'grao').attr('width', MAPA_W).attr('height', MAPA_H).attr('filter', 'url(#papel)');

    // parcelas
    gZonas.selectAll('path').data(E.zonas).join('path')
      .attr('d', z => caminhoDe(poligonos[z.id]))
      .attr('class', 'zona')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .on('click', (_, z) => selecionar(z.id))
      .on('keydown', (ev, z) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selecionar(z.id); }
      });

    const r = gRotulos.selectAll('g').data(E.zonas).join('g')
      .attr('transform', z => {
        const [cx, cy] = z.tipo === 'aldeia' ? [PARCELAS[z.id].x, PARCELAS[z.id].y + 10] : centroides[z.id];
        return `translate(${cx.toFixed(1)},${cy.toFixed(1)})`;
      });
    r.append('text').attr('class', 'nome').attr('text-anchor', 'middle');
    r.append('text').attr('class', 'detalhe').attr('text-anchor', 'middle').attr('y', 17);
    r.append('circle').attr('class', 'feito').attr('r', 5).attr('cy', -22);
  }

  function desenharZonas() {
    const risco = E.vista === 'risco';
    gZonas.selectAll('path')
      .attr('fill', z => risco ? classeDe(riscoZona(z)).cor : `url(#p-${z.tipo})`)
      .attr('fill-opacity', risco ? 0.72 : 1)
      .classed('selecionada', z => E.selecionada === z.id)
      .classed('agiu', z => z.agiu === E.ano)
      .attr('aria-pressed', z => E.selecionada === z.id)
      .attr('aria-label', z => `${z.nome}: ${TIPOS[z.tipo].nome}, risco ${pct(riscoZona(z))}`);
    gZonas.selectAll('path.selecionada').raise();

    gRotulos.selectAll('g').each(function (z) {
      const g = d3.select(this);
      g.select('.nome').text(z.nome);
      g.select('.detalhe').text(risco ? `${pct(riscoZona(z))} ${classeDe(riscoZona(z)).nome.toLowerCase()}`
        : z.tipo === 'aldeia' ? '' : detalheCurto(z));
      g.classed('escuro', !risco && z.tipo === 'ardido');
      g.classed('agiu', z.agiu === E.ano);
    });

    // fogo
    const ids = [...E.aArder];
    gFogo.selectAll('path').data(ids, d => d).join(
      enter => enter.append('path').attr('class', 'a-arder').attr('d', id => caminhoDe(poligonos[id])),
      update => update,
      exit => exit.remove(),
    );
  }
  function detalheCurto(z) {
    if (z.tipo === 'ardido') return 'ardida';
    const idade = z.tipo === 'mato' ? '' : `${z.idade} ${z.idade === 1 ? 'ano' : 'anos'}`;
    return [TIPOS[z.tipo].nome.split(' ')[0].toLowerCase(), idade].filter(Boolean).join(', ');
  }

  function desenharLegenda() {
    const tipos = ['eucalipto', 'pinhal', 'autoctone', 'mato', 'ardido'];
    $('#legenda').innerHTML = E.vista === 'risco'
      ? CLASSES.map(c => `<li><span class="amostra" style="background:${c.cor}"></span>${c.nome}</li>`).join('')
      : tipos.map(t => `<li><svg class="amostra" viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" fill="url(#p-${t})"/></svg>${TIPOS[t].nome}</li>`).join('');
  }

  // ---------- caderno de campo ----------
  function selecionar(id) {
    if (E.ocupado) return;
    E.selecionada = E.selecionada === id ? null : id;
    desenharZonas();
    desenharCaderno();
    if (E.selecionada !== null && matchMedia('(max-width: 900px)').matches) {
      $('#caderno').scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function linhaDelta(nome, antes, depois, melhorSeSobe, formato = pct) {
    const d = Math.round(depois) - Math.round(antes);
    if (!d) return '';
    const bom = melhorSeSobe ? d > 0 : d < 0;
    return `<span class="${bom ? 'bom' : 'mau'}">${nome} ${d > 0 ? '+' : ''}${formato === pct ? d + ' pts' : formato(d)}</span>`;
  }

  function desenharCaderno() {
    const el = $('#caderno');
    if (E.acabou) {
      el.innerHTML = fimHTML();
      lucide.createIcons();
      $('#recomecar-caderno')?.addEventListener('click', recomecar);
      return;
    }
    if (E.selecionada === null) {
      el.innerHTML = `
        <h3>Caderno de campo</h3>
        <p class="lead">Escolhe uma parcela no mapa para ver o que lá cresce e o que podes fazer.</p>
        <ul class="regras">
          <li><i data-lucide="calendar" aria-hidden="true"></i><span>Cada ano podes fazer uma ação por parcela. Depois vem o verão e o fogo decide o resto.</span></li>
          <li><i data-lucide="trending-up" aria-hidden="true"></i><span>O eucalipto paga depressa, mas sobe o risco e contamina as parcelas vizinhas.</span></li>
          <li><i data-lucide="sprout" aria-hidden="true"></i><span>As folhosas autóctones custam mais e demoram, mas seguram o solo e resistem ao fogo.</span></li>
          <li><i data-lucide="axe" aria-hidden="true"></i><span>Terreno limpo trava a propagação para as parcelas ao lado.</span></li>
        </ul>
        <p class="meta">Objetivo: chegar ao ano 10 com a serra de pé, a aldeia intacta e dinheiro em caixa.</p>`;
      lucide.createIcons();
      return;
    }
    const z = E.zonas[E.selecionada];
    const t = TIPOS[z.tipo];
    const r = riscoZona(z), c = classeDe(r);
    const res = resilienciaZona(z);
    const m = metricas();
    const acoes = acoesPara(z);

    el.innerHTML = `
      <div class="ficha-topo">
        <div>
          <h3>${z.nome}</h3>
          <p class="tipo"><svg class="amostra" viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" fill="url(#p-${z.tipo})"/></svg>${z.tipo === 'aldeia' ? 'Aldeia da Várzea' : t.nome}</p>
        </div>
        <button type="button" class="fechar" aria-label="Fechar ficha"><i data-lucide="x" aria-hidden="true"></i></button>
      </div>
      <p class="descricao">${t.texto}</p>
      <dl class="dados">
        ${z.tipo !== 'aldeia' && z.tipo !== 'mato' && z.tipo !== 'ardido' ? `<div><dt>Idade</dt><dd>${z.idade} ${z.idade === 1 ? 'ano' : 'anos'}</dd></div>` : ''}
        ${z.tipo !== 'aldeia' ? `<div><dt>Combustível</dt><dd><span class="mini"><span style="width:${z.comb}%"></span></span>${pct(z.comb)}</dd></div>` : ''}
        <div><dt>Risco</dt><dd><span class="ponto" style="background:${c.cor}"></span>${pct(r)}, ${c.nome.toLowerCase()}</dd></div>
        ${res !== null ? `<div><dt>Resiliência</dt><dd>${pct(res)}</dd></div>` : ''}
      </dl>
      ${z.tipo === 'aldeia' ? `<p class="nota">O risco da aldeia depende do combustível nas parcelas à volta: ${nomes(vizinhos[z.id])}.</p>` : ''}
      ${acoes.length ? `<h4>O que fazer este ano</h4><ul class="acoes">${acoes.map(id => {
        const a = ACOES[id];
        const pode = podeAcao(z, id);
        const s = simular(z, id);
        const dinheiro = id === 'colher' ? VENDA[z.tipo].valor : -a.custo;
        const efeitos = [
          linhaDelta('Risco', m.risco, s.risco, false),
          linhaDelta('Resiliência', m.resiliencia, s.resiliencia, true),
        ].filter(Boolean).join('');
        return `<li><button type="button" class="acao" data-acao="${id}" ${pode.ok ? '' : 'disabled aria-disabled="true"'}>
          <i data-lucide="${a.icone}" aria-hidden="true"></i>
          <span class="acao-corpo">
            <span class="acao-nome">${a.nome}</span>
            <span class="acao-texto">${id === 'colher' ? `Vende por ${euros(VENDA[z.tipo].valor)}. A parcela fica em mato.` : a.texto}</span>
            ${efeitos ? `<span class="efeitos">${efeitos}</span>` : ''}
            ${!pode.ok && pode.porque ? `<span class="porque">${pode.porque}</span>` : ''}
          </span>
          <span class="acao-custo ${dinheiro > 0 ? 'ganho' : ''}">${dinheiro > 0 ? '+' : dinheiro < 0 ? '−' : ''}${euros(Math.abs(dinheiro))}</span>
        </button></li>`;
      }).join('')}</ul>` : ''}
      ${z.agiu === E.ano && z.desfazer ? `<button type="button" class="botao secundario" id="desfazer"><i data-lucide="undo-2" aria-hidden="true"></i>Anular ${ACOES[z.desfazer.id].nome.toLowerCase()}</button>` : ''}
    `;
    lucide.createIcons();
    el.querySelector('.fechar').addEventListener('click', () => selecionar(z.id));
    el.querySelectorAll('.acao').forEach(b => b.addEventListener('click', () => agir(z, b.dataset.acao)));
    el.querySelector('#desfazer')?.addEventListener('click', () => desfazer(z));
  }

  // ---------- instrumentos ----------
  function construirMostrador() {
    const g = d3.select('#arco-classes');
    const arco = d3.arc().innerRadius(40).outerRadius(50);
    CLASSES.forEach((c, i) => {
      g.append('path').attr('transform', 'translate(60,62)').attr('fill', c.cor)
        .attr('d', arco({ startAngle: -Math.PI / 2 + i * Math.PI / 5 + 0.015, endAngle: -Math.PI / 2 + (i + 1) * Math.PI / 5 - 0.015 }));
    });
  }
  function animarNumero(chave, delta) {
    const el = $('#delta-orcamento');
    if (chave !== 'orcamento' || !delta) return;
    el.textContent = `${delta > 0 ? '+' : '−'}${euros(Math.abs(delta))}`;
    el.className = 'delta ' + (delta > 0 ? 'bom' : 'mau');
    el.classList.remove('pulso'); void el.offsetWidth; el.classList.add('pulso');
  }
  function desenharInstrumentos() {
    const m = metricas();
    const c = classeDe(m.risco);
    $('#v-risco').textContent = pct(m.risco);
    $('#classe-risco').textContent = c.nome;
    $('#classe-risco').style.setProperty('--c', c.cor);
    $('#agulha').style.transform = `rotate(${(m.risco / 100) * 180 - 90}deg)`;
    $('#v-orcamento').textContent = euros(E.orcamento);
    $('#v-resiliencia').textContent = pct(m.resiliencia);
    $('#b-resiliencia').style.width = `${m.resiliencia}%`;
    $('#m-orcamento').classList.toggle('apertado', E.orcamento < 300);

    const ano = Math.min(E.ano, ANOS);
    $('#ano-titulo').textContent = E.acabou ? 'Fim do turno' : `Ano ${ano} de ${ANOS}`;
    $('#anos').innerHTML = Array.from({ length: ANOS }, (_, i) => {
      const h = E.historico[i];
      const estado = h ? (h.ardeu ? 'ardeu' : 'limpo') : i + 1 === E.ano ? 'atual' : '';
      const titulo = h ? `Ano ${i + 1}: ${h.ardeu ? `${h.ardeu} ${h.ardeu === 1 ? 'parcela ardida' : 'parcelas ardidas'}` : 'sem fogo'}` : `Ano ${i + 1}`;
      return `<li class="${estado}" title="${titulo}"><span class="sr">${titulo}</span></li>`;
    }).join('');
    if (!E.acabou) {
      const t = TEMPO[E.previsao];
      $('#previsao').innerHTML = `<i data-lucide="${t.icone}" aria-hidden="true"></i>Previsão: ${t.nome.toLowerCase()}`;
    } else $('#previsao').textContent = '';

    const agiu = E.zonas.filter(z => z.agiu === E.ano).length;
    $('#resumo-ano').textContent = E.acabou ? 'Os dez verões passaram.'
      : agiu ? `${agiu} ${agiu === 1 ? 'parcela trabalhada' : 'parcelas trabalhadas'} este ano.` : 'Ainda não mexeste em nenhuma parcela este ano.';
    const b = $('#avancar');
    b.disabled = E.ocupado;
    b.querySelector('span').textContent = E.acabou ? 'Jogar outra vez' : E.ano === ANOS ? 'Avançar para o último verão' : 'Avançar para o verão';
  }

  // ---------- janelas da cabine ----------
  function construirJanela() {
    const s = d3.select('#janela-svg');
    const defs = s.append('defs');
    const g = defs.append('linearGradient').attr('id', 'ceu-noite').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    g.append('stop').attr('offset', 0).attr('stop-color', '#10163A');
    g.append('stop').attr('offset', 1).attr('stop-color', '#2A3360');
    const rg = defs.append('radialGradient').attr('id', 'clarao').attr('cx', 0.5).attr('cy', 1).attr('r', 0.9);
    rg.append('stop').attr('offset', 0).attr('stop-color', '#FF7A30').attr('stop-opacity', 0.85);
    rg.append('stop').attr('offset', 0.5).attr('stop-color', '#D9481C').attr('stop-opacity', 0.25);
    rg.append('stop').attr('offset', 1).attr('stop-color', '#D9481C').attr('stop-opacity', 0);
    s.append('rect').attr('width', 1200).attr('height', 110).attr('fill', 'url(#ceu-noite)');
    const r = d3.randomLcg(3);
    for (let i = 0; i < 70; i++) s.append('rect').attr('class', 'estrela').attr('x', r() * 1200).attr('y', r() * 60).attr('width', 1.3).attr('height', 1.3);
    s.append('ellipse').attr('id', 'clarao-fogo').attr('cx', 230).attr('cy', 84).attr('rx', 300).attr('ry', 90).attr('fill', 'url(#clarao)');
    const serra = (base, amp, f, cor) => {
      let d = `M0 110`;
      for (let x = 0; x <= 1200; x += 20) d += `L${x} ${base + amp * Math.sin(x / f) + amp * 0.4 * Math.sin(x / (f * 0.37))}`;
      s.append('path').attr('d', d + 'L1200 110Z').attr('fill', cor);
    };
    serra(80, 10, 140, '#1C2748');
    serra(95, 7, 90, '#0F172B');
    // caixilhos
    for (let x = 0; x <= 1200; x += 200) s.append('rect').attr('class', 'caixilho').attr('x', x - 7).attr('y', 0).attr('width', 14).attr('height', 110);
    s.append('rect').attr('class', 'caixilho').attr('x', 0).attr('y', 50).attr('width', 1200).attr('height', 5);
  }
  function atualizarJanela(fogo) {
    // no ano 1 ainda arde a Encosta Norte, vista da abertura
    const ativo = fogo || (E.ano === 1 && !E.historico.length);
    d3.select('#clarao-fogo').classed('ativo', ativo);
  }

  // ---------- relatório do verão ----------
  function mostrarRelatorio(r) {
    const d = $('#relatorio');
    const ardeuTxt = r.ardeu.length
      ? `<p>Arderam <strong>${r.ardeu.length} ${r.ardeu.length === 1 ? 'parcela' : 'parcelas'}</strong>: ${nomes(r.ardeu)}.</p>`
      : '<p>Nenhuma parcela ardeu este verão.</p>';
    const mudou = r.tempo.id !== r.previsto.id ? ` A previsão dizia ${r.previsto.nome.toLowerCase()}.` : '';
    const linhas = [
      [`Apoio anual do fundo florestal`, r.apoio],
      r.cortica ? [`Cortiça e medronho das folhosas`, r.cortica] : null,
      r.aldeia ? [`Reconstrução da aldeia`, -CUSTO_ALDEIA] : null,
    ].filter(Boolean);
    const final = E.acabou;
    d.innerHTML = `
      <form method="dialog" class="rel">
        <p class="rel-ano">${final ? 'Último verão' : `Verão do ano ${r.ano}`}</p>
        <h2 id="rel-titulo"><i data-lucide="${r.tempo.icone}" aria-hidden="true"></i>${r.tempo.nome}</h2>
        <p class="rel-sub">${r.vagas.length ? `O fogo começou em ${nomes(r.vagas[0])}${r.vagas.length > 1 ? ` e espalhou-se em ${r.vagas.length - 1} ${r.vagas.length === 2 ? 'vaga' : 'vagas'}` : ''}.` : 'Sem ignições na serra.'}${mudou}</p>
        ${ardeuTxt}
        ${r.resistiu.length ? `<p class="bom">As folhosas de ${nomes(r.resistiu)} apanharam fogo e resistiram.</p>` : ''}
        ${r.aldeia ? `<p class="mau">O fogo entrou na Várzea. Arderam casas e palheiros.</p>` : ''}
        <table class="contas">
          <tbody>${linhas.map(([n, v]) => `<tr><th scope="row">${n}</th><td class="${v > 0 ? 'bom' : 'mau'}">${v > 0 ? '+' : '−'}${euros(Math.abs(v))}</td></tr>`).join('')}</tbody>
        </table>
        <dl class="rel-metricas">
          <div><dt>Risco de incêndio</dt><dd>${pct(r.antes.risco)} <span aria-hidden="true">›</span> <strong>${pct(r.depois.risco)}</strong></dd></div>
          <div><dt>Resiliência ecológica</dt><dd>${pct(r.antes.resiliencia)} <span aria-hidden="true">›</span> <strong>${pct(r.depois.resiliencia)}</strong></dd></div>
          <div><dt>Orçamento</dt><dd>${euros(r.orcAntes)} <span aria-hidden="true">›</span> <strong>${euros(r.orcDepois)}</strong></dd></div>
        </dl>
        ${final ? '' : `<p class="rel-prox">Previsão para o próximo verão: <strong>${TEMPO[E.previsao].nome.toLowerCase()}</strong>. O mato cresceu e há mais combustível no terreno.</p>`}
        <button class="botao primario" value="ok" autofocus>${final ? 'Ver o balanço final' : `Começar o ano ${E.ano}`}</button>
      </form>`;
    lucide.createIcons();
    d.showModal();
    d.addEventListener('close', () => { if (final) mostrarFinal(); }, { once: true });
  }

  function pontuacao() {
    const m = metricas();
    return Math.max(0, Math.round(m.resiliencia * 15 + (100 - m.risco) * 10 + E.orcamento / 10 - E.totalArdido * 25 + (E.aldeiaArdeu ? 0 : 300)));
  }
  function fimHTML() {
    const m = metricas();
    const pts = pontuacao();
    let recorde = 0;
    try { recorde = +localStorage.getItem('posto-vigia-recorde') || 0; } catch (e) { /* sem armazenamento */ }
    const ganhas = INSIGNIAS.filter(i => E.insignias.has(i.id));
    const veredito = m.resiliencia >= 70 ? 'Deixas uma serra que aguenta o próximo verão.'
      : m.risco >= 60 ? 'A serra ficou pronta para arder outra vez.'
        : 'A serra está melhor do que a encontraste, mas ainda frágil.';
    return `
      <h3>Balanço de dez anos</h3>
      <p class="lead">${veredito}</p>
      <p class="pontos"><output>${pts.toLocaleString('pt-PT')}</output> pontos${pts >= recorde && recorde ? ', novo recorde' : recorde ? `. Recorde: ${recorde.toLocaleString('pt-PT')}` : ''}</p>
      <dl class="dados">
        <div><dt>Risco final</dt><dd>${pct(m.risco)}</dd></div>
        <div><dt>Resiliência final</dt><dd>${pct(m.resiliencia)}</dd></div>
        <div><dt>Em caixa</dt><dd>${euros(E.orcamento)}</dd></div>
        <div><dt>Parcelas ardidas</dt><dd>${E.totalArdido}</dd></div>
      </dl>
      <p class="meta">${ganhas.length ? `Insígnias: ${ganhas.map(i => i.nome).join(', ')}.` : 'Nenhuma insígnia desta vez.'}</p>
      <button type="button" class="botao primario" id="recomecar-caderno"><i data-lucide="rotate-ccw" aria-hidden="true"></i>Jogar outra vez</button>`;
  }
  function mostrarFinal() {
    const pts = pontuacao();
    E.selecionada = null;
    desenharCaderno();
    try {
      const rec = +localStorage.getItem('posto-vigia-recorde') || 0;
      if (pts > rec) localStorage.setItem('posto-vigia-recorde', pts);
    } catch (e) { /* sem armazenamento */ }
    $('#caderno').scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'nearest' });
  }

  function recomecar() {
    E = novoEstado();
    E.previsao = 1;
    $('#registo').innerHTML = '';
    registar('A Encosta Norte ardeu na noite de abertura. Começa o turno de dez anos.', 'fogo');
    atualizarTudo();
    desenharInsignias();
    atualizarJanela(false);
  }

  function atualizarTudo() {
    desenharZonas();
    desenharLegenda();
    desenharCaderno();
    desenharInstrumentos();
    lucide.createIcons();
  }

  // ---------- arranque ----------
  E = novoEstado();
  E.previsao = 1;
  construirMostrador();
  construirMapa();
  construirJanela();
  registar('A Encosta Norte ardeu na noite de abertura. Começa o turno de dez anos.', 'fogo');
  atualizarTudo();
  desenharInsignias();
  atualizarJanela(false);

  document.querySelectorAll('.vista').forEach(b => b.addEventListener('click', () => {
    E.vista = b.dataset.vista;
    document.querySelectorAll('.vista').forEach(o => { o.classList.toggle('ativa', o === b); o.setAttribute('aria-pressed', o === b); });
    desenharZonas(); desenharLegenda();
  }));
  $('#avancar').addEventListener('click', () => (E.acabou ? recomecar() : verao()));
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && E.selecionada !== null && !$('#relatorio').open) selecionar(E.selecionada);
  });
})();
