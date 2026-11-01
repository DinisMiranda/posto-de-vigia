<script setup>
import { computed, defineAsyncComponent, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft, ArrowRight, RotateCcw, Zap, Map, Sparkles, Flag } from 'lucide-vue-next';
import { useVigiaStore } from '../stores/vigia.js';
import { zonaPorId, DESAFIOS, pontuar, pontosMaximos, PONTOS } from '../logica/regras.js';
import DesafioCena from '../components/DesafioCena.vue';
import DesafioEscolha from '../components/DesafioEscolha.vue';

const DesafioEncosta = defineAsyncComponent(() => import('../components/DesafioEncosta.vue'));

const props = defineProps({ id: { type: String, required: true }, desafio: { type: String, required: true } });
const s = useVigiaStore();
const route = useRoute();

const d = computed(() => DESAFIOS[props.desafio]);
const zona = computed(() => zonaPorId(props.id));
const dificil = computed(() => route.query.modo === 'dificil' && !!s.resultados[props.desafio]?.semPistas);
// Nível 1: o parque de merendas é guiado, com pistas visíveis
const guiado = computed(() => props.id === 'merendas' && !dificil.value);
const tentativa = ref(0);
const resultado = ref(null);

function terminar(r) {
  const pontos = r.pontos ?? pontuar({ acertos: r.acertos, pistas: r.pistas, dificil: dificil.value, perfeito: r.perfeito });
  const anterior = s.resultados[props.desafio]?.pontos || 0;
  const { ganhos, zonaFechada } = s.concluirDesafio(props.desafio, { acertos: r.acertos, pistas: r.pistas, pontos, dificil: dificil.value && r.perfeito });
  resultado.value = { ...r, pontos, ganhos, anterior, zonaFechada };
}
function repetir() { resultado.value = null; tentativa.value += 1; }

const indice = computed(() => zona.value.desafios.indexOf(props.desafio));
const proximo = computed(() => zona.value.desafios[indice.value + 1] || null);
const proximaZona = computed(() => s.sugestao && s.sugestao.id !== props.id ? s.sugestao : null);
const max = computed(() => pontosMaximos(props.desafio) + (d.value.tipo !== 'encosta' ? PONTOS.dificil : 0));
</script>

<template>
  <div class="vista-desafio">
    <RouterLink class="voltar" :to="{ name: 'zona', params: { id } }"><ArrowLeft aria-hidden="true" /> {{ zona.nome }}</RouterLink>
    <div class="cabecalho-vista">
      <div>
        <p class="etiqueta">
          <template v-if="dificil"><Zap aria-hidden="true" /> Modo difícil · </template>
          Desafio {{ indice + 1 }} de {{ zona.desafios.length }}
        </p>
        <h2>{{ d.titulo }}</h2>
        <p v-if="d.tipo !== 'cena'" class="lead">{{ d.instrucao }}</p>
      </div>
    </div>

    <template v-if="!resultado">
      <DesafioCena v-if="d.tipo === 'cena'" :key="'c' + tentativa" :desafio="d" :guiado="guiado" :dificil="dificil" @terminar="terminar" />
      <DesafioEscolha v-else-if="d.tipo === 'escolha'" :key="'e' + tentativa" :desafio="d" :dificil="dificil" @terminar="terminar" />
      <DesafioEncosta v-else :key="'n' + tentativa" @terminar="terminar" />
    </template>

    <section v-else class="papel resultado" aria-live="polite">
      <p class="etiqueta-r">Resultado</p>
      <p class="total"><strong>{{ resultado.pontos }}</strong> / {{ max }} pontos</p>
      <ul class="contas">
        <li v-if="d.tipo !== 'encosta'"><span>{{ resultado.acertos }} × 10 ({{ d.tipo === 'cena' ? 'riscos encontrados' : 'certas à primeira' }})</span><span>+{{ resultado.acertos * 10 }}</span></li>
        <li v-if="d.tipo !== 'encosta'" :class="{ falhou: resultado.pistas > 0 }"><span>Bónus sem pistas</span><span>{{ resultado.pistas > 0 ? 'usaste uma pista' : '+5' }}</span></li>
        <li v-if="dificil"><span>Bónus do modo difícil, sem erros</span><span>{{ resultado.perfeito ? '+5' : 'houve erros' }}</span></li>
        <li v-if="d.tipo === 'encosta'"><span>Pontos da encosta (ver o relatório do verão)</span><span>+{{ resultado.pontos }}</span></li>
      </ul>
      <p class="ganhos">
        <template v-if="resultado.ganhos > 0"><Sparkles aria-hidden="true" /> Ganhaste {{ resultado.ganhos }} pontos de Vigilância.</template>
        <template v-else-if="resultado.anterior">A tua melhor tentativa continua a ser {{ resultado.anterior }} pontos. Conta só a melhor.</template>
      </p>
      <p v-if="resultado.zonaFechada" class="zona-fechada">Concluíste {{ zona.comArtigo }}. Os dados desta zona já estão no Observatório.</p>

      <div class="acoes">
        <RouterLink v-if="proximo" class="botao primario" :to="{ name: 'desafio', params: { id, desafio: proximo } }">Próximo desafio <ArrowRight aria-hidden="true" /></RouterLink>
        <RouterLink v-else-if="proximaZona" class="botao primario" :to="{ name: 'zona', params: { id: proximaZona.id } }">Ir para {{ proximaZona.comArtigo }} <ArrowRight aria-hidden="true" /></RouterLink>
        <RouterLink v-else-if="s.eGuardiao && s.desafioFinal === null" class="botao primario" :to="{ name: 'desafio-final' }"><Flag aria-hidden="true" /> Ir para o desafio final</RouterLink>
        <RouterLink v-else class="botao primario" :to="{ name: 'mapa' }"><Map aria-hidden="true" /> Voltar ao mapa</RouterLink>
        <button type="button" class="botao no-papel" @click="repetir"><RotateCcw aria-hidden="true" /> Repetir</button>
        <RouterLink v-if="!dificil && s.resultados[desafio]?.semPistas && d.tipo !== 'encosta'" class="botao no-papel" :to="{ name: 'desafio', params: { id, desafio }, query: { modo: 'dificil' } }">
          <Zap aria-hidden="true" /> Tentar o modo difícil
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.etiqueta { color: var(--lampada); }
.resultado { padding: 26px 26px 28px; max-width: 640px; }
.etiqueta-r { font-size: .8rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #4D5A47; }
.total { font-family: var(--serif); font-size: 1.4rem; margin-top: 4px; }
.total strong { font-size: 3.4rem; line-height: 1; }
.contas { list-style: none; padding: 0; margin: 14px 0 0; border-top: 1px dashed rgba(35, 50, 31, .35); }
.contas li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed rgba(35, 50, 31, .35); font-variant-numeric: tabular-nums; }
.contas li span:last-child { font-weight: 700; }
.contas li.falhou span:last-child { color: var(--mau-papel); font-weight: 600; }
.ganhos { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-weight: 600; color: var(--bom-papel); min-height: 1.5em; }
.zona-fechada { margin-top: 8px; font-family: var(--serif); font-size: 1.15rem; }
.acoes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
</style>
