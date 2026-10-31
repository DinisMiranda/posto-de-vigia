<script setup>
import { ref } from 'vue';
import { RotateCcw } from 'lucide-vue-next';
import CenaAbertura from './components/CenaAbertura.vue';
import PainelVigia from './components/PainelVigia.vue';
import AvisoNovidades from './components/AvisoNovidades.vue';
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
    <div class="janelas" aria-hidden="true">
      <span v-for="i in 4" :key="i" class="vidro"></span>
    </div>
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
  background:
    radial-gradient(ellipse 60% 420px at 40% 150px, rgba(240, 180, 60, .13), transparent 70%),
    repeating-linear-gradient(90deg, rgba(0, 0, 0, .09) 0 1px, transparent 1px 160px),
    var(--madeira);
}
.janelas {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
  margin: 0 calc(-1 * var(--pad));
  padding: 14px var(--pad) 0;
  height: 110px;
  background: #4A3627;
  border-bottom: 12px solid #4A3627;
  box-shadow: 0 10px 20px -8px rgba(0, 0, 0, .5);
}
.vidro {
  border-radius: 2px 2px 0 0;
  background:
    linear-gradient(transparent 62%, #0F172B 62% 70%, #0A0F1E 70%),
    radial-gradient(circle at 20% 30%, rgba(236, 236, 220, .8) 0 1px, transparent 1.5px),
    radial-gradient(circle at 70% 18%, rgba(236, 236, 220, .7) 0 1px, transparent 1.5px),
    radial-gradient(circle at 45% 45%, rgba(236, 236, 220, .6) 0 1px, transparent 1.5px),
    linear-gradient(#141B3D, #2A3360);
  box-shadow: inset 0 0 0 3px #2E2119;
}
.vista-enter-active, .vista-leave-active { transition: opacity .22s, transform .22s; }
.vista-enter-from { opacity: 0; transform: translateY(8px); }
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
@media (max-width: 520px) {
  .janelas { height: 70px; gap: 8px; }
}
</style>
