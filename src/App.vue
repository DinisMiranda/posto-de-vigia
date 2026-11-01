<script setup>
import { ref } from 'vue';
import { RotateCcw } from 'lucide-vue-next';
import CenaAbertura from './components/CenaAbertura.vue';
import PainelVigia from './components/PainelVigia.vue';
import AvisoNovidades from './components/AvisoNovidades.vue';
import JanelasCabine from './components/JanelasCabine.vue';
import { useVigiaStore } from './stores/vigia.js';
import { useRouter } from 'vue-router';

const s = useVigiaStore();
const router = useRouter();
const confirmar = ref(null);

function recomecar() {
  s.reiniciar();
  confirmar.value.close();
  router.push({ name: 'mapa' });
}
</script>

<template>
  <CenaAbertura />

  <main id="posto" tabindex="-1">
    <JanelasCabine />
    <PainelVigia />
    <RouterView v-slot="{ Component, route }">
      <Transition name="vista" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>

    <footer class="rodape">
      <p>
        Posto de Vigia · Gamificação e Narrativas Interativas, Licenciatura em Tecnologias e Desenvolvimento Web.
        Conteúdo pedagógico: confirma sempre as regras em vigor no
        <a href="https://www.icnf.pt" rel="noopener" target="_blank">ICNF</a> e o perigo de incêndio no
        <a href="https://www.ipma.pt" rel="noopener" target="_blank">IPMA</a>. Emergência: 112.
      </p>
      <button type="button" class="botao secundario pequeno" @click="confirmar.showModal()">
        <RotateCcw aria-hidden="true" /> Recomeçar
      </button>
    </footer>
  </main>

  <AvisoNovidades />

  <dialog ref="confirmar" class="confirmar" aria-labelledby="confirmar-titulo">
    <h2 id="confirmar-titulo">Recomeçar do início?</h2>
    <p>Perdes os pontos, o nível e as insígnias guardados neste navegador.</p>
    <div class="acoes">
      <button type="button" class="botao secundario no-papel" @click="confirmar.close()">Cancelar</button>
      <button type="button" class="botao primario" @click="recomecar">Recomeçar</button>
    </div>
  </dialog>
</template>

<style>
#posto {
  --pad: var(--gutter);
  min-height: 100vh;
  padding: 0 var(--pad) 40px;
  outline: none;
  /* interior da cabine: tábuas de madeira com veios, a luz quente do candeeiro e cantos na sombra */
  background:
    radial-gradient(ellipse 70% 520px at 50% 120px, rgba(246, 182, 80, .16), transparent 70%),
    radial-gradient(ellipse 140% 100% at 50% 0%, transparent 60%, rgba(0, 0, 0, .35)),
    repeating-linear-gradient(90deg, rgba(0, 0, 0, .22) 0 1px, rgba(255, 220, 170, .03) 1px 2px, transparent 2px 172px),
    var(--veios),
    var(--madeira);
  background-size: auto, auto, auto, 600px 240px, auto;
}
.vista-enter-active, .vista-leave-active { transition: opacity var(--dur-media) var(--ease-saida), transform var(--dur-media) var(--ease-saida); }
.vista-enter-from { opacity: 0; transform: translateY(12px); }
.vista-leave-to { opacity: 0; }
.rodape {
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px;
  margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--madeira-3);
  color: var(--texto-2); font-size: .9rem;
}
.rodape p { max-width: 75ch; }
.confirmar {
  border: 0; border-radius: 10px; padding: 26px 24px 22px;
  width: min(420px, calc(100% - 32px));
  background: var(--carta); color: var(--tinta);
}
.confirmar::backdrop { background: rgba(20, 14, 10, .7); }
.confirmar h2 { font-size: 1.6rem; }
.confirmar p { margin: 10px 0 18px; }
.confirmar .acoes { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }

</style>
