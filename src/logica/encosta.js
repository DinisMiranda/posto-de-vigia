/* Desafio da encosta (Floresta de produção): quatro estações para preparar o verão.
   Variáveis do Tema 2: risco de incêndio (0-100), orçamento disponível (€) e
   resiliência ecológica (0-100). Sem acaso: o resultado do verão depende só
   das escolhas, para que o utilizador perceba sempre porque é que ardeu. */
import { Delaunay } from 'd3-delaunay';

export const ORCAMENTO_INICIAL = 2500;
export const LARGURA = 900;
export const ALTURA = 520;

export const ESTACOES = [
  { id: 'outono', nome: 'Outono', texto: 'A chuva voltou. Boa altura para limpar e plantar.', crescimento: 0.6 },
  { id: 'inverno', nome: 'Inverno', texto: 'Terreno húmido: as máquinas trabalham sem risco.', crescimento: 0.3 },
  { id: 'primavera', nome: 'Primavera', texto: 'O mato cresce depressa. Última estação boa para limpar.', crescimento: 1.4 },
  { id: 'verao', nome: 'Verão', texto: 'Calor e mato seco. Limpar agora obriga a usar máquinas num dia de perigo.', crescimento: 0.8 },
];

export const TIPOS = {
  mato: { nome: 'Mato', cor: '#E4DDBC', tinta: '#857543', base: 14, inflamavel: 0.65, crescimento: 14, texto: 'Giesta, tojo e silvas. Não rende nada e junta combustível.' },
  eucalipto: { nome: 'Eucaliptal', cor: '#CFE0D7', tinta: '#4B7C6F', base: 38, inflamavel: 0.6, crescimento: 12, texto: 'Rende quando se corta e vende. Arde depressa.' },
  pinhal: { nome: 'Pinhal', cor: '#D5DEC0', tinta: '#3D5A33', base: 28, inflamavel: 0.6, crescimento: 10, texto: 'Acumula caruma e mato por baixo.' },
  autoctone: { nome: 'Folhosas autóctones', cor: '#C6DBB2', tinta: '#355F2E', base: 16, inflamavel: 0.3, crescimento: 4, texto: 'Carvalho, castanheiro e medronheiro. Retêm humidade e ardem pior.' },
  ardido: { nome: 'Área ardida', cor: '#6E6660', tinta: '#2F2926', base: 6, inflamavel: 0, crescimento: 0, texto: 'Cinza e troncos queimados.' },
};

export const ACOES = {
  limpar: { nome: 'Limpar o mato', custo: 300, texto: 'Corta o mato e retira o combustível.' },
  autoctone: { nome: 'Plantar autóctones', custo: 700, texto: 'Carvalho, castanheiro e medronheiro. Caro e sem lucro rápido.' },
  eucalipto: { nome: 'Plantar eucalipto', custo: 300, texto: 'Barato e rentável daqui a uns anos. Aumenta o risco.' },
  vender: { nome: 'Cortar e vender', custo: 0, texto: 'Vende a madeira. A parcela fica com mato e restos de corte.' },
};
export const VENDA = { eucalipto: 1100, pinhal: 800 };

const PARCELAS = [
  { nome: 'Cumeada', x: 450, y: 60, tipo: 'pinhal', comb: 40, madura: true },
  { nome: 'Cabeço', x: 180, y: 110, tipo: 'eucalipto', comb: 45, madura: true },
  { nome: 'Penedo', x: 740, y: 120, tipo: 'mato', comb: 55 },
  { nome: 'Souto', x: 330, y: 230, tipo: 'autoctone', comb: 20 },
  { nome: 'Meia Encosta', x: 600, y: 250, tipo: 'eucalipto', comb: 50, madura: true },
  { nome: 'Lameiro', x: 90, y: 300, tipo: 'mato', comb: 45 },
  { nome: 'Barroca', x: 820, y: 330, tipo: 'pinhal', comb: 50, madura: true },
  { nome: 'Chão da Estrada', x: 250, y: 430, tipo: 'mato', comb: 60, base: true },
  { nome: 'Fundo do Vale', x: 600, y: 440, tipo: 'eucalipto', comb: 35, base: true },
];

const delaunay = Delaunay.from(PARCELAS, p => p.x, p => p.y);
const voronoi = delaunay.voronoi([0, 0, LARGURA, ALTURA]);
export const VIZINHOS = PARCELAS.map((_, i) => [...voronoi.neighbors(i)]);
export const POLIGONOS = PARCELAS.map((_, i) => voronoi.cellPolygon(i));
const area = pts => Math.abs(pts.reduce((s, p, i) => {
  const q = pts[(i + 1) % pts.length];
  return s + p[0] * q[1] - q[0] * p[1];
}, 0)) / 2;
const AREAS = POLIGONOS.map(area);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function novaEncosta() {
  return {
    estacao: 0,
    orcamento: ORCAMENTO_INICIAL,
    parcelas: PARCELAS.map((p, id) => ({ id, nome: p.nome, x: p.x, y: p.y, tipo: p.tipo, comb: p.comb, madura: !!p.madura, base: !!p.base, agiu: false, maquinasNoVerao: false })),
    registo: [],
    resultado: null,
  };
}

export function riscoParcela(p, parcelas) {
  if (p.tipo === 'ardido') return TIPOS.ardido.base;
  let continuidade = 0;
  if (p.tipo !== 'autoctone') {
    for (const j of VIZINHOS[p.id]) {
      const o = parcelas[j];
      if (o.tipo !== 'autoctone' && o.tipo !== 'ardido' && o.comb > 40) continuidade += 3;
    }
  }
  const t = TIPOS[p.tipo];
  return clamp(t.base + p.comb * t.inflamavel + Math.min(10, continuidade), 2, 99);
}

