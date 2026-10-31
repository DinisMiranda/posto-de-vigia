<script setup>
/* Carta do parque: relevo em curvas de nível, ribeiro, estrada, trilho e as cinco zonas. */
import { computed } from 'vue';
import { contours } from 'd3-contour';
import { Check, Lock, UtensilsCrossed, Tent, Footprints, Car, Trees } from 'lucide-vue-next';
import { ZONAS, classeDe } from '../logica/regras.js';

const props = defineProps({
  estados: { type: Object, required: true },
  riscos: { type: Object, required: true },
  selecionada: { type: String, default: null },
  sugerida: { type: String, default: null },
  camada: { type: String, default: 'estado' },
});
const emit = defineEmits(['escolher']);

const W = 1000, H = 680;
const ICONES = { merendas: UtensilsCrossed, campismo: Tent, trilho: Footprints, estrada: Car, floresta: Trees };
const POSTO = { x: 470, y: 150 };

// ---------- relevo ----------
const N = 100, M = 68;
const ribeiro = y => 330 + 60 * Math.sin(y / 140) + y * 0.08;
function altura(x, y) {
  let h = 520 - y * 0.42;
  h += 120 * Math.exp(-(((x - POSTO.x) / 150) ** 2 + ((y - POSTO.y) / 120) ** 2));
  h += 95 * Math.exp(-(((x - 800) / 170) ** 2 + ((y - 170) / 150) ** 2));
  h += 60 * Math.exp(-(((x - 140) / 140) ** 2 + ((y - 420) / 150) ** 2));
  h -= 70 * Math.exp(-(((x - ribeiro(y)) / 60) ** 2));
  h += 10 * Math.sin(x / 47 + y / 83) + 7 * Math.sin(x / 23 - y / 37);
  return h;
}
const grelha = new Float64Array(N * M);
for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) grelha[j * N + i] = altura(i * 10 + 5, j * 10 + 5);
const anel = r => 'M' + r.map(([x, y]) => `${(x * 10).toFixed(1)},${(y * 10).toFixed(1)}`).join('L') + 'Z';
const curvas = contours().size([N, M]).thresholds(d3Range(260, 700, 20))(grelha).map(c => ({
  d: c.coordinates.map(poli => poli.map(anel).join('')).join(''),
  mestra: c.value % 100 === 0,
}));
function d3Range(a, b, p) { const r = []; for (let v = a; v < b; v += p) r.push(v); return r; }

// ---------- elementos fixos ----------
const rio = (() => {
  const pts = [];
  for (let y = -10; y <= H + 10; y += 20) pts.push(`${ribeiro(y).toFixed(1)},${y}`);
  return 'M' + pts.join('L');
})();
const estrada = 'M1010,640 C900,650 840,600 760,590 C660,578 650,470 600,430 C540,380 560,300 520,250 C500,222 490,200 470,178';
const trilho = 'M300,300 C260,340 300,380 250,420 C210,452 160,470 180,520 C196,560 120,600 60,630';
const caminhoFloresta = 'M760,200 C700,190 640,215 600,250 C580,270 580,300 600,330';

// árvores pequenas espalhadas, como na simbologia das cartas militares
const arvores = (() => {
  const out = []; let s = 7;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let k = 0; k < 260; k++) {
    const x = r() * W, y = r() * H;
    if (Math.abs(x - ribeiro(y)) < 26) continue;
    if (ZONAS.some(z => Math.hypot(z.mapa.x - x, z.mapa.y - y) < 62)) continue;
    if (Math.hypot(POSTO.x - x, POSTO.y - y) < 50) continue;
    out.push({ x, y, t: x > 640 && y < 330 ? 'conifera' : r() < 0.5 ? 'folhosa' : 'conifera' });
  }
  return out;
})();

const zonas = computed(() => ZONAS.map(z => {
  const estado = props.estados[z.id];
  const risco = props.riscos[z.id];
  return { ...z, estado, risco, classe: classeDe(risco) };
}));

function teclado(e, id) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); emit('escolher', id); }
}
</script>

