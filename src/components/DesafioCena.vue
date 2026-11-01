<script setup>
/* Desafio "encontra o risco": uma cena ilustrada com elementos em que se pode tocar.
   +10 por cada risco encontrado; dois erros seguidos dão uma pista. */
import { computed, onBeforeUnmount, ref } from 'vue';
import { Flame, ShieldCheck, Lightbulb, Timer } from 'lucide-vue-next';
import CenaFundo from './cena/CenaFundo.vue';
import SimboloCena from './cena/SimboloCena.vue';

const props = defineProps({
  desafio: { type: Object, required: true },
  /** Nível 1: os elementos em que se pode tocar ficam marcados desde o início */
  guiado: { type: Boolean, default: false },
  dificil: { type: Boolean, default: false },
});
const emit = defineEmits(['terminar']);

// caixa de toque de cada símbolo [x, y, largura, altura], à escala 1
const CAIXAS = {
  fogueira: [-50, -120, 100, 128], cinzas: [-46, -70, 92, 78], descartavel: [-50, -50, 100, 58],
  grelhador: [-50, -90, 100, 94], balde: [-26, -52, 52, 56], contentor: [-30, -72, 60, 76],
  fogareiro: [-46, -60, 92, 70], bancada: [-64, -92, 128, 96], lanterna: [-42, -62, 84, 84],
  led: [-32, -62, 64, 66], extintor: [-30, -134, 64, 138], fogocampo: [-62, -130, 124, 136],
  fumador: [-26, -110, 64, 114], beata: [-42, -52, 84, 60], garrafa: [-56, -26, 112, 36],
  placa: [-50, -116, 106, 120], caminhante: [-34, -102, 64, 106], carroerva: [-122, -96, 244, 104],
  carrojanela: [-108, -94, 214, 114], atrelado: [-154, -96, 350, 104], estacionamento: [-150, -162, 324, 172],
  faixa: [-152, -130, 314, 134],
};

const encontrados = ref([]);
const seguros = ref([]);
const erros = ref(0);
const errosSeguidos = ref(0);
const pistas = ref(0);
const ultimo = ref(null);
const tempo = ref(props.dificil ? 60 : null);
let relogio = null;

const riscos = computed(() => props.desafio.alvos.filter(a => a.risco));
const elementos = computed(() => [
  ...props.desafio.decor.map(d => ({ ...d, decor: true })),
  ...props.desafio.alvos,
].sort((a, b) => a.y - b.y));
// enquadramento: corta o céu vazio (no campismo fica o céu, por causa da lanterna)
const topo = computed(() => (props.desafio.cenario === 'campismo' ? 70 : 230));
const acabou = computed(() => encontrados.value.length === riscos.value.length || tempo.value === 0);
const mostraPista = computed(() => pistas.value > 0 && !acabou.value);

function caixa(a) {
  const [x, y, w, h] = CAIXAS[a.s] || [-40, -80, 80, 84];
  return { x, y, w, h };
}

function tocar(a) {
  if (acabou.value) return;
  ultimo.value = a;
  if (a.risco) {
    if (!encontrados.value.includes(a.id)) encontrados.value.push(a.id);
    errosSeguidos.value = 0;
    if (encontrados.value.length === riscos.value.length) terminar();
  } else {
    if (!seguros.value.includes(a.id)) seguros.value.push(a.id);
    erros.value += 1;
    errosSeguidos.value += 1;
    if (errosSeguidos.value >= 2 && !props.dificil && pistas.value === 0) pistas.value = 1;
  }
}

function terminar() {
  clearInterval(relogio);
  emit('terminar', {
    acertos: encontrados.value.length,
    pistas: pistas.value,
    perfeito: erros.value === 0 && encontrados.value.length === riscos.value.length,
    total: riscos.value.length,
  });
}

if (props.dificil) {
  relogio = setInterval(() => {
    tempo.value -= 1;
    if (tempo.value <= 0) { tempo.value = 0; terminar(); }
  }, 1000);
}
onBeforeUnmount(() => clearInterval(relogio));

function teclado(e, a) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocar(a); }
}
</script>

