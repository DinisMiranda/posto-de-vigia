<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Siren, ArrowRight, Lock, CheckCircle2, CircleDashed, Telescope, Flag, IdCard } from 'lucide-vue-next';
import { useVigiaStore } from '../stores/vigia.js';
import { ZONAS, zonaPorId, DESAFIOS, pontosMaximos } from '../logica/regras.js';
import MapaParque from '../components/MapaParque.vue';

const s = useVigiaStore();
const router = useRouter();
const camada = ref('estado');
const escolhida = ref(null);

const selecionada = computed(() => escolhida.value || s.sugestao?.id || 'merendas');
const zona = computed(() => zonaPorId(selecionada.value));
const estado = computed(() => s.estados[selecionada.value]);
const desafios = computed(() => zona.value.desafios.map(id => ({ id, ...DESAFIOS[id], resultado: s.resultados[id], max: pontosMaximos(id) })));

const porqueBloqueada = computed(() => {
  if (estado.value !== 'bloqueada') return '';
  if (zona.value.id === 'floresta') {
    if (s.nivel === 'visitante') return 'Desbloqueia-se no nível Vigilante, depois do parque de campismo, do trilho e da estrada.';
    return 'Desbloqueia-se quando concluíres o parque de campismo, o trilho pedestre e a estrada do parque.';
  }
  return 'Desbloqueia-se quando chegares a Vigilante: conclui o parque de merendas.';
});

function entrar() {
  if (estado.value === 'bloqueada') return;
  router.push({ name: 'zona', params: { id: zona.value.id } });
}
</script>

<template>
  <div class="vista-mapa">
    <section class="mesa" aria-label="Carta do parque">
      <div class="carta papel">
        <div class="carta-topo">
          <p class="carta-nome">Parque Natural da Serra da Estrela · folha 17</p>
          <div class="vistas" role="group" aria-label="Camada do mapa">
            <button type="button" class="vista" :class="{ ativa: camada === 'estado' }" :aria-pressed="camada === 'estado'" @click="camada = 'estado'">Zonas</button>
            <button type="button" class="vista" :class="{ ativa: camada === 'risco' }" :aria-pressed="camada === 'risco'" @click="camada = 'risco'">Risco</button>
          </div>
        </div>
        <MapaParque
          :estados="s.estados" :riscos="s.riscoPorZona" :selecionada="selecionada"
          :sugerida="s.sugestao?.id" :camada="camada" @escolher="id => (escolhida = id)"
        />
        <div class="chips" role="group" aria-label="Zonas do parque">
          <button
            v-for="z in ZONAS" :key="z.id" type="button" class="chip" :class="[s.estados[z.id], { ativa: selecionada === z.id }]"
            :aria-pressed="selecionada === z.id" @click="escolhida = z.id"
          >{{ z.nome }}</button>
        </div>
        <ul class="legenda">
          <li><span class="amostra concluida"></span>Concluída</li>
          <li><span class="amostra por-explorar"></span>Por explorar</li>
          <li><span class="amostra bloqueada"></span>Bloqueada</li>
          <li><span class="amostra estrada"></span>Estrada do parque</li>
          <li><span class="amostra trilho"></span>Trilho pedestre</li>
        </ul>
      </div>
    </section>

    <aside class="caderno" aria-live="polite">
      <div v-if="s.sugestao" class="alerta">
        <p class="etiqueta"><Siren aria-hidden="true" /> Alerta do posto</p>
        <p class="alerta-texto">{{ s.sugestao.alerta }}</p>
        <button v-if="s.sugestao.id !== selecionada" type="button" class="ligacao" @click="escolhida = s.sugestao.id">
          Ver {{ s.sugestao.comArtigo }} <ArrowRight aria-hidden="true" />
        </button>
      </div>
      <div v-else-if="s.eGuardiao" class="alerta concluido">
        <p class="etiqueta"><Flag aria-hidden="true" /> Todas as zonas concluídas</p>
        <p class="alerta-texto">Chegou o desafio final: descobrir a causa de cinco incêndios.</p>
      </div>

      <article class="ficha papel">
        <p class="estado" :class="estado">
          <CheckCircle2 v-if="estado === 'concluida'" aria-hidden="true" />
          <Lock v-else-if="estado === 'bloqueada'" aria-hidden="true" />
          <CircleDashed v-else aria-hidden="true" />
          {{ estado === 'concluida' ? 'Concluída' : estado === 'bloqueada' ? 'Bloqueada' : 'Por explorar' }}
        </p>
        <h3>{{ zona.nome }}</h3>
        <p class="causa">{{ zona.causa }}</p>
        <p class="resumo">{{ zona.resumo }}</p>

        <ul class="lista-desafios">
          <li v-for="d in desafios" :key="d.id">
            <span>{{ d.titulo }}</span>
            <span v-if="d.resultado" class="pts">{{ d.resultado.pontos }}/{{ d.max }}</span>
            <span v-else class="pts muted">por fazer</span>
          </li>
        </ul>

        <p v-if="estado === 'bloqueada'" class="aviso-bloqueio">{{ porqueBloqueada }}</p>
        <div class="acoes">
          <button type="button" class="botao primario" :disabled="estado === 'bloqueada'" @click="entrar">
            {{ estado === 'concluida' ? 'Repetir a zona' : s.quizInicial === null ? 'Começar o turno' : 'Entrar na zona' }}
            <ArrowRight aria-hidden="true" />
          </button>
          <RouterLink v-if="estado === 'concluida' || s.eGuardiao" class="botao no-papel" :to="{ name: 'observatorio', params: { id: zona.id } }">
            <Telescope aria-hidden="true" /> Observatório
          </RouterLink>
        </div>
      </article>

      <nav class="atalhos" aria-label="Outras áreas do posto">
        <RouterLink class="botao secundario" :to="{ name: 'observatorio' }"><Telescope aria-hidden="true" /> Observatório</RouterLink>
        <RouterLink v-if="s.eGuardiao" class="botao primario" :to="{ name: 'desafio-final' }"><Flag aria-hidden="true" /> Desafio final</RouterLink>
        <RouterLink v-if="s.zonasConcluidas > 0" class="botao secundario" :to="{ name: 'cartao' }"><IdCard aria-hidden="true" /> Cartão “O que fazer”</RouterLink>
      </nav>
    </aside>
  </div>
