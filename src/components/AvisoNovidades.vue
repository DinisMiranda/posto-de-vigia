<script setup>
/* Mostra, uma de cada vez, as novidades da store: subida de nível e insígnias ganhas. */
import { computed, nextTick, ref, watch } from 'vue';
import { useVigiaStore } from '../stores/vigia.js';
import { NIVEIS, INSIGNIAS } from '../logica/regras.js';
import InsigniaArte from './InsigniaArte.vue';

const s = useVigiaStore();
const dialogo = ref(null);
const botao = ref(null);
const atual = computed(() => s.novidades[0] || null);

const conteudo = computed(() => {
  const n = atual.value;
  if (!n) return null;
  if (n.tipo === 'insignia') {
    const i = INSIGNIAS.find(x => x.id === n.id);
    return { etiqueta: 'Insígnia ganha', titulo: i.nome, texto: i.criterio, insignia: i.id };
  }
  const nv = NIVEIS.find(x => x.id === n.id);
  const textos = {
    vigilante: 'Abriram-se o parque de campismo, o trilho pedestre e a estrada do parque. Os casos são menos óbvios.',
    guardiao: 'Tens acesso completo ao Observatório e ao desafio final: “Qual foi a causa?”.',
  };
  return { etiqueta: 'Subiste de nível', titulo: nv.nome, texto: textos[nv.id] };
});

watch(atual, async n => {
  await nextTick();
  if (n && !dialogo.value?.open) { dialogo.value?.showModal(); botao.value?.focus(); }
  if (!n && dialogo.value?.open) dialogo.value.close();
}, { immediate: true });

function seguinte() { s.novidades.shift(); }
</script>

<template>
  <dialog ref="dialogo" class="novidade" aria-labelledby="novidade-titulo" @cancel.prevent="seguinte">
    <template v-if="conteudo">
      <div class="arte" :class="{ nivel: !conteudo.insignia }">
        <InsigniaArte v-if="conteudo.insignia" :id="conteudo.insignia" />
        <svg v-else viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="56" fill="#F0B43C" />
          <path d="M60 24 L70 48 L96 50 L76 66 L82 92 L60 78 L38 92 L44 66 L24 50 L50 48 Z" fill="#2E2119" />
        </svg>
      </div>
      <p class="etiqueta">{{ conteudo.etiqueta }}</p>
      <h2 id="novidade-titulo">{{ conteudo.titulo }}</h2>
      <p class="texto">{{ conteudo.texto }}</p>
      <button ref="botao" type="button" class="botao primario" @click="seguinte">Continuar</button>
    </template>
  </dialog>
</template>

<style scoped>
.novidade {
  border: 0; padding: 30px 28px 26px; border-radius: 10px;
  width: min(420px, calc(100% - 32px));
  background: var(--carta); color: var(--tinta); text-align: center;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, .7);
}
.novidade[open] { animation: entrar .45s cubic-bezier(.2, 1.3, .4, 1); }
.novidade::backdrop { background: rgba(20, 14, 10, .7); }
@keyframes entrar { from { transform: scale(.85) translateY(10px); opacity: 0; } }
.arte { width: 132px; margin: 0 auto 14px; animation: brilho 1.4s ease-out; }
@keyframes brilho { from { transform: rotate(-12deg) scale(.6); } 70% { transform: rotate(4deg) scale(1.05); } }
.etiqueta { color: var(--brasa-escura); }
h2 { font-size: 2rem; margin-top: 4px; }
.texto { font-family: var(--serif); font-size: 1.15rem; line-height: 1.4; margin: 10px 0 20px; }
</style>
