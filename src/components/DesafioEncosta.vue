<script setup>
/* Desafio da encosta (Floresta de produção): limpar, plantar ou vender ao longo de quatro estações
   e ver o verão pôr as escolhas à prova. As métricas são as do Tema 2. */
import { computed, onBeforeUnmount, ref } from 'vue';
import { Axe, Sprout, TrendingUp, Coins, Sun, ArrowRight, Flame, ShieldCheck, TriangleAlert, Leaf } from 'lucide-vue-next';
import { useVigiaStore } from '../stores/vigia.js';
import { classeDe } from '../logica/regras.js';
import {
  ESTACOES, TIPOS, ACOES, VENDA, POLIGONOS, LARGURA, ALTURA, LIMIAR,
  acoesPossiveis, podeAgir, riscoParcela, metricas, nomeParcela,
} from '../logica/encosta.js';

const emit = defineEmits(['terminar']);
const s = useVigiaStore();
if (s.encosta.resultado) s.reiniciarEncosta();

const e = computed(() => s.encosta);
const estacao = computed(() => ESTACOES[e.value.estacao]);
const eVerao = computed(() => estacao.value.id === 'verao');
const selecionada = ref(null);
const camada = ref('vegetacao');
const ultimaAcao = ref(null);

// durante a animação do verão mostramos a encosta como estava antes do fogo
const fotografia = ref(null);
const aArder = ref(new Set());
const ardidas = ref(new Set());
const fase = ref('gerir'); // gerir → verao → relatorio
let temporizadores = [];

const parcelas = computed(() => fotografia.value || e.value.parcelas);
// depois do fogo, as métricas que contam são as de antes do verão (as parcelas ardidas já não têm risco)
const m = computed(() => (fase.value !== 'gerir' && e.value.resultado ? e.value.resultado.antes : metricas(e.value.parcelas)));
const p = computed(() => (selecionada.value === null ? null : e.value.parcelas[selecionada.value]));
const ICONES = { limpar: Axe, autoctone: Sprout, eucalipto: TrendingUp, vender: Coins };
const caminho = pts => 'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L') + 'Z';
const centro = i => { const pts = POLIGONOS[i]; return [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length]; };
const euros = v => `${Math.round(v).toLocaleString('pt-PT')} €`;

function corParcela(q) {
  if (ardidas.value.has(q.id)) return TIPOS.ardido.cor;
  if (camada.value === 'risco') return classeDe(riscoParcela(q, parcelas.value)).cor;
  return TIPOS[q.tipo].cor;
}

function agir(acao) {
  const q = p.value;
  const antes = m.value;
  const dinheiro = s.gastar(q.id, acao);
  const depois = metricas(e.value.parcelas);
  ultimaAcao.value = { acao, parcela: q.nome, dinheiro, risco: depois.risco - antes.risco, resiliencia: depois.resiliencia - antes.resiliencia };
}

function avancar() {
  if (!eVerao.value) { s.avancarEstacao(); selecionada.value = null; ultimaAcao.value = null; return; }
  // verão: anima as vagas de fogo e depois mostra o relatório
  fotografia.value = e.value.parcelas.map(q => ({ ...q }));
  const r = s.simularVerao();
  fase.value = 'verao';
  selecionada.value = null;
  const passo = matchMedia('(prefers-reduced-motion: reduce)').matches ? 60 : 900;
  r.vagas.forEach((vaga, i) => {
    temporizadores.push(setTimeout(() => { vaga.forEach(id => aArder.value.add(id)); aArder.value = new Set(aArder.value); }, passo * (i + 1)));
    temporizadores.push(setTimeout(() => { vaga.forEach(id => ardidas.value.add(id)); ardidas.value = new Set(ardidas.value); }, passo * (i + 2)));
  });
  temporizadores.push(setTimeout(() => { fase.value = 'relatorio'; aArder.value = new Set(); }, passo * (r.vagas.length + 2.5)));
}
onBeforeUnmount(() => temporizadores.forEach(clearTimeout));

