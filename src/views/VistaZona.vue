<script setup>
import { computed } from 'vue';
import { ArrowLeft, ArrowRight, Search, MessageSquareText, Mountain, CheckCircle2, Zap, Telescope, Lightbulb } from 'lucide-vue-next';
import { useVigiaStore } from '../stores/vigia.js';
import { zonaPorId, DESAFIOS, pontosMaximos } from '../logica/regras.js';

const props = defineProps({ id: { type: String, required: true } });
const s = useVigiaStore();
s.abrirZona(props.id);

const zona = computed(() => zonaPorId(props.id));
const concluida = computed(() => s.estados[props.id] === 'concluida');
const TIPOS = {
  cena: { nome: 'Encontrar o risco', icone: Search, texto: 'Toca nas situações que podem começar um incêndio.' },
  escolha: { nome: 'Decidir', icone: MessageSquareText, texto: 'Escolhe o que fazer e percebe porquê.' },
  encosta: { nome: 'Gerir a encosta', icone: Mountain, texto: 'Quatro estações, um orçamento e um verão no fim.' },
};
const desafios = computed(() => zona.value.desafios.map((id, i) => {
  const d = DESAFIOS[id];
  const r = s.resultados[id];
  const anteriorFeito = i === 0 || !!s.resultados[zona.value.desafios[i - 1]];
  return { id, ...d, r, max: pontosMaximos(id), tipoInfo: TIPOS[d.tipo], disponivel: anteriorFeito || concluida.value };
}));
</script>

<template>
  <div class="vista-zona">
    <RouterLink class="voltar" :to="{ name: 'mapa' }"><ArrowLeft aria-hidden="true" /> Voltar ao mapa</RouterLink>
    <div class="cabecalho-vista">
      <div>
        <p class="etiqueta">{{ zona.causa }}</p>
        <h2>{{ zona.nome }}</h2>
        <p class="lead">{{ zona.resumo }}</p>
      </div>
      <p v-if="concluida" class="selo"><CheckCircle2 aria-hidden="true" /> Zona concluída</p>
    </div>

    <ol class="desafios">
      <li v-for="(d, i) in desafios" :key="d.id" class="papel desafio" :class="{ feito: d.r, indisponivel: !d.disponivel }">
        <p class="passo">Desafio {{ i + 1 }} · <component :is="d.tipoInfo.icone" aria-hidden="true" /> {{ d.tipoInfo.nome }}</p>
        <h3>{{ d.titulo }}</h3>
        <p class="texto">{{ d.tipoInfo.texto }}</p>
        <p class="categoria">{{ d.categoria === 'prevencao' ? 'Prevenção' : 'Causas' }}</p>
        <div class="rodape-desafio">
          <p v-if="d.r" class="pontos">
            <strong>{{ d.r.pontos }}</strong> / {{ d.max }} pontos
            <span v-if="d.r.semPistas" class="sem-pistas">sem pistas</span>
            <span v-if="d.r.dificil" class="sem-pistas dificil">modo difícil</span>
          </p>
          <p v-else-if="!d.disponivel" class="pontos muted">Faz primeiro o desafio {{ i }}</p>
          <p v-else class="pontos muted">Até {{ d.max }} pontos</p>
          <div class="botoes">
            <RouterLink v-if="d.disponivel" class="botao" :class="d.r ? 'no-papel' : 'primario'" :to="{ name: 'desafio', params: { id, desafio: d.id } }">
              {{ d.r ? 'Repetir' : 'Começar' }} <ArrowRight aria-hidden="true" />
            </RouterLink>
            <RouterLink v-if="d.r?.semPistas && d.tipo !== 'encosta'" class="botao no-papel" :to="{ name: 'desafio', params: { id, desafio: d.id }, query: { modo: 'dificil' } }">
              <Zap aria-hidden="true" /> Modo difícil
            </RouterLink>
          </div>
        </div>
      </li>
    </ol>

    <section v-if="concluida" class="dica">
      <p class="etiqueta"><Lightbulb aria-hidden="true" /> O que fazer</p>
      <p class="texto-dica">{{ zona.dica }}</p>
      <RouterLink class="botao secundario" :to="{ name: 'observatorio', params: { id } }"><Telescope aria-hidden="true" /> Ver os dados desta zona no Observatório</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.etiqueta { color: var(--lampada); }
.selo { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: var(--bom-madeira); background: rgba(140, 191, 104, .14); border: 1px solid rgba(140, 191, 104, .4); padding: 8px 14px; border-radius: 99px; }
.desafios { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
.desafio { padding: 20px 22px; display: flex; flex-direction: column; gap: 6px; }
.desafio.indisponivel { opacity: .6; }
.passo { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: .9rem; color: #4D5A47; }
.desafio h3 { font-size: 1.6rem; }
.texto { font-size: 1.05rem; }
.categoria { font-size: .8rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6E7468; }
.rodape-desafio { margin-top: auto; padding-top: 14px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; border-top: 1px dashed rgba(35, 50, 31, .3); }
.pontos { font-variant-numeric: tabular-nums; }
.pontos strong { font-size: 1.4rem; }
.pontos.muted { color: #6E7468; }
.sem-pistas { margin-left: 6px; font-size: .8rem; font-weight: 700; color: var(--bom-papel); background: #E2EFD6; padding: 2px 8px; border-radius: 99px; }
.sem-pistas.dificil { color: #8A3B1E; background: #F5E1D8; }
.botoes { display: flex; flex-wrap: wrap; gap: 8px; }
.dica { margin-top: 26px; padding: 18px 20px; border-radius: var(--raio); background: rgba(140, 191, 104, .1); border: 1px solid rgba(140, 191, 104, .35); display: grid; gap: 12px; justify-items: start; }
.dica .etiqueta { color: var(--bom-madeira); }
.texto-dica { font-family: var(--serif); font-size: 1.25rem; line-height: 1.4; max-width: 60ch; }
</style>
