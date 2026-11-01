<script setup>
/* Progresso como risquinhos a lápis no caderno: quatro traços e o quinto a cortá-los.
   É só decoração; o texto "Pergunta X de Y" continua a ser o que os leitores de ecrã leem. */
defineProps({ total: { type: Number, required: true }, feitas: { type: Number, required: true } });
// traços ligeiramente tortos, como feitos à mão
const TRACOS = ['M8,6 C9,16 7,26 9,36', 'M20,5 C19,15 21,26 19,37', 'M32,6 C33,17 31,27 33,36', 'M44,5 C43,16 45,26 43,36', 'M2,30 C16,24 34,16 52,9'];
</script>

<template>
  <svg class="marcas" :viewBox="`0 0 ${total >= 5 ? 56 : total * 12 + 4} 42`" aria-hidden="true">
    <path
      v-for="(d, i) in TRACOS.slice(0, total)" :key="i" :d="d"
      class="traco" :class="{ feito: i < feitas, atual: i === feitas }"
    />
  </svg>
</template>

<style scoped>
.marcas { height: 34px; width: auto; overflow: visible; }
.traco { fill: none; stroke: var(--lapis); stroke-width: 2.6; stroke-linecap: round; stroke-dasharray: 60; stroke-dashoffset: 60; opacity: .2; transition: stroke-dashoffset .5s var(--ease-saida), opacity .2s; }
.traco.atual { stroke-dashoffset: 0; opacity: .22; stroke-dasharray: 3 4; }
.traco.feito { stroke-dashoffset: 0; opacity: .9; stroke-dasharray: 60; }
</style>
