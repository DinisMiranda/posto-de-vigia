<script setup>
/* Opções de resposta (A, B, C). Usada no quiz, no desafio final e nos desafios de escolha. */
import { Check, X } from 'lucide-vue-next';

defineProps({
  opcoes: { type: Array, required: true },
  /** id da opção escolhida na última tentativa */
  escolhida: { type: String, default: null },
  /** id da opção certa, só quando já se pode revelar */
  certa: { type: String, default: null },
  /** opções já tentadas e erradas, ou eliminadas por uma pista */
  riscadas: { type: Array, default: () => [] },
  bloqueada: { type: Boolean, default: false },
  legenda: { type: String, required: true },
});
const emit = defineEmits(['escolher']);
const letras = 'ABCDE';
</script>

<template>
  <fieldset class="opcoes" :disabled="bloqueada">
    <legend class="sr">{{ legenda }}</legend>
    <button
      v-for="(o, i) in opcoes" :key="o.id" type="button" class="opcao"
      :class="{
        certa: certa === o.id,
        errada: riscadas.includes(o.id) || (certa && escolhida === o.id && certa !== o.id),
        escolhida: escolhida === o.id && !certa,
      }"
      :disabled="riscadas.includes(o.id)"
      :aria-pressed="escolhida === o.id"
      @click="emit('escolher', o.id)"
    >
      <span class="letra" aria-hidden="true">
        <Check v-if="certa === o.id" />
        <X v-else-if="riscadas.includes(o.id) || (certa && escolhida === o.id)" />
        <template v-else>{{ letras[i] }}</template>
      </span>
      <span class="texto">{{ o.texto }}</span>
    </button>
  </fieldset>
</template>

<style scoped>
.opcoes { border: 0; padding: 0; margin: 0; display: grid; gap: 10px; }
.opcao {
  display: grid; grid-template-columns: 36px 1fr; gap: 12px; align-items: center;
  width: 100%; min-height: 56px; padding: 10px 14px; text-align: left;
  background: #F4F5EA; color: var(--tinta);
  border: 1.5px solid rgba(35, 50, 31, .28); border-radius: 8px;
  font-size: 1.05rem; line-height: 1.35; cursor: pointer;
  transition: border-color .15s, background-color .15s, transform .1s;
}
.opcao:hover:not(:disabled) { border-color: var(--tinta); background: #FBFBF3; }
.opcao:active:not(:disabled) { transform: translateY(1px); }
.opcao:focus-visible { outline: 3px solid var(--brasa); outline-offset: 2px; }
.opcoes:disabled .opcao { cursor: default; }
.letra {
  width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
  border: 1.5px solid rgba(35, 50, 31, .45); font-weight: 700;
}
.opcao.escolhida { border-color: var(--tinta); background: #fff; box-shadow: inset 0 0 0 1px var(--tinta); }
.opcao.certa { border-color: var(--bom-papel); background: #E2EFD6; }
.opcao.certa .letra { background: var(--bom-papel); border-color: var(--bom-papel); color: #fff; }
.opcao.errada { border-color: rgba(168, 51, 26, .6); background: #F5E1D8; opacity: .8; }
.opcao.errada .letra { background: var(--mau-papel); border-color: var(--mau-papel); color: #fff; }
.opcao.errada .texto { text-decoration: line-through; text-decoration-color: rgba(168, 51, 26, .55); }
.opcao.certa { animation: certo .5s ease-out; }
.opcao.errada:not(:disabled) { animation: abanar .35s; }
@keyframes certo { 40% { transform: scale(1.015); } }
@keyframes abanar { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
</style>
