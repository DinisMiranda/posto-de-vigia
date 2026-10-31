<script setup>
/* Quiz inicial (ponto de partida do KPI) e desafio final "Qual foi a causa?". */
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ArrowRight, Search, ClipboardCheck } from 'lucide-vue-next';
import { useVigiaStore } from '../stores/vigia.js';
import { zonaPorId } from '../logica/regras.js';
import quiz from '../dados/quiz.json';
import ListaOpcoes from '../components/ListaOpcoes.vue';

const props = defineProps({ tipo: { type: String, required: true } });
const s = useVigiaStore();
const route = useRoute();
const router = useRouter();

const dados = quiz[props.tipo];
const final = props.tipo === 'final';
const indice = ref(0);
const respostas = ref([]);
const escolhida = ref(null);
const respondida = ref(false);
const terminado = ref(false);

const pergunta = computed(() => dados.perguntas[indice.value]);
const acertos = computed(() => respostas.value.filter((r, i) => r === dados.perguntas[i].certa).length);
const ultima = computed(() => indice.value === dados.perguntas.length - 1);
const jaFeito = computed(() => !final && s.quizInicial !== null);

function escolher(id) {
  if (respondida.value) return;
  escolhida.value = id;
  if (final) confirmar();
}
function confirmar() {
  if (!escolhida.value) return;
  respostas.value[indice.value] = escolhida.value;
  respondida.value = true;
  if (!final) seguinte();
}
function seguinte() {
  if (ultima.value) { terminar(); return; }
  indice.value += 1;
  escolhida.value = null;
  respondida.value = false;
  document.getElementById('quiz-pergunta')?.focus();
}
function terminar() {
  terminado.value = true;
  if (final) s.registarDesafioFinal(acertos.value);
  else s.registarQuizInicial(acertos.value);
}
function continuar() {
  const zona = route.query.seguir || 'merendas';
  router.push({ name: 'zona', params: { id: zona } });
}
function repetir() {
  indice.value = 0; respostas.value = []; escolhida.value = null; respondida.value = false; terminado.value = false;
}
const objetivo = computed(() => (s.desafioFinal ?? 0) >= 4);
</script>

<template>
  <div class="vista-quiz">
    <RouterLink class="voltar" :to="{ name: 'mapa' }"><ArrowLeft aria-hidden="true" /> Voltar ao mapa</RouterLink>

    <div class="cabecalho-vista">
      <div>
        <p class="etiqueta"><component :is="final ? Search : ClipboardCheck" aria-hidden="true" /> {{ final ? 'Nível 3 · Desafio final' : 'Nível 1 · Antes de começar' }}</p>
        <h2>{{ dados.titulo }}</h2>
        <p class="lead">{{ dados.instrucao }}</p>
      </div>
    </div>

    <!-- quiz inicial já feito -->
    <section v-if="jaFeito && !terminado" class="papel cartao">
      <h3>Já fizeste o quiz inicial</h3>
      <p>Acertaste {{ s.quizInicial }} de 5. Esse é o teu ponto de partida: vais compará-lo com o desafio final.</p>
      <button type="button" class="botao primario" @click="continuar">Continuar <ArrowRight aria-hidden="true" /></button>
    </section>

    <!-- perguntas -->
    <section v-else-if="!terminado" class="papel cartao" aria-live="polite">
      <ol class="progresso" :aria-label="`Pergunta ${indice + 1} de ${dados.perguntas.length}`">
        <li v-for="(p, i) in dados.perguntas" :key="p.id" :class="{ feita: i < indice, atual: i === indice }"></li>
      </ol>
      <p class="numero">{{ final ? 'Caso' : 'Pergunta' }} {{ indice + 1 }} de {{ dados.perguntas.length }}</p>
      <h3 id="quiz-pergunta" tabindex="-1" class="enunciado">{{ pergunta.enunciado }}</h3>

      <ListaOpcoes
        :opcoes="pergunta.opcoes" :escolhida="escolhida" :legenda="pergunta.enunciado"
        :certa="final && respondida ? pergunta.certa : null" :bloqueada="respondida" @escolher="escolher"
      />

      <div v-if="final && respondida" class="explicacao" :class="escolhida === pergunta.certa ? 'bem' : 'mal'">
        <p class="veredicto">{{ escolhida === pergunta.certa ? 'Certo.' : 'Não foi isso.' }}</p>
        <p>{{ pergunta.explicacao }}</p>
        <p class="zona-ligada">Aprendeste isto em: {{ zonaPorId(pergunta.zona).nome }}</p>
      </div>

      <div class="acoes">
        <button v-if="!final" type="button" class="botao primario" :disabled="!escolhida" @click="confirmar">
          {{ ultima ? 'Terminar' : 'Seguinte' }} <ArrowRight aria-hidden="true" />
        </button>
        <button v-else-if="respondida" type="button" class="botao primario" @click="seguinte">
          {{ ultima ? 'Ver resultado' : 'Próximo caso' }} <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </section>

    <!-- fim do quiz inicial -->
    <section v-else-if="!final" class="papel cartao fim">
      <p class="grande">{{ acertos }}<span>/5</span></p>
      <h3>Ponto de partida registado</h3>
      <p>Não mostramos as respostas agora: vais descobri-las nas zonas do parque. No fim, o desafio “Qual foi a causa?” mostra quanto aprendeste.</p>
      <button type="button" class="botao primario" @click="continuar">Ir para o parque de merendas <ArrowRight aria-hidden="true" /></button>
    </section>

    <!-- fim do desafio final: comparação com o quiz inicial (KPI do objetivo 1) -->
    <section v-else class="papel cartao fim">
      <h3>Resultado</h3>
      <div class="comparacao" role="img" :aria-label="`Quiz inicial: ${s.quizInicial ?? 0} de 5. Desafio final: ${acertos} de 5.`">
        <div class="coluna">
          <div class="barra-v"><span :style="{ height: ((s.quizInicial ?? 0) / 5) * 100 + '%' }" class="antes"></span></div>
          <p><strong>{{ s.quizInicial ?? 0 }}/5</strong><br>Quiz inicial</p>
        </div>
        <div class="coluna">
          <div class="barra-v"><span :style="{ height: (acertos / 5) * 100 + '%' }" class="depois"></span></div>
          <p><strong>{{ acertos }}/5</strong><br>Desafio final</p>
        </div>
      </div>
      <p v-if="acertos >= 4" class="objetivo bem">Reconheceste a causa em {{ acertos }} de 5 incêndios. Sabes ler os sinais que um vigia procura.</p>
      <p v-else class="objetivo">Acertaste {{ acertos }} de 5. Volta às zonas onde falhaste e tenta outra vez: conta a melhor tentativa.</p>
      <div class="acoes">
        <RouterLink class="botao primario" :to="{ name: 'cartao' }">Ver o cartão “O que fazer” <ArrowRight aria-hidden="true" /></RouterLink>
        <button v-if="!objetivo" type="button" class="botao no-papel" @click="repetir">Tentar outra vez</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.vista-quiz { max-width: 760px; margin: 0 auto; }
