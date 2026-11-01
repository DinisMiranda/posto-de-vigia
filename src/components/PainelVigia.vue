<script setup>
/* Painel do vigia: os instrumentos do posto. Nível com marcos, pontos com contagem animada,
   mostrador de perigo com as classes do IPMA e as insígnias como emblemas bordados. */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useVigiaStore } from '../stores/vigia.js';
import { NIVEIS, INSIGNIAS, CLASSES, ZONAS } from '../logica/regras.js';
import InsigniaArte from './InsigniaArte.vue';

const s = useVigiaStore();
const reduzir = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- pontos: contagem animada (o valor anunciado é sempre o final) ----------
const mostrado = ref(s.pontosVigilancia);
let pedido = 0;
watch(() => s.pontosVigilancia, (novo, antigo) => {
  cancelAnimationFrame(pedido);
  if (reduzir || antigo === undefined) { mostrado.value = novo; return; }
  const ini = performance.now(), de = mostrado.value, dur = Math.min(1400, 500 + Math.abs(novo - de) * 12);
  const passo = t => {
    const q = Math.min(1, (t - ini) / dur), e = 1 - (1 - q) ** 3;
    mostrado.value = Math.round(de + (novo - de) * e);
    if (q < 1) pedido = requestAnimationFrame(passo);
  };
  pedido = requestAnimationFrame(passo);
});
onBeforeUnmount(() => cancelAnimationFrame(pedido));
const subiu = ref(false);
watch(() => s.pontosVigilancia, (n, a) => { if (n > a) { subiu.value = false; requestAnimationFrame(() => (subiu.value = true)); } });

// ---------- nível: três marcos à mesma distância; o enchimento segue os pontos ----------
const indice = computed(() => NIVEIS.findIndex(n => n.id === s.nivel));
const enchimento = computed(() => {
  const p = s.pontosVigilancia, [, vig, gua] = NIVEIS;
  if (p < vig.pontos) return 0.5 * (p / vig.pontos);
  return 0.5 + 0.5 * Math.min(1, (p - vig.pontos) / (gua.pontos - vig.pontos));
});

// ---------- mostrador de perigo ----------
const C = { x: 80, y: 78, r: 58 };
const ponto = (v, r = C.r) => { const a = Math.PI * (1 - v / 100); return [C.x + r * Math.cos(a), C.y - r * Math.sin(a)]; };
const arcos = computed(() => {
  let ini = 0;
  return CLASSES.map(c => {
    const fim = Math.min(c.ate, 100);
    const [x0, y0] = ponto(ini + 0.9), [x1, y1] = ponto(fim - 0.9);
    const atual = s.perigoDoDia.nome === c.nome;
    ini = fim;
    return { ...c, atual, d: `M${x0.toFixed(1)},${y0.toFixed(1)} A${C.r},${C.r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}` };
  });
});
const marcas = Array.from({ length: 21 }, (_, i) => {
  const v = i * 5, grande = i % 2 === 0;
  const [x0, y0] = ponto(v, C.r - 9), [x1, y1] = ponto(v, C.r - (grande ? 16 : 13));
  return { x0, y0, x1, y1, grande };
});
const angulo = computed(() => -90 + 180 * (s.perigoDoDia.valor / 100));
</script>