const r = computed(() => e.value.resultado);
const criterios = computed(() => {
  if (!r.value) return [];
  const { antes, ardeu } = r.value;
  return [
    { ok: antes.risco < 50, texto: 'Risco médio abaixo de 50% antes do verão', pts: 10 },
    { ok: antes.risco < 42, texto: 'Risco médio abaixo de 42%', pts: 10 },
    { ok: antes.resiliencia >= 40, texto: 'Resiliência ecológica de 40% ou mais', pts: 10 },
    { ok: ardeu.length <= 2, texto: 'No máximo duas parcelas ardidas', pts: 10 },
    { ok: ardeu.length === 0, texto: 'Nenhuma parcela ardeu', pts: 5 },
  ];
});
const porque = computed(() => {
  if (!r.value || !fotografia.value) return [];
  const f = fotografia.value;
  return f.map(q => {
    const risco = Math.round(riscoParcela(q, f));
    const ardeu = r.value.ardeu.includes(q.id);
    const travou = r.value.travou.includes(q.id);
    let texto = '';
    if (q.maquinasNoVerao) texto = 'Limpaste com máquinas em pleno verão: as faíscas começaram aqui um foco.';
    else if (ardeu && q.base) texto = `O fogo veio da estrada e encontrou risco de ${risco}%.`;
    else if (ardeu) texto = `Risco de ${risco}%: o fogo passou de uma parcela vizinha${q.tipo === 'eucalipto' ? ' e o eucaliptal ardeu depressa' : q.comb > 40 ? ' e encontrou mato acumulado' : ''}.`;
    else if (travou) texto = `Risco de ${risco}%, abaixo do limiar de ${LIMIAR}%: o fogo parou aqui${q.tipo === 'autoctone' ? ' (as folhosas retêm humidade)' : q.comb < 20 ? ' (terreno limpo)' : ''}.`;
    else return null;
    return { nome: q.nome, ardeu, texto };
  }).filter(Boolean);
});

function terminar() {
  emit('terminar', { pontos: r.value.pontos, acertos: 0, pistas: 0, perfeito: r.value.ardeu.length === 0 });
}
</script>