<template>
  <div class="desafio-cena">
    <div class="barra-estado">
      <p class="contador" aria-live="polite">
        <Flame aria-hidden="true" /> {{ encontrados.length }} de {{ riscos.length }} riscos encontrados
      </p>
      <p v-if="dificil" class="relogio" :class="{ urgente: tempo <= 10 }"><Timer aria-hidden="true" /> {{ tempo }} s</p>
      <p v-else-if="guiado" class="guiado">Modo guiado: os elementos em que podes tocar estão marcados.</p>
    </div>

    <div class="palco-cena">
      <svg class="cena" :viewBox="`0 ${topo} 1200 ${700 - topo}`" role="group" :aria-label="`Cena: ${desafio.titulo}. ${desafio.instrucao}`">
        <CenaFundo :tipo="desafio.cenario" />
        <g v-for="(e, i) in elementos" :key="e.id || 'd' + i" :transform="`translate(${e.x},${e.y}) scale(${e.e || 1})`">
          <SimboloCena v-if="e.decor" :s="e.s" :cor="e.cor" style="pointer-events: none" />
          <g
            v-else class="alvo"
            :class="{
              encontrado: encontrados.includes(e.id),
              seguro: seguros.includes(e.id),
              marcado: guiado && !encontrados.includes(e.id) && !seguros.includes(e.id),
              pista: mostraPista && e.risco && !encontrados.includes(e.id),
            }"
            role="button" tabindex="0" :aria-label="e.nome + (encontrados.includes(e.id) ? ' (risco encontrado)' : seguros.includes(e.id) ? ' (seguro)' : '')"
            @click="tocar(e)" @keydown="teclado($event, e)"
          >
            <SimboloCena :s="e.s" :cor="e.cor" />
            <rect class="toque" :x="caixa(e).x" :y="caixa(e).y" :width="caixa(e).w" :height="caixa(e).h" rx="14" />
          </g>
        </g>
        <!-- marcas por cima de tudo -->
        <g v-for="a in desafio.alvos.filter(a => encontrados.includes(a.id) || seguros.includes(a.id))" :key="'m' + a.id"
           :transform="`translate(${a.x + (caixa(a).x + caixa(a).w) * (a.e || 1)},${a.y + caixa(a).y * (a.e || 1)})`" class="marca" :class="a.risco ? 'risco' : 'ok'">
          <circle r="17" />
          <path v-if="a.risco" d="M0,-8 V2 M0,8 V8.5" />
          <path v-else d="M-7,0 L-2,5 L7,-5" />
        </g>
      </svg>
    </div>

    <div class="explicacao" aria-live="polite">
      <template v-if="ultimo">
        <p class="tipo" :class="ultimo.risco ? 'risco' : 'ok'">
          <component :is="ultimo.risco ? Flame : ShieldCheck" aria-hidden="true" />
          {{ ultimo.risco ? 'Risco encontrado' : 'Isto é seguro' }}
        </p>
        <h4>{{ ultimo.nome }}</h4>
        <p>{{ ultimo.explicacao }}</p>
      </template>
      <p v-else class="instrucao">{{ desafio.instrucao }}</p>
      <p v-if="mostraPista" class="pista"><Lightbulb aria-hidden="true" /> <span><strong>Pista:</strong> {{ desafio.pista }} Os riscos que faltam estão a piscar.</span></p>
    </div>
  </div>
</template>

<style scoped>
.desafio-cena { display: grid; gap: 14px; }
.barra-estado { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px 16px; }
.contador { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.1rem; }
.contador svg { color: var(--brasa); }
.guiado { color: var(--texto-2); font-size: .95rem; }
.relogio { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 1.2rem; }
.relogio.urgente { color: var(--mau-madeira); animation: pulsar 1s infinite; }
@keyframes pulsar { 50% { opacity: .5; } }
.palco-cena { border-radius: 8px; overflow: hidden; box-shadow: 0 24px 50px -18px rgba(0, 0, 0, .6); border: 3px solid #4A3627; }
.cena { display: block; width: 100%; height: auto; }

.alvo { cursor: pointer; outline: none; }
.alvo .toque { fill: transparent; stroke: transparent; stroke-width: 3; }
.alvo:hover .toque { fill: rgba(255, 255, 255, .12); stroke: rgba(255, 255, 255, .7); stroke-dasharray: 8 6; }
.alvo:focus-visible .toque { stroke: #FFD166; stroke-width: 4; stroke-dasharray: 8 6; }
.alvo.marcado .toque { stroke: rgba(255, 255, 255, .8); stroke-dasharray: 8 6; animation: marcar 2.4s ease-in-out infinite; }
.alvo.pista .toque { stroke: #FFD166; stroke-width: 5; fill: rgba(255, 209, 102, .18); animation: marcar 1s ease-in-out infinite; }
.alvo.encontrado .toque { stroke: var(--brasa); stroke-width: 4; fill: rgba(217, 72, 28, .12); stroke-dasharray: none; }
.alvo.seguro .toque { stroke: #2F6B3A; stroke-width: 3; stroke-dasharray: none; fill: rgba(47, 107, 58, .08); }
@keyframes marcar { 50% { stroke-opacity: .25; } }
.marca circle { stroke: #fff; stroke-width: 3; }
.marca path { stroke: #fff; stroke-width: 3.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.marca.risco circle { fill: var(--brasa); }
.marca.ok circle { fill: #2F6B3A; }
.marca { animation: aparecer .35s cubic-bezier(.2, 1.4, .4, 1); transform-box: fill-box; }
@keyframes aparecer { from { opacity: 0; } }

.explicacao { background: var(--madeira-2); border: 1px solid var(--madeira-3); border-radius: var(--raio); padding: 16px 18px; min-height: 120px; }
.explicacao h4 { font-family: var(--serif); font-size: 1.3rem; margin: 4px 0 6px; }
.instrucao { font-family: var(--serif); font-size: 1.2rem; }
.tipo { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: .9rem; text-transform: uppercase; letter-spacing: .06em; }
.tipo.risco { color: var(--mau-madeira); }
.tipo.ok { color: var(--bom-madeira); }
.pista { display: flex; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: 6px; background: rgba(240, 180, 60, .14); color: #F6D58E; }
.pista svg { flex: none; margin-top: 3px; }
</style>
