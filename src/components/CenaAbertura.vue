<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { ChevronsDown } from 'lucide-vue-next';
import { iniciarCena } from '../cena/cena.js';
import '../cena/intro.css';

const historia = ref(null);
const canvas = ref(null);
const relogio = ref(null);
const humidade = ref(null);
const titulo = ref(null);
const hud = ref(null);
const diario = ref(null);
let parar = null;

const entradas = [
  { de: 0.15, ate: 0.34, texto: 'Turno da manhã. Visibilidade a 40 km, nada a reportar. Daqui vê-se a serra toda: o eucaliptal a norte, o pinhal velho, a aldeia no vale.' },
  { de: 0.38, ate: 0.55, texto: 'Fim de tarde. Humidade a 18% e o vento a rodar para leste. Há três semanas que não chove.' },
  { de: 0.66, ate: 0.81, texto: 'Coluna de fumo a noroeste. Encosta Norte, eucaliptal por limpar. Alerta dado à central.' },
  { de: 0.84, ate: 0.955, texto: 'O fogo desta noite já não se evita. Os próximos dez verões decidem-se aqui dentro, no mapa.' },
];

onMounted(() => {
  parar = iniciarCena({
    canvas: canvas.value,
    historia: historia.value,
    relogio: relogio.value,
    humidade: humidade.value,
    titulo: titulo.value,
    hud: hud.value,
    entradas: [...diario.value.children],
    aoEntrar: dentro => document.body.classList.toggle('na-cabine', dentro),
  });
});
onBeforeUnmount(() => parar?.());
</script>

<template>
  <a class="saltar" href="#posto">Saltar para o mapa</a>

  <section id="historia" ref="historia" aria-label="Introdução: um dia no posto de vigia">
    <div class="palco">
      <canvas id="cena" ref="canvas" aria-hidden="true"></canvas>

      <div class="hud-intro" ref="hud">
        <p class="marca">Posto de Vigia</p>
        <dl class="leituras">
          <div><dt>Hora</dt><dd ref="relogio">07:00</dd></div>
          <div><dt>Humidade</dt><dd ref="humidade">54%</dd></div>
        </dl>
      </div>

      <div class="titulo" ref="titulo">
        <h1>Posto de Vigia</h1>
        <p>Dez anos para gerir a serra. Lucro rápido ou uma floresta que aguenta o fogo?</p>
        <p class="deixa"><ChevronsDown aria-hidden="true" /> Desce para começar o turno</p>
      </div>

      <ol class="diario" ref="diario" aria-label="Diário do vigia">
        <li v-for="e in entradas" :key="e.de" :data-de="e.de" :data-ate="e.ate">{{ e.texto }}</li>
      </ol>
    </div>
  </section>
</template>