<template>
  <svg class="mapa" :viewBox="`0 0 ${W} ${H}`" role="group" aria-label="Carta do parque. Escolhe uma zona.">
    <defs>
      <pattern id="grao" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".6" fill="#6B5B3E" opacity=".18" />
        <circle cx="4" cy="4" r=".5" fill="#6B5B3E" opacity=".12" />
      </pattern>
      <radialGradient id="mancha-risco">
        <stop offset="0" stop-color="currentColor" stop-opacity=".55" />
        <stop offset=".7" stop-color="currentColor" stop-opacity=".25" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0" />
      </radialGradient>
    </defs>

    <rect class="fundo" :width="W" :height="H" />
    <g class="quadricula">
      <line v-for="i in 9" :key="'v' + i" :x1="i * 100" :x2="i * 100" y1="0" :y2="H" />
      <line v-for="i in 6" :key="'h' + i" :y1="i * 100" :y2="i * 100" x1="0" :x2="W" />
      <text v-for="i in 9" :key="'t' + i" :x="i * 100 + 4" y="14">{{ 52 + i }}</text>
    </g>
    <g class="curvas"><path v-for="(c, i) in curvas" :key="i" :d="c.d" :class="{ mestra: c.mestra }" /></g>

    <g class="arvores">
      <template v-for="(a, i) in arvores" :key="i">
        <path v-if="a.t === 'conifera'" :d="`M${a.x},${a.y - 6}l4,8h-8z`" />
        <circle v-else :cx="a.x" :cy="a.y" r="3.4" />
      </template>
    </g>

    <path class="rio" :d="rio" />
    <text class="nome-rio" x="0" y="0" :transform="`translate(${ribeiro(560) + 16},560) rotate(-62)`">Ribeira da Fervença</text>
    <path class="estrada-borda" :d="estrada" />
    <path class="estrada" :d="estrada" />
    <path class="trilho" :d="trilho" />
    <path class="trilho" :d="caminhoFloresta" />

    <!-- camada de risco -->
    <g v-if="camada === 'risco'" class="manchas">
      <circle v-for="z in zonas" :key="z.id" :cx="z.mapa.x" :cy="z.mapa.y" r="110" fill="url(#mancha-risco)" :style="{ color: z.classe.cor }" />
    </g>

    <!-- posto de vigia -->
    <g class="posto" :transform="`translate(${POSTO.x},${POSTO.y})`">
      <path d="M-9,8 L-5,-10 H5 L9,8 Z" />
      <rect x="-8" y="-20" width="16" height="10" />
      <path d="M-11,-20 L0,-28 L11,-20 Z" />
      <text y="26" text-anchor="middle">Posto de vigia</text>
    </g>

    <!-- zonas -->
    <g
      v-for="z in zonas" :key="z.id"
      class="zona" :class="[z.estado, { selecionada: selecionada === z.id, sugerida: sugerida === z.id && z.estado === 'por-explorar' }]"
      :transform="`translate(${z.mapa.x},${z.mapa.y})`"
      role="button" tabindex="0"
      :aria-label="`${z.nome}: ${z.estado === 'bloqueada' ? 'bloqueada' : z.estado === 'concluida' ? 'concluída' : 'por explorar'}. ${z.causa}.`"
      :aria-pressed="selecionada === z.id"
      @click="emit('escolher', z.id)" @keydown="teclado($event, z.id)"
    >
      <circle class="alvo" r="58" />
      <circle v-if="sugerida === z.id && z.estado === 'por-explorar'" class="pulso" r="34" />
      <circle class="disco" r="26" />
      <component :is="z.estado === 'concluida' ? Check : z.estado === 'bloqueada' ? Lock : ICONES[z.id]" class="icone" x="-13" y="-13" :size="26" :stroke-width="2.4" />
      <text class="nome" y="48" text-anchor="middle">{{ z.nome }}</text>
      <text v-if="camada === 'risco'" class="detalhe" y="66" text-anchor="middle">Risco {{ z.risco }}% · {{ z.classe.nome }}</text>
    </g>

    <rect class="grao" :width="W" :height="H" fill="url(#grao)" />
    <rect :width="W" :height="H" fill="none" stroke="#23321F" stroke-width="2" />
  </svg>