export function resilienciaParcela(p) {
  return { mato: 25 - p.comb * 0.1, eucalipto: 12, pinhal: 34, autoctone: 80, ardido: 4 }[p.tipo];
}

/** Métricas da encosta, ponderadas pela área de cada parcela. */
export function metricas(parcelas) {
  let a = 0, r = 0, res = 0;
  for (const p of parcelas) {
    const w = AREAS[p.id];
    a += w; r += riscoParcela(p, parcelas) * w; res += resilienciaParcela(p) * w;
  }
  return { risco: Math.round(r / a), resiliencia: Math.round(res / a) };
}

export function acoesPossiveis(p) {
  if (p.tipo === 'ardido') return [];
  const l = [];
  if (p.comb > 0) l.push('limpar');
  if (VENDA[p.tipo] && p.madura) l.push('vender');
  if (p.tipo !== 'autoctone') l.push('autoctone');
  if (p.tipo !== 'eucalipto') l.push('eucalipto');
  return l;
}

/** Diz se uma ação pode ser feita e, se não, porquê. */
export function podeAgir(e, p, acao) {
  if (e.resultado) return { ok: false, porque: 'O verão já passou.' };
  if (p.agiu) return { ok: false, porque: 'Já mexeste nesta parcela nesta estação.' };
  if (!acoesPossiveis(p).includes(acao)) return { ok: false, porque: 'Esta ação não se aplica aqui.' };
  if (ACOES[acao].custo > e.orcamento) return { ok: false, porque: `Faltam ${ACOES[acao].custo - e.orcamento} €.` };
  return { ok: true };
}

/** Aplica uma ação e devolve a variação do orçamento (negativa = gasto). */
export function agir(e, p, acao) {
  const v = podeAgir(e, p, acao);
  if (!v.ok) throw new Error(v.porque);
  let dinheiro = -ACOES[acao].custo;
  if (acao === 'limpar') {
    p.comb = 0;
    if (ESTACOES[e.estacao].id === 'verao') p.maquinasNoVerao = true;
  }
  if (acao === 'autoctone') Object.assign(p, { tipo: 'autoctone', comb: 5, madura: false });
  if (acao === 'eucalipto') Object.assign(p, { tipo: 'eucalipto', comb: 5, madura: false });
  if (acao === 'vender') {
    dinheiro = VENDA[p.tipo];
    Object.assign(p, { tipo: 'mato', comb: 45, madura: false });
  }
  p.agiu = true;
  e.orcamento += dinheiro;
  e.registo.push({ estacao: e.estacao, parcela: p.nome, acao, dinheiro });
  return dinheiro;
}

/** Passa à estação seguinte: o mato cresce em todas as parcelas. */
export function avancarEstacao(e) {
  if (e.estacao >= ESTACOES.length - 1) return;
  const f = ESTACOES[e.estacao].crescimento;
  for (const p of e.parcelas) {
    p.agiu = false;
    p.comb = clamp(p.comb + TIPOS[p.tipo].crescimento * f, 0, 100);
  }
  e.estacao += 1;
}

/** O verão: um incêndio vindo da estrada chega às parcelas de baixo e sobe a encosta.
    Também começa um foco em cada parcela onde se usaram máquinas no verão.
    Uma parcela arde se o seu risco (com bónus de subida) passar o limiar. */
export const LIMIAR = 52;
export function simularVerao(e) {
  const p = e.parcelas;
  const riscos = p.map(x => riscoParcela(x, p));
  const focos = p.filter(x => x.base || x.maquinasNoVerao).map(x => x.id);
  const ardeu = new Set();
  const travou = new Set();
  const vagas = [];
  let vaga = [];
  for (const id of focos) {
    if (riscos[id] >= LIMIAR - 6 || p[id].maquinasNoVerao) { ardeu.add(id); vaga.push(id); } else travou.add(id);
  }
  while (vaga.length) {
    vagas.push(vaga);
    const prox = [];
    for (const id of vaga) {
      for (const j of VIZINHOS[id]) {
        if (ardeu.has(j)) continue;
        const sobe = p[j].y < p[id].y ? 8 : -4;
        if (riscos[j] + sobe >= LIMIAR) { ardeu.add(j); prox.push(j); } else travou.add(j);
      }
    }
    vaga = prox;
  }
  for (const id of ardeu) travou.delete(id);
  const antes = metricas(p);
  for (const id of ardeu) Object.assign(p[id], { tipo: 'ardido', comb: 0, madura: false });
  const depois = metricas(p);
  e.resultado = { focos, vagas, ardeu: [...ardeu], travou: [...travou], antes, depois, orcamento: e.orcamento };
  e.resultado.pontos = pontuarEncosta(e.resultado);
  return e.resultado;
}

/** Pontos do desafio (máx. 45). Não há uma única forma certa de lá chegar. */
export function pontuarEncosta({ antes, ardeu }) {
  let pts = 0;
  if (antes.risco < 50) pts += 10;
  if (antes.risco < 42) pts += 10;
  if (antes.resiliencia >= 40) pts += 10;
  if (ardeu.length <= 2) pts += 10;
  if (ardeu.length === 0) pts += 5;
  return pts;
}

export const nomeParcela = id => PARCELAS[id].nome;