<template>
  <div class="encosta">
    <ol class="estacoes" aria-label="Estações">
      <li v-for="(x, i) in ESTACOES" :key="x.id" :class="{ feita: i < e.estacao || fase !== 'gerir', atual: i === e.estacao && fase === 'gerir' }">
        <span class="n">{{ i + 1 }}</span> {{ x.nome }}
      </li>
      <li :class="{ atual: fase !== 'gerir' }"><Flame aria-hidden="true" /> Teste do verão</li>
    </ol>

    <div class="metricas">
      <div class="metrica">
        <p class="rotulo">Risco de incêndio<template v-if="fase !== 'gerir'"> antes do verão</template></p>
        <p class="valor"><output>{{ m.risco }}%</output> <span class="classe" :style="{ '--c': classeDe(m.risco).cor }">{{ classeDe(m.risco).nome }}</span></p>
      </div>
      <div class="metrica">
        <p class="rotulo">Orçamento disponível</p>
        <p class="valor"><output :class="{ apertado: e.orcamento < 300 }">{{ euros(e.orcamento) }}</output></p>
      </div>
      <div class="metrica">
        <p class="rotulo">Resiliência ecológica<template v-if="fase !== 'gerir'"> antes do verão</template></p>
        <div class="barra"><span :style="{ width: m.resiliencia + '%' }"></span><i style="left: 40%" title="Meta: 40%"></i></div>
        <p class="valor pequeno"><output>{{ m.resiliencia }}%</output></p>
      </div>
    </div>

    <div class="corpo">
      <div class="papel carta">
        <div class="carta-topo">
          <p class="nome">Encosta da Floresta de produção · <strong>{{ fase === 'gerir' ? estacao.nome : 'Verão' }}</strong></p>
          <div class="vistas" role="group" aria-label="Camada">
            <button type="button" :class="{ ativa: camada === 'vegetacao' }" :aria-pressed="camada === 'vegetacao'" @click="camada = 'vegetacao'">Vegetação</button>
            <button type="button" :class="{ ativa: camada === 'risco' }" :aria-pressed="camada === 'risco'" @click="camada = 'risco'">Risco</button>
          </div>
        </div>
        <svg class="mapa-encosta" :viewBox="`0 0 ${LARGURA} ${ALTURA + 40}`" role="group" aria-label="Parcelas da encosta. Escolhe uma para agir.">
          <defs>
            <pattern id="mato-denso" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#857543" stroke-width="2.2" opacity=".55" />
            </pattern>
            <pattern id="mato-leve" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="16" stroke="#857543" stroke-width="1.6" opacity=".35" />
            </pattern>
          </defs>
          <text class="seta-subida" x="16" y="24">▲ encosta acima</text>
          <g v-for="q in parcelas" :key="q.id"
             class="parcela" :class="{ selecionada: selecionada === q.id, arde: aArder.has(q.id), ardida: ardidas.has(q.id), agiu: q.agiu }"
             role="button" :tabindex="fase === 'gerir' ? 0 : -1" :aria-label="`${q.nome}: ${TIPOS[q.tipo].nome}, combustível ${Math.round(q.comb)}%, risco ${Math.round(riscoParcela(q, parcelas))}%`"
             @click="fase === 'gerir' && (selecionada = q.id)" @keydown.enter.prevent="fase === 'gerir' && (selecionada = q.id)" @keydown.space.prevent="fase === 'gerir' && (selecionada = q.id)">
            <path :d="caminho(POLIGONOS[q.id])" :fill="corParcela(q)" class="fundo" />
            <path v-if="!ardidas.has(q.id) && q.comb > 25" :d="caminho(POLIGONOS[q.id])" :fill="q.comb > 50 ? 'url(#mato-denso)' : 'url(#mato-leve)'" class="textura" />
            <path :d="caminho(POLIGONOS[q.id])" class="contorno" />
            <text :x="centro(q.id)[0]" :y="centro(q.id)[1] - 6" class="rotulo-parcela" text-anchor="middle">{{ q.nome }}</text>
            <text :x="centro(q.id)[0]" :y="centro(q.id)[1] + 14" class="tipo-parcela" text-anchor="middle">{{ ardidas.has(q.id) ? 'ardeu' : TIPOS[q.tipo].nome }}</text>
            <circle v-if="q.agiu && fase === 'gerir'" :cx="centro(q.id)[0] + 44" :cy="centro(q.id)[1] - 22" r="9" class="feito" />
          </g>
          <rect x="0" :y="ALTURA" :width="LARGURA" height="40" fill="#5B5B5B" />
          <path :d="`M0,${ALTURA + 20} H${LARGURA - 170}`" stroke="#F3EADB" stroke-width="3" stroke-dasharray="30 22" />
          <text :x="LARGURA - 14" :y="ALTURA + 26" text-anchor="end" class="estrada-txt">Estrada do parque</text>
        </svg>
        <ul class="legenda">
          <li v-for="t in ['mato', 'eucalipto', 'pinhal', 'autoctone', 'ardido']" :key="t"><span class="amostra" :style="{ background: TIPOS[t].cor }"></span>{{ TIPOS[t].nome }}</li>
          <li><span class="amostra" style="background: repeating-linear-gradient(35deg, #E4DDBC 0 4px, #B5A57A 4px 6px)"></span>Muito combustível</li>
        </ul>
      </div>

      <aside class="painel" aria-live="polite">
        <!-- gestão -->
        <template v-if="fase === 'gerir'">
          <div class="estacao-txt">
            <p class="etiqueta"><Leaf aria-hidden="true" /> {{ estacao.nome }}</p>
            <p>{{ estacao.texto }}</p>
          </div>

          <div v-if="p" class="ficha">
            <h4>{{ p.nome }}</h4>
            <p class="tipo">{{ TIPOS[p.tipo].nome }}. {{ TIPOS[p.tipo].texto }}</p>
            <dl class="dados">
              <div><dt>Combustível</dt><dd><span class="mini"><span :style="{ width: p.comb + '%' }"></span></span>{{ Math.round(p.comb) }}%</dd></div>
              <div><dt>Risco</dt><dd>{{ Math.round(riscoParcela(p, e.parcelas)) }}%</dd></div>
            </dl>
            <p v-if="eVerao && acoesPossiveis(p).includes('limpar')" class="aviso"><TriangleAlert aria-hidden="true" /> Limpar agora obriga a usar máquinas num dia de perigo máximo.</p>
            <div class="acoes-parcela">
              <button v-for="a in acoesPossiveis(p)" :key="a" type="button" class="acao" :disabled="!podeAgir(e, p, a).ok" :title="podeAgir(e, p, a).porque || ''" @click="agir(a)">
                <component :is="ICONES[a]" aria-hidden="true" />
                <span class="acao-nome">{{ ACOES[a].nome }}</span>
                <span class="acao-custo">{{ a === 'vender' ? '+' + euros(VENDA[p.tipo]) : '−' + euros(ACOES[a].custo) }}</span>
                <span class="acao-txt">{{ podeAgir(e, p, a).ok ? ACOES[a].texto : podeAgir(e, p, a).porque }}</span>
              </button>
            </div>
          </div>
          <p v-else class="dica">Escolhe uma parcela no mapa. Podes agir uma vez por parcela em cada estação.</p>

          <p v-if="ultimaAcao" class="ultima">
            {{ ACOES[ultimaAcao.acao].nome }} em {{ ultimaAcao.parcela }}:
            risco <strong :class="ultimaAcao.risco <= 0 ? 'bem' : 'mal'">{{ ultimaAcao.risco > 0 ? '+' : '' }}{{ ultimaAcao.risco }}</strong>,
            resiliência <strong :class="ultimaAcao.resiliencia >= 0 ? 'bem' : 'mal'">{{ ultimaAcao.resiliencia > 0 ? '+' : '' }}{{ ultimaAcao.resiliencia }}</strong>,
            {{ ultimaAcao.dinheiro >= 0 ? '+' : '−' }}{{ euros(Math.abs(ultimaAcao.dinheiro)) }}
          </p>

          <button type="button" class="botao primario avancar" @click="avancar">
            <template v-if="eVerao"><Sun aria-hidden="true" /> Chega o verão: ver o que acontece</template>
            <template v-else>Avançar para {{ ESTACOES[e.estacao + 1].nome.toLowerCase() }} <ArrowRight aria-hidden="true" /></template>
          </button>
          <p v-if="!eVerao" class="nota">O mato cresce de estação para estação, sobretudo na primavera.</p>
        </template>

        <!-- o verão a acontecer -->
        <div v-else-if="fase === 'verao'" class="verao">
          <p class="etiqueta"><Flame aria-hidden="true" /> Onda de calor, perigo máximo</p>
          <p>Um incêndio vindo da estrada chega à base da encosta e começa a subir...</p>
        </div>

        <!-- relatório -->
        <div v-else class="relatorio">
          <p class="etiqueta">{{ r.ardeu.length ? `Arderam ${r.ardeu.length} de 9 parcelas` : 'A encosta aguentou o verão' }}</p>
          <ul class="porque">
            <li v-for="x in porque" :key="x.nome" :class="x.ardeu ? 'ardeu' : 'travou'">
              <component :is="x.ardeu ? Flame : ShieldCheck" aria-hidden="true" />
              <span><strong>{{ x.nome }}.</strong> {{ x.texto }}</span>
            </li>
          </ul>
          <h4>Pontos</h4>
          <ul class="criterios">
            <li v-for="c in criterios" :key="c.texto" :class="{ ok: c.ok }"><span>{{ c.texto }}</span><span>{{ c.ok ? '+' + c.pts : '—' }}</span></li>
          </ul>
          <p class="longo-prazo">As folhosas autóctones só mostram todo o seu valor anos depois: daqui a uma década são as parcelas que menos ardem e mais protegem as vizinhas.</p>
          <button type="button" class="botao primario" @click="terminar">Ver resultado ({{ r.pontos }} pontos) <ArrowRight aria-hidden="true" /></button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.encosta { display: grid; gap: 16px; }
