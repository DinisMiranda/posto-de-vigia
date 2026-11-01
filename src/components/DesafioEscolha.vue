<script setup>
/* Desafio de decisão: perguntas com explicação imediata.
   +10 se acertar à primeira; ao segundo erro aparece uma pista e uma opção errada sai. */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ArrowRight, Lightbulb, Timer } from 'lucide-vue-next';
import ListaOpcoes from './ListaOpcoes.vue';

const props = defineProps({
  desafio: { type: Object, required: true },
  dificil: { type: Boolean, default: false },
});
const emit = defineEmits(['terminar']);
const SEGUNDOS = 25;

const perguntas = computed(() => props.dificil
  ? props.desafio.perguntas.map(p => ({ ...p, opcoes: [...p.opcoes].sort((a, b) => (a.id + p.id).localeCompare(b.id + p.id) * -1) }))
  : props.desafio.perguntas);
const indice = ref(0);
const escolhida = ref(null);
const riscadas = ref([]);
const resolvida = ref(false);
const acertos = ref(0);
const pistas = ref(0);
const erros = ref(0);
const comPista = ref(false);
const errosSeguidos = ref(0);
const tempo = ref(SEGUNDOS);
let relogio = null;

const p = computed(() => perguntas.value[indice.value]);
const ultima = computed(() => indice.value === perguntas.value.length - 1);
const acertouAPrimeira = computed(() => resolvida.value && riscadas.value.length === 0 && escolhida.value === p.value.certa);

function arrancarRelogio() {
  clearInterval(relogio);
  if (!props.dificil) return;
  tempo.value = SEGUNDOS;
  relogio = setInterval(() => {
    tempo.value -= 1;
    if (tempo.value <= 0) { clearInterval(relogio); tempo.value = 0; esgotou(); }
  }, 1000);
}
function esgotou() {
  if (resolvida.value) return;
  erros.value += 1;
  escolhida.value = null;
  resolvida.value = true;
}

function escolher(id) {
  if (resolvida.value) return;
  escolhida.value = id;
  if (id === p.value.certa) {
    resolvida.value = true;
    clearInterval(relogio);
    if (riscadas.value.length === 0) { acertos.value += 1; errosSeguidos.value = 0; }
    return;
  }
  erros.value += 1;
  errosSeguidos.value += 1;
  riscadas.value.push(id);
  if (props.dificil) { resolvida.value = true; clearInterval(relogio); return; }
  // se já só sobra a certa, mostra-a com a explicação
  if (p.value.opcoes.every(o => o.id === p.value.certa || riscadas.value.includes(o.id))) {
    resolvida.value = true;
    escolhida.value = null;
    return;
  }
  // quem erra duas vezes (sem acertar à primeira pelo meio) recebe uma pista
  if (errosSeguidos.value >= 2 && !comPista.value) { comPista.value = true; pistas.value += 1; }
}

function seguinte() {
  if (ultima.value) {
    emit('terminar', { acertos: acertos.value, pistas: pistas.value, perfeito: erros.value === 0, total: perguntas.value.length });
    return;
  }
  indice.value += 1;
  escolhida.value = null;
  riscadas.value = [];
  resolvida.value = false;
  comPista.value = false;
  arrancarRelogio();
  document.getElementById('escolha-pergunta')?.focus();
}

watch(() => props.dificil, arrancarRelogio, { immediate: true });
onBeforeUnmount(() => clearInterval(relogio));
</script>

<template>
  <section class="papel cartao" aria-live="polite">
    <div class="topo">
      <ol class="progresso" :aria-label="`Pergunta ${indice + 1} de ${perguntas.length}`">
        <li v-for="(q, i) in perguntas" :key="q.id" :class="{ feita: i < indice, atual: i === indice }"></li>
      </ol>
      <p v-if="dificil" class="relogio" :class="{ urgente: tempo <= 7 && !resolvida }"><Timer aria-hidden="true" /> {{ tempo }} s</p>
    </div>
    <p class="numero">Pergunta {{ indice + 1 }} de {{ perguntas.length }}</p>
    <h3 id="escolha-pergunta" tabindex="-1" class="enunciado">{{ p.enunciado }}</h3>

    <ListaOpcoes
      :opcoes="p.opcoes" :escolhida="escolhida" :riscadas="riscadas" :legenda="p.enunciado"
      :certa="resolvida ? p.certa : null" :bloqueada="resolvida" @escolher="escolher"
    />

    <p v-if="!resolvida && riscadas.length && !comPista" class="aviso">Ainda não. Pensa outra vez.</p>
    <p v-if="comPista && !resolvida" class="pista"><Lightbulb aria-hidden="true" /> <span><strong>Pista:</strong> {{ p.pista }}</span></p>

    <div v-if="resolvida" class="explicacao" :class="acertouAPrimeira || escolhida === p.certa ? 'bem' : 'mal'">
      <p class="veredicto">
        <template v-if="acertouAPrimeira">Certo à primeira. +10 pontos.</template>
        <template v-else-if="escolhida === p.certa">Certo, mas não à primeira.</template>
        <template v-else-if="tempo === 0 && dificil">O tempo acabou.</template>
        <template v-else-if="escolhida === null">A resposta certa é esta.</template>
        <template v-else>Não era essa.</template>
      </p>
      <p>{{ p.explicacao }}</p>
    </div>

    <div class="acoes">
      <button v-if="resolvida" type="button" class="botao primario" @click="seguinte">
        {{ ultima ? 'Ver resultado' : 'Pergunta seguinte' }} <ArrowRight aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.cartao { padding: 26px 26px 28px; }
.topo { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
.progresso { list-style: none; display: flex; gap: 6px; padding: 0; margin: 0; flex: 1; }
.progresso li { flex: 1; height: 6px; border-radius: 3px; background: rgba(35, 50, 31, .15); }
.progresso li.feita { background: var(--tinta); }
.progresso li.atual { background: var(--brasa); }
.relogio { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-variant-numeric: tabular-nums; }
.relogio.urgente { color: var(--mau-papel); animation: pulsar 1s infinite; }
@keyframes pulsar { 50% { opacity: .5; } }
.numero { font-weight: 600; color: #4D5A47; }
.enunciado { font-family: var(--serif); font-size: 1.45rem; line-height: 1.3; margin: 6px 0 18px; outline: none; }
.aviso { margin-top: 12px; font-weight: 600; color: var(--mau-papel); }
.pista { display: flex; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: 6px; background: #F7E7C2; color: #5E4310; }
.pista svg { flex: none; margin-top: 3px; }
.explicacao { margin-top: 16px; padding: 14px 16px; border-radius: 8px; border-left: 5px solid; }
.explicacao.bem { background: #E2EFD6; border-color: var(--bom-papel); }
.explicacao.mal { background: #F5E1D8; border-color: var(--mau-papel); }
.veredicto { font-weight: 700; font-size: 1.1rem; margin-bottom: 4px; }
.acoes { display: flex; gap: 10px; margin-top: 20px; }
</style>