<template>
  <header class="instrumentos" aria-label="Painel do vigia">
    <section class="medidor nivel">
      <span class="parafuso" aria-hidden="true"></span><span class="parafuso dir" aria-hidden="true"></span>
      <h3>Nível</h3>
      <p class="nome-nivel">{{ s.nivelAtual.nome }} <span class="fase">{{ s.nivelAtual.fase }}</span></p>
      <div class="trilho-nivel">
        <div class="barra-nivel" role="progressbar" :aria-valuenow="Math.round(enchimento * 100)" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso nos níveis">
          <span class="enche" :style="{ transform: `scaleX(${enchimento})` }"></span>
        </div>
        <ol class="marcos" aria-label="Níveis">
          <li v-for="(n, i) in NIVEIS" :key="n.id" :class="{ feito: i < indice, atual: i === indice }" :style="{ left: i * 50 + '%' }">
            <span class="pino" aria-hidden="true"></span>
            <span class="nome">{{ n.nome }}</span>
            <span class="pts leitura">{{ n.pontos }}</span>
          </li>
        </ol>
      </div>
      <p v-if="s.proximoNivel" class="falta">
        Para {{ s.proximoNivel.nivel.nome }}:
        <template v-if="s.proximoNivel.pontos">mais {{ s.proximoNivel.pontos }} pontos</template>
        <template v-if="s.proximoNivel.pontos && s.proximoNivel.zonas.length"> e </template>
        <template v-if="s.proximoNivel.zonas.length">concluir {{ s.proximoNivel.zonas.join(', ') }}</template>
      </p>
      <p v-else class="falta">Chegaste ao nível mais alto.</p>
    </section>

    <section class="medidor pontos">
      <span class="parafuso" aria-hidden="true"></span><span class="parafuso dir" aria-hidden="true"></span>
      <h3>Pontos de Vigilância</h3>
      <p class="grande">
        <span class="contador leitura" :class="{ subiu }" aria-hidden="true">{{ mostrado }}</span>
        <output class="sr" aria-live="polite">{{ s.pontosVigilancia }}</output>
      </p>
      <ol class="zonas-feitas" :aria-label="`${s.zonasConcluidas} de 5 zonas concluídas`">
        <li v-for="z in ZONAS" :key="z.id" :class="{ feita: s.estados[z.id] === 'concluida' }" :title="z.nome"></li>
      </ol>
      <p class="falta">{{ s.zonasConcluidas }} de 5 zonas concluídas</p>
    </section>

    <section class="medidor perigo">
      <span class="parafuso" aria-hidden="true"></span><span class="parafuso dir" aria-hidden="true"></span>
      <h3>Perigo de incêndio</h3>
      <div class="mostrador-caixa">
        <svg class="mostrador" viewBox="0 0 160 92" aria-hidden="true">
          <defs>
            <radialGradient id="mostrador-fundo" cx="80" cy="78" r="80" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#F6EFDD" /><stop offset="1" stop-color="#D9CFB4" />
            </radialGradient>
            <linearGradient id="mostrador-vidro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#fff" stop-opacity=".45" /><stop offset=".45" stop-color="#fff" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path :d="`M${C.x - C.r - 12},${C.y} A${C.r + 12},${C.r + 12} 0 0 1 ${C.x + C.r + 12},${C.y} Z`" fill="url(#mostrador-fundo)" class="caixa" />
          <path v-for="a in arcos" :key="a.nome" :d="a.d" :stroke="a.cor" :stroke-width="a.atual ? 11 : 8" fill="none" class="arco" :class="{ atual: a.atual }" />
          <line v-for="(m, i) in marcas" :key="i" :x1="m.x0" :y1="m.y0" :x2="m.x1" :y2="m.y1" class="marca" :class="{ grande: m.grande }" />
          <text :x="C.x - C.r + 4" :y="C.y + 11" class="escala">0</text>
          <text :x="C.x + C.r - 12" :y="C.y + 11" class="escala">100</text>
          <g class="agulha" :style="{ transform: `rotate(${angulo}deg)` }">
            <path :d="`M${C.x - 2.4},${C.y} L${C.x},${C.y - C.r + 12} L${C.x + 2.4},${C.y} Z`" />
          </g>
          <circle :cx="C.x" :cy="C.y" r="6" class="eixo" />
          <path :d="`M${C.x - C.r - 12},${C.y} A${C.r + 12},${C.r + 12} 0 0 1 ${C.x + C.r + 12},${C.y} Z`" fill="url(#mostrador-vidro)" class="vidro" />
        </svg>
        <div class="leitura-perigo">
          <p class="classe" :style="{ '--c': s.perigoDoDia.cor }">{{ s.perigoDoDia.nome }}</p>
          <ol class="escala-ipma" aria-label="Classes de perigo do IPMA">
            <li v-for="c in CLASSES" :key="c.nome" :class="{ atual: s.perigoDoDia.nome === c.nome }" :style="{ '--c': c.cor }" :title="c.nome"><span class="sr">{{ c.nome }}</span></li>
          </ol>
        </div>
      </div>
      <p class="falta">{{ s.zonasConcluidas < 5 ? 'Estimativa para as zonas por concluir' : 'Todas as zonas concluídas' }}</p>
    </section>

    <section class="medidor insignias">
      <span class="parafuso" aria-hidden="true"></span><span class="parafuso dir" aria-hidden="true"></span>
      <h3>Insígnias</h3>
      <ul>
        <li v-for="i in INSIGNIAS" :key="i.id" class="cracha" :class="{ ganha: s.insignias.includes(i.id) }" :title="`${i.nome}: ${i.criterio}`">
          <InsigniaArte :id="i.id" :ganha="s.insignias.includes(i.id)" />
          <span class="sr">{{ i.nome }} ({{ s.insignias.includes(i.id) ? 'ganha' : 'por ganhar' }}): {{ i.criterio }}</span>
        </li>
      </ul>
    </section>
  </header>
