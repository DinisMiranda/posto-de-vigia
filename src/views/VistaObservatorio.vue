<script setup>
/* Observatório: histórico, causas e risco estimado por zona (valores ilustrativos). */
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Lock, Info, Telescope } from 'lucide-vue-next';
import { useVigiaStore } from '../stores/vigia.js';
import { ZONAS, zonaPorId, classeDe } from '../logica/regras.js';
import obs from '../dados/observatorio.json';
import InsigniaArte from '../components/InsigniaArte.vue';

const props = defineProps({ id: { type: String, default: '' } });
const s = useVigiaStore();
const router = useRouter();

const acessivel = id => s.estados[id] === 'concluida' || s.eGuardiao;
const primeira = ZONAS.find(z => acessivel(z.id))?.id || null;
const atual = computed(() => (props.id && acessivel(props.id) ? props.id : primeira));
const zona = computed(() => atual.value && zonaPorId(atual.value));
const dados = computed(() => atual.value && obs.zonas[atual.value]);
const risco = computed(() => atual.value && s.riscoPorZona[atual.value]);
const consultadas = computed(() => ZONAS.filter(z => (s.consultasObservatorio[z.id] || 0) > 0).length);

watch(atual, id => { if (id) s.abrirObservatorio(id); }, { immediate: true });
function escolher(id) { if (acessivel(id)) router.replace({ name: 'observatorio', params: { id } }); }

// ---------- gráfico de barras do histórico ----------
const G = { w: 560, h: 200, m: { t: 18, r: 8, b: 26, l: 30 } };
const maxOc = computed(() => Math.max(12, ...(dados.value?.ocorrencias || [0])));
const barras = computed(() => {
  if (!dados.value) return [];
  const iw = G.w - G.m.l - G.m.r, ih = G.h - G.m.t - G.m.b;
  const passo = iw / obs.anos.length, larg = Math.min(30, passo - 8);
  return dados.value.ocorrencias.map((v, i) => {
    const alt = (v / maxOc.value) * ih;
    const x = G.m.l + i * passo + (passo - larg) / 2, y = G.m.t + ih - alt;
    // topo arredondado (4px), base reta na linha de base
    const r = Math.min(4, alt / 2, larg / 2);
    const d = `M${x},${G.m.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + larg - r} Q${x + larg},${y} ${x + larg},${y + r} V${G.m.t + ih}Z`;
    return { ano: obs.anos[i], v, x, y, larg, d, alvo: { x: G.m.l + i * passo, w: passo } };
  });
});
const grelha = computed(() => {
  const ih = G.h - G.m.t - G.m.b;
  return [0, Math.round(maxOc.value / 2), maxOc.value].map(v => ({ v, y: G.m.t + ih - (v / maxOc.value) * ih }));
});
const sobre = ref(null);
const total = computed(() => dados.value?.ocorrencias.reduce((a, b) => a + b, 0) || 0);

const contribuicoes = computed(() => dados.value && obs.fatores.map(f => ({
  ...f, valor: dados.value.fatores[f.id], pontos: Math.round(100 * f.peso * dados.value.fatores[f.id]), max: Math.round(100 * f.peso),
})).sort((a, b) => b.pontos - a.pontos));
const principal = computed(() => contribuicoes.value?.[0]);

const comparacao = computed(() => ZONAS.map(z => ({
  ...z, risco: s.riscoPorZona[z.id], total: obs.zonas[z.id].ocorrencias.reduce((a, b) => a + b, 0),
})).sort((a, b) => b.risco - a.risco));
</script>

