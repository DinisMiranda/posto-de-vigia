/* Estado global do Posto de Vigia (GDD, secção 7.2). */
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import {
  ZONAS, DESAFIOS, NIVEIS, INSIGNIAS, estadoZona, nivelMerecido, insigniasMerecidas,
  faltaParaProximo, indiceNivel, zonaSugerida, classeDe,
} from '../logica/regras.js';
import * as encostaLogica from '../logica/encosta.js';
import observatorio from '../dados/observatorio.json';

const CHAVE = 'posto-de-vigia:v1';

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || null; } catch { return null; }
}

function estadoInicial() {
  return {
    zonas: ZONAS.map(z => ({ id: z.id, estado: z.id === 'merendas' ? 'por-explorar' : 'bloqueada', visitada: false })),
    pontosVigilancia: 0,
    nivel: 'visitante',
    desafiosConcluidos: [],
    resultados: {},
    insignias: [],
    quizInicial: null,
    desafioFinal: null,
    consultasObservatorio: {},
    encosta: encostaLogica.novaEncosta(),
  };
}

export const useVigiaStore = defineStore('vigia', () => {
  const guardado = ler();
  const base = { ...estadoInicial(), ...(guardado || {}) };

  const zonas = ref(base.zonas);
  const pontosVigilancia = ref(base.pontosVigilancia);
  const nivel = ref(base.nivel);
  const desafiosConcluidos = ref(base.desafiosConcluidos);
  const resultados = ref(base.resultados);
  const insignias = ref(base.insignias);
  const quizInicial = ref(base.quizInicial);
  const desafioFinal = ref(base.desafioFinal);
  const consultasObservatorio = ref(base.consultasObservatorio);
  const encosta = ref(base.encosta);
  /** Fila de novidades a mostrar (subida de nível, insígnia). Não é guardada. */
  const novidades = ref([]);

  // ---------- getters ----------
  const estados = computed(() => Object.fromEntries(zonas.value.map(z => [z.id, z.estado])));
  const nivelAtual = computed(() => NIVEIS[indiceNivel(nivel.value)]);
  const proximoNivel = computed(() => faltaParaProximo(nivel.value, pontosVigilancia.value, desafiosConcluidos.value));
  const sugestao = computed(() => zonaSugerida(estados.value));
  const zonasConcluidas = computed(() => zonas.value.filter(z => z.estado === 'concluida').length);
  const eGuardiao = computed(() => nivel.value === 'guardiao');
  const riscoPorZona = computed(() => carregarObservatorio());
  /** Perigo da época: o pior risco entre as zonas ainda por concluir. */
  const perigoDoDia = computed(() => {
    const abertas = zonas.value.filter(z => z.estado !== 'concluida').map(z => riscoPorZona.value[z.id]);
    const r = abertas.length ? Math.max(...abertas) : 30;
    return { valor: r, ...classeDe(r) };
  });
  const encostaMetricas = computed(() => encostaLogica.metricas(encosta.value.parcelas));

  // ---------- ações (nomes do GDD, 7.2) ----------
  function atualizarZonas() {
    const ctx = { concluidos: desafiosConcluidos.value, nivel: nivel.value };
    for (const z of zonas.value) z.estado = estadoZona(z.id, ctx);
  }

  function abrirZona(id) {
    const z = zonas.value.find(x => x.id === id);
    if (!z || z.estado === 'bloqueada') return false;
    z.visitada = true;
    return true;
  }

  function concluirZona(id) {
    atualizarZonas();
    return zonas.value.find(z => z.id === id)?.estado === 'concluida';
  }

  function adicionarPontos(valor) {
    pontosVigilancia.value += Math.max(0, valor);
    atualizarNivel();
  }

  function atualizarNivel() {
    const merecido = nivelMerecido(pontosVigilancia.value, desafiosConcluidos.value);
    if (indiceNivel(merecido) > indiceNivel(nivel.value)) {
      nivel.value = merecido;
      novidades.value.push({ tipo: 'nivel', id: merecido });
    }
    atualizarZonas();
  }

  /** Regista uma tentativa. Conta só a melhor pontuação de cada desafio,
      por isso repetir pode melhorar os pontos mas nunca os duplica. */
  function concluirDesafio(id, { acertos, pistas, pontos, dificil = false }) {
    const anterior = resultados.value[id];
    const melhor = Math.max(anterior?.pontos || 0, pontos);
    resultados.value[id] = {
      pontos: melhor,
      acertos: Math.max(anterior?.acertos || 0, acertos),
      semPistas: !!anterior?.semPistas || pistas === 0,
      dificil: !!anterior?.dificil || dificil,
      tentativas: (anterior?.tentativas || 0) + 1,
    };
    const primeira = !desafiosConcluidos.value.includes(id);
    if (primeira) desafiosConcluidos.value.push(id);
    adicionarPontos(melhor - (anterior?.pontos || 0));
    const zona = DESAFIOS[id].zona;
    const zonaFechada = primeira && concluirZona(zona);
    verificarInsignias();
    return { ganhos: melhor - (anterior?.pontos || 0), zonaFechada };
  }

  function desbloquearInsignia(id) {
    if (insignias.value.includes(id)) return;
    insignias.value.push(id);
    novidades.value.push({ tipo: 'insignia', id });
  }

  function verificarInsignias() {
    for (const id of insigniasMerecidas({
      concluidos: desafiosConcluidos.value,
      resultados: resultados.value,
      consultas: consultasObservatorio.value,
    })) desbloquearInsignia(id);
  }

  /** Risco estimado por zona (0-100), com o modelo simplificado do Observatório. */
  function carregarObservatorio() {
    const out = {};
    for (const [id, z] of Object.entries(observatorio.zonas)) {
      out[id] = Math.round(100 * observatorio.fatores.reduce((s, f) => s + f.peso * z.fatores[f.id], 0));
    }
    return out;
  }

  function abrirObservatorio(id) {
    const z = zonas.value.find(x => x.id === id);
    if (!z || (z.estado !== 'concluida' && !eGuardiao.value)) return false;
    consultasObservatorio.value[id] = (consultasObservatorio.value[id] || 0) + 1;
    verificarInsignias();
    return true;
  }

  function registarQuizInicial(acertos) {
    if (quizInicial.value === null) quizInicial.value = acertos;
    atualizarZonas();
  }

  /** Desafio final: +10 por caso certo, contando só a melhor tentativa. */
  function registarDesafioFinal(acertos) {
    const antes = desafioFinal.value ?? 0;
    desafioFinal.value = Math.max(antes, acertos);
    adicionarPontos((desafioFinal.value - antes) * 10);
  }

  // ----- desafio da encosta -----
  function gastar(parcelaId, acao) {
    const e = encosta.value;
    return encostaLogica.agir(e, e.parcelas[parcelaId], acao);
  }
  function recalcularMetricas() { return encostaMetricas.value; }
  function avancarEstacao() { encostaLogica.avancarEstacao(encosta.value); }
  function simularVerao() { return encostaLogica.simularVerao(encosta.value); }
  function reiniciarEncosta() { encosta.value = encostaLogica.novaEncosta(); }

  function reiniciar() {
    const novo = estadoInicial();
    zonas.value = novo.zonas;
    pontosVigilancia.value = 0;
    nivel.value = 'visitante';
    desafiosConcluidos.value = [];
    resultados.value = {};
    insignias.value = [];
    quizInicial.value = null;
    desafioFinal.value = null;
    consultasObservatorio.value = {};
    encosta.value = novo.encosta;
    novidades.value = [];
  }

  atualizarZonas();

  // guarda o progresso no navegador
  watch(
    [zonas, pontosVigilancia, nivel, desafiosConcluidos, resultados, insignias, quizInicial, desafioFinal, consultasObservatorio, encosta],
    () => {
      try {
        localStorage.setItem(CHAVE, JSON.stringify({
          zonas: zonas.value, pontosVigilancia: pontosVigilancia.value, nivel: nivel.value,
          desafiosConcluidos: desafiosConcluidos.value, resultados: resultados.value, insignias: insignias.value,
          quizInicial: quizInicial.value, desafioFinal: desafioFinal.value,
          consultasObservatorio: consultasObservatorio.value, encosta: encosta.value,
        }));
      } catch { /* modo privado ou armazenamento cheio: o jogo continua sem guardar */ }
    },
    { deep: true },
  );

  return {
    zonas, pontosVigilancia, nivel, desafiosConcluidos, resultados, insignias, quizInicial, desafioFinal,
    consultasObservatorio, encosta, novidades,
    estados, nivelAtual, proximoNivel, sugestao, zonasConcluidas, eGuardiao, riscoPorZona, perigoDoDia, encostaMetricas,
    atualizarZonas, abrirZona, concluirZona, adicionarPontos, atualizarNivel, concluirDesafio, desbloquearInsignia,
    carregarObservatorio, abrirObservatorio, registarQuizInicial, registarDesafioFinal,
    gastar, recalcularMetricas, avancarEstacao, simularVerao, reiniciarEncosta, reiniciar,
  };
});

export { INSIGNIAS, NIVEIS };
