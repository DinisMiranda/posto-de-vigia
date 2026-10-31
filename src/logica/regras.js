/* Regras do sistema gamificado (GDD, capítulos 5 e 7). Funções puras, sem estado. */
import zonas from '../dados/zonas.json';
import desafios from '../dados/desafios.json';

export const ZONAS = zonas;
export const DESAFIOS = desafios;
export const zonaPorId = id => ZONAS.find(z => z.id === id);

export const PONTOS = { resposta: 10, semPistas: 5, dificil: 5 };

export const NIVEIS = [
  { id: 'visitante', nome: 'Visitante', fase: 'onboarding', pontos: 0, zonas: [] },
  { id: 'vigilante', nome: 'Vigilante', fase: 'scaffolding', pontos: 40, zonas: ['merendas'] },
  { id: 'guardiao', nome: 'Guardião', fase: 'mestria', pontos: 240, zonas: ['merendas', 'campismo', 'trilho', 'estrada', 'floresta'] },
];
export const indiceNivel = id => NIVEIS.findIndex(n => n.id === id);

export const INSIGNIAS = [
  { id: 'guardiao-floresta', nome: 'Guardião da Floresta', criterio: 'Concluir as cinco zonas do parque.', motivacao: 'Competência + Relacionamento' },
  { id: 'estrategista', nome: 'Estrategista Preventivo', criterio: 'Concluir todos os desafios de prevenção sem pistas.', motivacao: 'Competência' },
  { id: 'observador', nome: 'Observador', criterio: 'Consultar o Observatório em todas as zonas.', motivacao: 'Autonomia (exploração)' },
];

// Classes de perigo de incêndio usadas pelo IPMA
export const CLASSES = [
  { ate: 20, nome: 'Reduzido', cor: '#6E9F4B' },
  { ate: 40, nome: 'Moderado', cor: '#D9B92E' },
  { ate: 60, nome: 'Elevado', cor: '#E3872D' },
  { ate: 80, nome: 'Muito elevado', cor: '#D2461B' },
  { ate: 101, nome: 'Máximo', cor: '#8A1C1C' },
];
export const classeDe = r => CLASSES.find(c => r < c.ate);

/** Pontuação máxima de um desafio (sem modo difícil). */
export function pontosMaximos(id) {
  const d = DESAFIOS[id];
  if (d.tipo === 'cena') return d.alvos.filter(a => a.risco).length * PONTOS.resposta + PONTOS.semPistas;
  if (d.tipo === 'escolha') return d.perguntas.length * PONTOS.resposta + PONTOS.semPistas;
  return 45; // encosta: ver pontuarEncosta()
}

/** Pontos de uma tentativa: +10 por resposta certa, +5 se não usou pistas, +5 se foi em modo difícil sem erros. */
export function pontuar({ acertos, pistas, dificil = false, perfeito = false }) {
  let p = acertos * PONTOS.resposta;
  if (pistas === 0) p += PONTOS.semPistas;
  if (dificil && perfeito) p += PONTOS.dificil;
  return p;
}

export const zonaConcluida = (zonaId, concluidos) =>
  zonaPorId(zonaId).desafios.every(d => concluidos.includes(d));

/** Estado de uma zona no mapa: bloqueada → por-explorar → concluida. */
export function estadoZona(zonaId, { concluidos, nivel }) {
  if (zonaConcluida(zonaId, concluidos)) return 'concluida';
  const n = indiceNivel(nivel);
  switch (zonaId) {
    case 'merendas': return 'por-explorar'; // o quiz inicial vem antes, ao entrar na zona
    case 'floresta':
      return n >= 1 && ['campismo', 'trilho', 'estrada'].every(z => zonaConcluida(z, concluidos)) ? 'por-explorar' : 'bloqueada';
    default: return n >= 1 ? 'por-explorar' : 'bloqueada';
  }
}

/** Nível a que o utilizador tem direito, dados os pontos e as zonas concluídas. Nunca desce. */
export function nivelMerecido(pontos, concluidos) {
  let melhor = NIVEIS[0];
  for (const n of NIVEIS) {
    if (pontos >= n.pontos && n.zonas.every(z => zonaConcluida(z, concluidos))) melhor = n;
  }
  return melhor.id;
}

/** O que falta para o próximo nível, para mostrar no painel. */
export function faltaParaProximo(nivel, pontos, concluidos) {
  const prox = NIVEIS[indiceNivel(nivel) + 1];
  if (!prox) return null;
  return {
    nivel: prox,
    pontos: Math.max(0, prox.pontos - pontos),
    zonas: prox.zonas.filter(z => !zonaConcluida(z, concluidos)).map(z => zonaPorId(z).nome),
  };
}

export const desafiosDePrevencao = () => Object.keys(DESAFIOS).filter(id => DESAFIOS[id].categoria === 'prevencao');

/** Insígnias que o estado atual já justifica. */
export function insigniasMerecidas({ concluidos, resultados, consultas }) {
  const ganhas = [];
  if (ZONAS.every(z => zonaConcluida(z.id, concluidos))) ganhas.push('guardiao-floresta');
  if (desafiosDePrevencao().every(id => resultados[id]?.semPistas)) ganhas.push('estrategista');
  if (ZONAS.every(z => (consultas[z.id] || 0) > 0)) ganhas.push('observador');
  return ganhas;
}

/** Próxima zona a sugerir no alerta do mapa (gatilho do ciclo de envolvimento). */
export function zonaSugerida(estados) {
  return ZONAS.find(z => estados[z.id] === 'por-explorar') || null;
}