</template>

<style scoped>
.vista-mapa { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 380px); gap: 28px; align-items: start; }
.carta { padding: 14px 14px 12px; }
.carta-topo { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.carta-nome { font-family: var(--serif); font-style: italic; font-size: 1.1rem; }
.vistas { display: inline-flex; border: 1.5px solid var(--tinta); border-radius: var(--raio); overflow: hidden; }
.vista { min-height: 40px; padding: 0 16px; border: 0; background: transparent; cursor: pointer; color: var(--tinta); font-weight: 600; }
.vista + .vista { border-left: 1.5px solid var(--tinta); }
.vista:hover { background: rgba(35, 50, 31, .08); }
.vista.ativa { background: var(--tinta); color: var(--carta); }
.vista:focus-visible { outline-offset: -4px; outline-color: var(--brasa); }
.chips { display: none; }
@media (max-width: 640px) {
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip { min-height: 38px; padding: 0 12px; border-radius: 99px; border: 1.5px solid rgba(35, 50, 31, .4); background: transparent; color: var(--tinta); font-weight: 600; font-size: .9rem; cursor: pointer; }
  .chip.concluida { border-color: #2F6B3A; }
  .chip.bloqueada { color: #6E6E64; border-style: dashed; }
  .chip.ativa { background: var(--tinta); color: var(--carta); border-color: var(--tinta); }
}
.legenda { list-style: none; display: flex; flex-wrap: wrap; gap: 6px 18px; padding: 0; margin: 10px 2px 0; font-size: .9rem; }
.legenda li { display: inline-flex; align-items: center; gap: 7px; }
.amostra { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--tinta); display: inline-block; }
.amostra.concluida { background: #2F6B3A; border-color: #1E4A26; }
.amostra.por-explorar { background: #FFFDF5; border-color: #C77D12; border-width: 3px; }
.amostra.bloqueada { background: #CFCFC4; border-color: #8C8C80; }
.amostra.estrada { border-radius: 2px; height: 6px; width: 22px; background: #E7B85C; border: 1.5px solid #23321F; }
.amostra.trilho { border-radius: 0; height: 0; width: 22px; border: 0; border-top: 2px dashed #8A3B1E; }

.caderno { display: grid; gap: 16px; position: sticky; top: 16px; }
.alerta { background: rgba(217, 72, 28, .14); border: 1px solid rgba(217, 72, 28, .5); border-left: 5px solid var(--brasa); border-radius: var(--raio); padding: 14px 16px; }
.alerta.concluido { background: rgba(140, 191, 104, .12); border-color: rgba(140, 191, 104, .5); border-left-color: var(--folhosa); }
.alerta .etiqueta { color: var(--mau-madeira); }
.alerta.concluido .etiqueta { color: var(--bom-madeira); }
.alerta-texto { font-family: var(--serif); font-size: 1.2rem; line-height: 1.35; margin-top: 6px; }
.ligacao { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; background: none; border: 0; padding: 0; color: var(--lampada); font-weight: 600; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }

.ficha { padding: 20px 20px 22px; }
.ficha h3 { font-size: 1.8rem; margin-top: 6px; }
.estado { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: .9rem; }
.estado.concluida { color: var(--bom-papel); }
.estado.bloqueada { color: #6E6E64; }
.estado.por-explorar { color: #8A5208; }
.causa { font-weight: 600; margin-top: 4px; color: #4D5A47; }
.resumo { font-family: var(--serif); font-size: 1.1rem; line-height: 1.4; margin-top: 12px; }
.lista-desafios { list-style: none; padding: 0; margin: 16px 0 0; border-top: 1px dashed rgba(35, 50, 31, .35); }
.lista-desafios li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px dashed rgba(35, 50, 31, .35); }
.pts { font-weight: 700; font-variant-numeric: tabular-nums; }
.pts.muted { font-weight: 500; color: #6E7468; }
.aviso-bloqueio { margin-top: 14px; font-size: .95rem; color: #5F665B; }
.acoes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.atalhos { display: flex; flex-wrap: wrap; gap: 10px; }

@media (max-width: 980px) {
  .vista-mapa { grid-template-columns: 1fr; }
  .caderno { position: static; }
}
</style>