</template>

<style scoped>
.mapa { display: block; width: 100%; height: auto; user-select: none; }
.fundo { fill: var(--carta); }
.quadricula line { stroke: var(--tinta); stroke-width: .8; opacity: .13; }
.quadricula text { font: 500 11px var(--cond); fill: var(--tinta); opacity: .5; }
.curvas path { fill: none; stroke: #9C7A55; stroke-width: .7; opacity: .5; }
.curvas .mestra { stroke-width: 1.4; opacity: .65; }
.arvores path { fill: #5E7F4F; opacity: .55; }
.arvores circle { fill: #7FA650; opacity: .45; }
.rio { fill: none; stroke: #3F7FA6; stroke-width: 3; stroke-linecap: round; }
.nome-rio { font: italic 500 14px var(--serif); fill: #2A6488; paint-order: stroke; stroke: var(--carta); stroke-width: 3; }
.estrada-borda { fill: none; stroke: #23321F; stroke-width: 9; stroke-linecap: round; }
.estrada { fill: none; stroke: #E7B85C; stroke-width: 6; stroke-linecap: round; }
.trilho { fill: none; stroke: #8A3B1E; stroke-width: 2; stroke-dasharray: 6 5; stroke-linecap: round; }
.posto path, .posto rect { fill: var(--brasa); stroke: var(--tinta); stroke-width: 1.5; }
.posto text { font: 600 13px var(--cond); fill: var(--tinta); paint-order: stroke; stroke: var(--carta); stroke-width: 3.5; stroke-linejoin: round; }
.grao { pointer-events: none; mix-blend-mode: multiply; }

.zona { cursor: pointer; outline: none; }
.zona .alvo { fill: transparent; }
.zona .disco { fill: #FFFDF5; stroke: var(--tinta); stroke-width: 2.5; transition: r .2s; }
.zona .icone { color: var(--tinta); }
.zona .nome { font: 700 18px var(--serif); fill: var(--tinta); paint-order: stroke; stroke: var(--carta); stroke-width: 4.5; stroke-linejoin: round; }
.zona .detalhe { font: 600 13px var(--cond); fill: #33412F; paint-order: stroke; stroke: var(--carta); stroke-width: 4; stroke-linejoin: round; }
.zona.por-explorar .disco { stroke: #C77D12; stroke-width: 4; }
.zona.por-explorar .icone { color: #8A5208; }
.zona.concluida .disco { fill: #2F6B3A; stroke: #1E4A26; }
.zona.concluida .icone { color: #fff; }
.zona.bloqueada { cursor: not-allowed; }
.zona.bloqueada .disco { fill: #CFCFC4; stroke: #8C8C80; }
.zona.bloqueada .icone { color: #6E6E64; }
.zona.bloqueada .nome { fill: #5F665B; }
.zona:hover .disco, .zona:focus-visible .disco { r: 30; }
.zona:focus-visible .alvo { stroke: var(--brasa); stroke-width: 3; stroke-dasharray: 6 5; }
.zona.selecionada .alvo { stroke: var(--brasa); stroke-width: 3.5; fill: rgba(217, 72, 28, .06); }
.pulso { fill: none; stroke: #C0572B; stroke-width: 3; stroke-dasharray: 7 6; transform-box: fill-box; transform-origin: center; animation: rodar 9s linear infinite; }
@keyframes rodar { to { transform: rotate(360deg); } }

/* em ecrãs estreitos a carta encolhe: marcadores e nomes maiores para se poderem tocar */
@media (max-width: 640px) {
  .zona .disco { r: 44; }
  .zona:hover .disco, .zona:focus-visible .disco { r: 46; }
  .zona .icone { transform: scale(1.6); }
  .zona .nome { font-size: 30px; stroke-width: 7; transform: translateY(20px); }
  .zona .detalhe { display: none; }
  .zona .alvo { r: 70; }
  .pulso { r: 54; }
  .posto text, .nome-rio, .quadricula text { display: none; }
  .arvores { opacity: .6; }
}
</style>