<template>
  <div class="vista-obs">
    <RouterLink class="voltar" :to="{ name: 'mapa' }"><ArrowLeft aria-hidden="true" /> Voltar ao mapa</RouterLink>
    <div class="cabecalho-vista">
      <div>
        <p class="etiqueta"><Telescope aria-hidden="true" /> Observatório</p>
        <h2>Os números por trás de cada zona</h2>
        <p class="lead">Histórico de ocorrências, causas mais frequentes e uma estimativa do risco para o próximo verão, com os fatores que a explicam.</p>
      </div>
      <div class="observador">
        <div class="mini-insignia"><InsigniaArte id="observador" :ganha="s.insignias.includes('observador')" /></div>
        <p><strong>Observador</strong><br>{{ consultadas }} de 5 zonas consultadas</p>
      </div>
    </div>

    <p class="aviso"><Info aria-hidden="true" /> <span>{{ obs.aviso }}</span></p>

    <div class="separadores" role="tablist" aria-label="Zonas">
      <button
        v-for="z in ZONAS" :key="z.id" type="button" role="tab" class="separador"
        :class="{ ativo: atual === z.id }" :aria-selected="atual === z.id" :disabled="!acessivel(z.id)"
        @click="escolher(z.id)"
      >
        <Lock v-if="!acessivel(z.id)" aria-hidden="true" /> {{ z.nome }}
      </button>
    </div>

    <p v-if="!zona" class="vazio papel">Ainda não há dados abertos. Cada zona concluída desbloqueia os seus dados aqui.</p>

    <section v-else class="painel papel" role="tabpanel" :aria-label="zona.nome">
      <div class="topo-painel">
        <div>
          <h3>{{ zona.nome }}</h3>
          <p class="nota">{{ dados.nota }}</p>
        </div>
        <div class="risco" :style="{ '--c': classeDe(risco).cor }">
          <p class="rotulo">Risco estimado para o próximo verão</p>
          <p class="numero">{{ risco }}<span>%</span></p>
          <p class="classe">{{ classeDe(risco).nome }}</p>
        </div>
      </div>

      <div class="graficos">
        <figure class="grafico">
          <figcaption>Ocorrências por ano, 2015–2024 <span class="muted">· {{ total }} no total</span></figcaption>
          <div class="svg-envolvente">
            <svg :viewBox="`0 0 ${G.w} ${G.h}`" role="img" :aria-label="`Ocorrências por ano em ${zona.nome}`" @mouseleave="sobre = null">
              <g class="grelha">
                <template v-for="l in grelha" :key="l.v">
                  <line :x1="G.m.l" :x2="G.w - G.m.r" :y1="l.y" :y2="l.y" :class="{ base: l.v === 0 }" />
                  <text :x="G.m.l - 6" :y="l.y + 4" text-anchor="end">{{ l.v }}</text>
                </template>
              </g>
              <g v-for="(b, i) in barras" :key="b.ano">
                <path :d="b.d" class="barra" :class="{ ativa: sobre === i }" />
                <text v-if="i % 3 === 0 || i === barras.length - 1" :x="b.x + b.larg / 2" :y="G.h - 8" text-anchor="middle" class="eixo">{{ b.ano }}</text>
                <rect :x="b.alvo.x" :y="G.m.t" :width="b.alvo.w" :height="G.h - G.m.t - G.m.b" fill="transparent" @mouseenter="sobre = i" @focus="sobre = i" tabindex="0" :aria-label="`${b.ano}: ${b.v} ocorrências`" />
              </g>
              <g v-if="sobre !== null" class="dica" :transform="`translate(${Math.min(barras[sobre].x + barras[sobre].larg / 2, G.w - 60)},${barras[sobre].y - 8})`">
                <rect x="-46" y="-26" width="92" height="22" rx="4" />
                <text y="-11" text-anchor="middle">{{ barras[sobre].ano }}: {{ barras[sobre].v }}</text>
              </g>
            </svg>
          </div>
        </figure>

        <figure class="grafico">
          <figcaption>Causas mais frequentes</figcaption>
          <ul class="hbarras">
            <li v-for="[nome, v] in dados.causas" :key="nome">
              <span class="nome">{{ nome }}</span>
              <span class="trilho"><span class="enchimento" :style="{ width: v + '%' }"></span></span>
              <span class="v">{{ v }}%</span>
            </li>
          </ul>
        </figure>
      </div>

      <div class="fatores">
        <h4>Porque é que esta zona tem este risco?</h4>
        <p class="explica">O modelo soma quatro fatores, cada um com o seu peso. Aqui pesa mais: <strong>{{ principal.nome.toLowerCase() }}</strong>.</p>
        <ul class="hbarras fatores-lista">
          <li v-for="f in contribuicoes" :key="f.id">
            <span class="nome">{{ f.nome }} <small>peso {{ Math.round(f.peso * 100) }}%</small></span>
            <span class="trilho" :title="f.texto"><span class="enchimento" :style="{ width: (f.pontos / 35) * 100 + '%' }"></span><span class="teto" :style="{ left: (f.max / 35) * 100 + '%' }"></span></span>
            <span class="v">+{{ f.pontos }}</span>
            <span class="txt">{{ f.texto }}</span>
          </li>
        </ul>
        <p class="soma">Total: <strong>{{ risco }}%</strong>. A marca vertical é o máximo que cada fator pode somar.</p>
      </div>
    </section>

    <section v-if="s.eGuardiao" class="comparar papel">
      <h3>Comparar as cinco zonas</h3>
      <p class="nota">Acesso completo de Guardião. Mais ocorrências não quer dizer mais risco: compara a estrada com a floresta de produção.</p>
      <table>
        <thead><tr><th scope="col">Zona</th><th scope="col">Ocorrências 2015–2024</th><th scope="col">Risco estimado</th></tr></thead>
        <tbody>
          <tr v-for="z in comparacao" :key="z.id">
            <th scope="row">{{ z.nome }}</th>
            <td>{{ z.total }}</td>
            <td><span class="ponto" :style="{ background: classeDe(z.risco).cor }"></span>{{ z.risco }}% · {{ classeDe(z.risco).nome }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.etiqueta { color: var(--lampada); }
.observador { display: flex; align-items: center; gap: 12px; color: var(--texto-2); }
.mini-insignia { width: 56px; }
.aviso { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--raio); background: rgba(240, 180, 60, .1); border: 1px solid rgba(240, 180, 60, .35); color: #F6D58E; margin-bottom: 18px; font-size: .95rem; }
.aviso svg { flex: none; margin-top: 3px; }
.separadores { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.separador { display: inline-flex; align-items: center; gap: 6px; min-height: 42px; padding: 0 16px; border-radius: var(--raio); border: 1px solid var(--madeira-3); background: var(--madeira-2); color: var(--texto); font-weight: 600; cursor: pointer; }
.separador:hover:not(:disabled) { border-color: var(--lampada); }
.separador.ativo { background: var(--carta); color: var(--tinta); border-color: var(--carta); }
.separador:disabled { opacity: .5; cursor: not-allowed; }
.vazio { padding: 24px; }
.painel { padding: 22px 24px 26px; display: grid; gap: 22px; }
.topo-painel { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 18px; }
.topo-painel h3 { font-size: 1.9rem; }
.nota { color: #4D5A47; margin-top: 4px; max-width: 60ch; }
.risco { border-left: 6px solid var(--c); padding-left: 14px; }
.risco .rotulo { font-size: .85rem; color: #4D5A47; }
.risco .numero { font-family: var(--serif); font-size: 3.2rem; font-weight: 700; line-height: 1; }
.risco .numero span { font-size: 1.6rem; }
.risco .classe { font-weight: 700; }
.graficos { display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; }
.grafico { margin: 0; min-width: 0; }
figcaption { font-weight: 700; margin-bottom: 8px; }
.muted { font-weight: 500; color: #6E7468; }
.svg-envolvente svg { display: block; width: 100%; height: auto; overflow: visible; }
.grelha line { stroke: rgba(35, 50, 31, .15); stroke-width: 1; }
.grelha line.base { stroke: rgba(35, 50, 31, .5); }
.grelha text, .eixo { font: 500 11px var(--cond); fill: #4D5A47; }
.barra { fill: #4F7356; transition: fill .15s; }
.barra.ativa { fill: #2F4F36; }
.dica rect { fill: var(--tinta); }
.dica text { font: 600 12px var(--cond); fill: var(--carta); }
.hbarras { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.hbarras li { display: grid; grid-template-columns: minmax(120px, 1fr) 2fr 44px; gap: 4px 10px; align-items: center; }
.hbarras .nome { font-size: .95rem; }
.hbarras .nome small { color: #6E7468; }
.trilho { position: relative; height: 12px; background: rgba(35, 50, 31, .08); border-radius: 2px; }
.enchimento { position: absolute; inset: 0 auto 0 0; background: #4F7356; border-radius: 0 4px 4px 0; transition: width .6s cubic-bezier(.2, .8, .2, 1); }
.teto { position: absolute; top: -3px; bottom: -3px; width: 2px; background: rgba(35, 50, 31, .5); }
.v { font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; }
.fatores { border-top: 1px dashed rgba(35, 50, 31, .35); padding-top: 18px; }
.fatores h4 { font-family: var(--serif); font-size: 1.35rem; }
.explica { margin: 4px 0 14px; }
.fatores-lista .txt { grid-column: 1 / -1; font-size: .85rem; color: #6E7468; margin-top: -4px; }
.soma { margin-top: 12px; font-size: .95rem; color: #4D5A47; }
.comparar { margin-top: 22px; padding: 22px 24px; }
.comparar h3 { font-size: 1.5rem; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 8px 6px; border-bottom: 1px dashed rgba(35, 50, 31, .3); }
thead th { font-size: .85rem; color: #4D5A47; }
.ponto { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
@media (max-width: 820px) {
  .graficos { grid-template-columns: 1fr; }
  .hbarras li { grid-template-columns: 1fr 44px; }
  .hbarras .trilho { grid-column: 1 / -1; grid-row: 2; }
}
</style>