.estacoes { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 0; }
.estacoes li { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px 6px 8px; border-radius: 99px; background: var(--madeira-2); border: 1px solid var(--madeira-3); color: var(--texto-2); font-weight: 600; }
.estacoes .n { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: var(--madeira-3); font-size: .85rem; }
.estacoes li.feita { color: var(--bom-madeira); }
.estacoes li.atual { background: var(--lampada); color: var(--madeira); border-color: var(--lampada); }
.estacoes li.atual .n { background: var(--madeira); color: var(--lampada); }
.metricas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.metrica { background: var(--madeira-2); border: 1px solid var(--madeira-3); border-radius: var(--raio); padding: 12px 14px; }
.rotulo { color: var(--texto-2); font-size: .92rem; }
.valor { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.valor output { font-size: 1.9rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.valor.pequeno output { font-size: 1.3rem; }
.apertado { color: var(--mau-madeira); }
.classe { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.classe::before { content: ""; width: 10px; height: 10px; border-radius: 50%; background: var(--c); }
.barra { position: relative; height: 12px; background: var(--madeira-3); border-radius: 3px; margin: 10px 0 6px; }
.barra span { position: absolute; inset: 0 auto 0 0; background: var(--folhosa); border-radius: 3px; transition: width .6s; }
.barra i { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--lampada); }

.corpo { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); gap: 18px; align-items: start; }
.carta { padding: 12px; }
.carta-topo { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.carta-topo .nome { font-family: var(--serif); font-style: italic; }
.vistas { display: inline-flex; border: 1.5px solid var(--tinta); border-radius: var(--raio); overflow: hidden; }
.vistas button { min-height: 36px; padding: 0 12px; border: 0; background: transparent; color: var(--tinta); font-weight: 600; cursor: pointer; }
.vistas button + button { border-left: 1.5px solid var(--tinta); }
.vistas button.ativa { background: var(--tinta); color: var(--carta); }
.mapa-encosta { display: block; width: 100%; height: auto; border: 1px solid rgba(35, 50, 31, .5); }
.parcela { cursor: pointer; outline: none; }
.parcela .fundo { transition: fill .5s; }
.parcela .textura { pointer-events: none; }
.parcela .contorno { fill: none; stroke: #23321F; stroke-width: 1.5; stroke-dasharray: 5 4; }
.parcela:hover .contorno, .parcela:focus-visible .contorno { stroke-width: 3; stroke-dasharray: none; }
.parcela.selecionada .contorno { stroke: var(--brasa); stroke-width: 4.5; stroke-dasharray: none; }
.parcela.arde .fundo { fill: #E2552A; animation: arder .35s ease-in-out infinite alternate; }
.parcela.ardida .rotulo-parcela, .parcela.ardida .tipo-parcela { fill: #F3EADB; stroke: #2F2926; }
@keyframes arder { to { fill: #FFB347; } }
.rotulo-parcela { font: 700 17px var(--serif); fill: var(--tinta); paint-order: stroke; stroke: rgba(227, 230, 211, .9); stroke-width: 4; pointer-events: none; }
.tipo-parcela { font: 500 13px var(--cond); fill: #33412F; paint-order: stroke; stroke: rgba(227, 230, 211, .9); stroke-width: 3.5; pointer-events: none; }
.feito { fill: var(--brasa); stroke: #fff; stroke-width: 2; }
.seta-subida { font: 600 13px var(--cond); fill: #4D5A47; }
.estrada-txt { font: 600 13px var(--cond); fill: #F3EADB; }
.legenda { list-style: none; display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 0; margin: 10px 2px 0; font-size: .85rem; color: var(--tinta); }
.legenda li { display: inline-flex; align-items: center; gap: 6px; }
.amostra { width: 16px; height: 16px; border-radius: 2px; border: 1px solid rgba(35, 50, 31, .5); }

.painel { display: grid; gap: 14px; background: var(--madeira-2); border: 1px solid var(--madeira-3); border-radius: var(--raio); padding: 16px; }
.etiqueta { color: var(--lampada); }
.estacao-txt p:last-child { font-family: var(--serif); font-size: 1.1rem; margin-top: 4px; }
.ficha h4 { font-family: var(--serif); font-size: 1.4rem; }
.ficha .tipo { color: var(--texto-2); margin-top: 4px; }
.dados { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0 0; }
.dados dt { font-size: .85rem; color: var(--texto-2); }
.dados dd { margin: 0; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.mini { width: 56px; height: 7px; background: var(--madeira-3); border-radius: 2px; overflow: hidden; display: inline-block; }
.mini span { display: block; height: 100%; background: var(--lampada); }
.aviso { display: flex; gap: 8px; margin-top: 12px; padding: 8px 10px; border-radius: 6px; background: rgba(217, 72, 28, .16); color: var(--mau-madeira); font-weight: 600; }
.aviso svg { flex: none; margin-top: 3px; }
.acoes-parcela { display: grid; gap: 8px; margin-top: 12px; }
.acao { display: grid; grid-template-columns: 22px 1fr auto; gap: 2px 10px; align-items: center; text-align: left; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--madeira-3); background: var(--madeira); cursor: pointer; }
.acao:hover:not(:disabled) { border-color: var(--lampada); }
.acao:disabled { opacity: .5; cursor: not-allowed; }
.acao svg { color: var(--lampada); }
.acao-nome { font-weight: 700; }
.acao-custo { font-weight: 700; font-variant-numeric: tabular-nums; }
.acao-txt { grid-column: 2 / -1; font-size: .88rem; color: var(--texto-2); }
.dica, .nota { color: var(--texto-2); }
.nota { font-size: .9rem; }
.ultima { font-size: .95rem; padding: 8px 10px; border-radius: 6px; background: rgba(243, 234, 219, .06); }
.ultima .bem { color: var(--bom-madeira); }
.ultima .mal { color: var(--mau-madeira); }
.avancar { width: 100%; }
.verao p:last-child { font-family: var(--serif); font-size: 1.2rem; margin-top: 6px; }
.relatorio { display: grid; gap: 12px; }
.relatorio h4 { font-family: var(--cond); font-weight: 600; color: var(--texto-2); }
.porque { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; font-size: .95rem; }
.porque li { display: grid; grid-template-columns: 20px 1fr; gap: 8px; }
.porque li.ardeu svg { color: var(--mau-madeira); }
.porque li.travou svg { color: var(--bom-madeira); }
.criterios { list-style: none; padding: 0; margin: 0; }
.criterios li { display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px dashed var(--madeira-3); color: var(--texto-2); }
.criterios li.ok { color: var(--texto); }
.criterios li.ok span:last-child { color: var(--bom-madeira); font-weight: 700; }
.longo-prazo { font-family: var(--serif); font-size: 1.05rem; color: var(--texto-2); border-left: 3px solid var(--folhosa); padding-left: 10px; }

@media (max-width: 980px) {
  .corpo { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .metricas { grid-template-columns: 1fr 1fr; }
  .metricas .metrica:last-child { grid-column: 1 / -1; }
  .valor output { font-size: 1.5rem; }
  .rotulo-parcela { font-size: 26px; stroke-width: 6; }
  .tipo-parcela { display: none; }
}
</style>