</template>

<style scoped>
.instrumentos {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr 1fr;
  gap: 14px;
  padding: 26px 0 22px;
}
/* cada instrumento numa caixa de madeira escura com parafusos de latão */
.medidor {
  position: relative;
  background:
    linear-gradient(180deg, rgba(255, 230, 190, .05), transparent 40%),
    var(--veios),
    #3A2A1F;
  background-size: auto, 600px 240px, auto;
  border: 1px solid #5A4331;
  border-radius: var(--raio-lg);
  box-shadow: var(--sombra-metal);
  padding: 14px 16px 14px;
  min-width: 0;
}
.parafuso { position: absolute; top: 8px; left: 8px; width: 7px; height: 7px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, var(--latao-claro), var(--latao) 55%, #6E5122); box-shadow: 0 1px 1px rgba(0, 0, 0, .6); }
.parafuso::after { content: ""; position: absolute; left: 1px; right: 1px; top: 3px; height: 1px; background: rgba(60, 40, 10, .7); transform: rotate(35deg); }
.parafuso.dir { left: auto; right: 8px; }
.medidor h3 { font-family: var(--cond); font-weight: 600; font-size: .78rem; letter-spacing: .1em; text-transform: uppercase; color: var(--texto-2); padding-left: 10px; }
.falta { font-size: .88rem; color: var(--texto-2); }

/* nível */
.nome-nivel { font-family: var(--serif); font-weight: 700; font-size: 1.75rem; line-height: 1.15; margin-top: 4px; }
.fase { font-family: var(--cond); font-size: .9rem; font-weight: 500; font-style: italic; color: var(--texto-2); }
.trilho-nivel { position: relative; margin: 12px 10px 40px; }
.barra-nivel { height: 8px; border-radius: 4px; background: rgba(0, 0, 0, .35); box-shadow: inset 0 1px 2px rgba(0, 0, 0, .6); overflow: hidden; }
.enche { display: block; height: 100%; background: linear-gradient(90deg, var(--folhosa), var(--lampada)); transform-origin: left; transition: transform var(--dur-longa) var(--ease-saida); }
.marcos { list-style: none; padding: 0; margin: 0; }
.marcos li { position: absolute; top: -5px; transform: translateX(-50%); display: grid; justify-items: center; gap: 2px; font-size: .74rem; color: var(--texto-2); white-space: nowrap; }
.marcos li:first-child { transform: translateX(-6px); justify-items: start; }
.marcos li:last-child { transform: translateX(calc(-100% + 6px)); justify-items: end; }
.pino { width: 18px; height: 18px; border-radius: 50%; background: #2E2119; border: 2px solid #6E5440; box-shadow: 0 1px 2px rgba(0, 0, 0, .6); transition: background-color var(--dur-media), border-color var(--dur-media), box-shadow var(--dur-media); }
.marcos li.feito .pino { background: var(--folhosa); border-color: #D8F0C4; }
.marcos li.atual .pino { background: var(--lampada); border-color: #FFE7AE; box-shadow: var(--brilho-candeeiro); }
.marcos li.atual .nome { color: var(--texto); font-weight: 700; }
.marcos .pts { font-size: .68rem; opacity: .7; }

/* pontos */
.grande { margin-top: 2px; }
.contador { display: inline-block; font-size: 2.6rem; font-weight: 600; line-height: 1.05; color: var(--texto); text-shadow: 0 0 18px rgba(240, 180, 60, .25); }
.contador.subiu { animation: subir .7s var(--ease-mola); }
@keyframes subir { 30% { transform: translateY(-4px) scale(1.06); color: var(--lampada); } }
.zonas-feitas { list-style: none; display: flex; gap: 6px; padding: 0; margin: 8px 0 8px; }
.zonas-feitas li { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #6E5440; background: rgba(0, 0, 0, .3); transition: background-color var(--dur-media), border-color var(--dur-media); }
.zonas-feitas li.feita { background: var(--folhosa); border-color: #D8F0C4; box-shadow: 0 0 8px rgba(140, 191, 104, .5); }

/* mostrador */
.mostrador-caixa { display: grid; grid-template-columns: minmax(0, 150px) 1fr; gap: 10px; align-items: center; margin-top: 4px; }
.mostrador { width: 100%; height: auto; overflow: visible; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, .5)); }
.caixa { stroke: var(--latao); stroke-width: 3; }
.arco { transition: stroke-width var(--dur-media); }
.arco:not(.atual) { opacity: .6; }
.marca { stroke: #3B3A3A; stroke-width: 1; opacity: .55; }
.marca.grande { stroke-width: 1.6; opacity: .85; }
.escala { font: 600 8px var(--mono); fill: #3B3A3A; }
.agulha { transform-box: view-box; transform-origin: 80px 78px; transition: transform 1.1s var(--ease-mola); }
.agulha path { fill: #B93A14; filter: drop-shadow(1px 2px 1px rgba(0, 0, 0, .45)); }
.eixo { fill: #2E2119; stroke: var(--latao-claro); stroke-width: 2; }
.vidro { pointer-events: none; }
.classe { display: inline-flex; align-items: center; gap: 6px; font-size: 1.05rem; font-weight: 700; line-height: 1.2; }
.classe::before { content: ""; width: 11px; height: 11px; border-radius: 50%; background: var(--c); flex: none; box-shadow: 0 0 8px var(--c); }
.escala-ipma { list-style: none; display: flex; gap: 3px; padding: 0; margin: 8px 0 0; }
.escala-ipma li { flex: 1; height: 6px; border-radius: 2px; background: var(--c); opacity: .35; }
.escala-ipma li.atual { opacity: 1; transform: scaleY(1.6); box-shadow: 0 0 6px var(--c); }
.perigo .falta { margin-top: 6px; }

/* insígnias como emblemas bordados */
.insignias ul { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 0; margin: 12px 0 0; }
.cracha { position: relative; max-width: 74px; border-radius: 50%; padding: 4px; background: radial-gradient(circle, rgba(0, 0, 0, .35), rgba(0, 0, 0, .15)); box-shadow: inset 0 2px 5px rgba(0, 0, 0, .6); }
.cracha.ganha { background: none; box-shadow: none; animation: costurar .8s var(--ease-mola); }
.cracha.ganha :deep(svg) { filter: drop-shadow(0 3px 3px rgba(0, 0, 0, .55)) drop-shadow(0 0 10px rgba(240, 180, 60, .35)); }
.cracha.ganha::after {
  content: ""; position: absolute; inset: 4px; border-radius: 50%; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, .45) 50%, transparent 65%) no-repeat;
  background-size: 250% 100%; animation: reflexo 4s ease-in-out 1s infinite;
}
@keyframes costurar { from { transform: scale(.7) rotate(-12deg); opacity: 0; } }
@keyframes reflexo { 0%, 70% { background-position: 120% 0; } 100% { background-position: -120% 0; } }

@media (max-width: 980px) {
  .instrumentos { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px) {
  .instrumentos { gap: 10px; padding: 18px 0; }
  .nivel, .insignias, .perigo { grid-column: 1 / -1; }
  .pontos { grid-column: 1 / -1; display: grid; grid-template-columns: auto 1fr; column-gap: 14px; align-items: center; }
  .pontos h3, .pontos .falta { grid-column: 1 / -1; }
  .pontos .zonas-feitas { margin: 0; }
  .medidor { padding: 12px 12px; }
  .nome-nivel { font-size: 1.5rem; }
  .contador { font-size: 2.1rem; }
  .mostrador-caixa { grid-template-columns: 130px 1fr; }
  .insignias ul { grid-template-columns: repeat(3, 60px); }
}
</style>