.etiqueta { color: var(--lampada); }
.cartao { padding: 26px 26px 28px; }
.cartao h3 { font-size: 1.5rem; }
.cartao > p { font-size: 1.05rem; margin: 10px 0 18px; }
.progresso { list-style: none; display: flex; gap: 6px; padding: 0; margin: 0 0 14px; }
.progresso li { flex: 1; height: 6px; border-radius: 3px; background: rgba(35, 50, 31, .15); }
.progresso li.feita { background: var(--tinta); }
.progresso li.atual { background: var(--brasa); }
.numero { font-weight: 600; color: #4D5A47; }
.enunciado { font-family: var(--serif); font-size: 1.45rem; line-height: 1.3; margin: 6px 0 18px; outline: none; }
.explicacao { margin-top: 16px; padding: 14px 16px; border-radius: 8px; border-left: 5px solid; }
.explicacao.bem { background: #E2EFD6; border-color: var(--bom-papel); }
.explicacao.mal { background: #F5E1D8; border-color: var(--mau-papel); }
.veredicto { font-weight: 700; font-size: 1.1rem; }
.zona-ligada { margin-top: 8px; font-size: .9rem; color: #4D5A47; }
.acoes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.fim { text-align: center; }
.fim .acoes { justify-content: center; }
.cartao > p.grande { font-family: var(--serif); font-size: 4rem; font-weight: 700; line-height: 1; }
.cartao > p.grande span { font-size: 1.6rem; color: #4D5A47; }
.comparacao { display: flex; justify-content: center; gap: 48px; margin: 22px 0 10px; }
.coluna { display: grid; justify-items: center; gap: 8px; }
.barra-v { width: 64px; height: 160px; background: rgba(35, 50, 31, .1); border-radius: 6px 6px 0 0; display: flex; align-items: flex-end; overflow: hidden; }
.barra-v span { width: 100%; border-radius: 6px 6px 0 0; transition: height 1.2s cubic-bezier(.2, .8, .2, 1); }
.antes { background: #9AA58F; }
.depois { background: var(--bom-papel); }
.objetivo { font-family: var(--serif); font-size: 1.2rem; max-width: 46ch; margin: 14px auto 0; }
.objetivo.bem { color: var(--bom-papel); }
</style>
