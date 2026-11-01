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
        <!-- círculo a lápis à volta da letra escolhida -->
        <svg class="circulo" viewBox="0 0 48 48"><path d="M27,5 C39,6 45,15 43,26 C41,38 31,44 20,42 C9,40 3,31 5,20 C7,10 15,4 26,7" /></svg>
      </span>
      <span class="texto"><span class="realce">{{ o.texto }}</span></span>
    </button>
  </fieldset>
</template>

<style scoped>
.opcoes { border: 0; padding: 0; margin: 0; display: grid; gap: 10px; }
.opcao {
  position: relative;
  display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: center;
  width: 100%; min-height: 58px; padding: 10px 14px 10px 10px; text-align: left;
  background: rgba(255, 253, 245, .5); color: var(--tinta);
  border: 1px solid rgba(35, 50, 31, .2); border-radius: 6px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, .6) inset, 0 1px 2px rgba(60, 40, 10, .08);
  font-size: 1.05rem; line-height: 1.35; cursor: pointer;
  transition: background-color var(--dur-curta), border-color var(--dur-curta), box-shadow var(--dur-media) var(--ease-saida), transform var(--dur-curta) var(--ease-saida);
}
.opcao:hover:not(:disabled) { background: rgba(255, 253, 245, .92); border-color: rgba(35, 50, 31, .45); transform: translateY(-2px); box-shadow: 0 1px 0 rgba(255, 255, 255, .7) inset, 0 8px 16px -10px rgba(60, 40, 10, .5); }
.opcao:active:not(:disabled) { transform: translateY(0) scale(.99); box-shadow: 0 1px 1px rgba(60, 40, 10, .2) inset; transition-duration: .06s; }
.opcao:focus-visible { outline: 3px solid var(--brasa); outline-offset: 2px; }
.opcoes:disabled .opcao { cursor: default; }

.letra {
  position: relative;
  width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
  border: 1.5px solid rgba(59, 58, 58, .55);
  font-family: var(--mao); font-size: 1.45rem; font-weight: 700; color: var(--lapis);
  transition: background-color var(--dur-media), border-color var(--dur-media), color var(--dur-media);
}
.letra svg:not(.circulo) { width: 20px; height: 20px; }
.circulo { position: absolute; inset: -7px; width: calc(100% + 14px); height: calc(100% + 14px); pointer-events: none; overflow: visible; }
.circulo path { fill: none; stroke: var(--lapis); stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 150; stroke-dashoffset: 150; transition: stroke-dashoffset .45s var(--ease-saida); }
.texto { padding: 2px 0; }
/* marca-texto que corre por baixo do texto escolhido */
.realce {
  background-image: linear-gradient(transparent 58%, rgba(240, 196, 70, .55) 58%, rgba(240, 196, 70, .55) 92%, transparent 92%);
  background-repeat: no-repeat; background-size: 0% 100%;
  transition: background-size .45s var(--ease-saida);
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}

.opcao.escolhida { border-color: var(--lapis); background: rgba(255, 253, 245, .95); }
.opcao.escolhida .circulo path { stroke-dashoffset: 0; }
.opcao.escolhida .letra { border-color: transparent; }
.opcao.escolhida .realce { background-size: 100% 100%; }

.opcao.certa { border-color: var(--bom-papel); background: #E2EFD6; animation: certo .5s var(--ease-mola); }
.opcao.certa .letra { background: var(--bom-papel); border-color: var(--bom-papel); color: #fff; }
.opcao.certa .realce { background-image: linear-gradient(transparent 58%, rgba(120, 190, 90, .45) 58%, rgba(120, 190, 90, .45) 92%, transparent 92%); background-size: 100% 100%; }
.opcao.errada { border-color: rgba(168, 51, 26, .55); background: #F3E2D8; opacity: .85; }
.opcao.errada .letra { background: var(--mau-papel); border-color: var(--mau-papel); color: #fff; }
.opcao.errada .texto { text-decoration: line-through; text-decoration-color: rgba(59, 58, 58, .7); text-decoration-thickness: 2px; }
.opcao.errada:not(:disabled) { animation: abanar .35s; }
@keyframes certo { 40% { transform: scale(1.015); } }
@keyframes abanar { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
</style>
