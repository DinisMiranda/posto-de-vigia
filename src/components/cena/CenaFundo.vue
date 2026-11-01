<script setup>
/* Fundos das cenas: céu, serra ao longe e chão, nas cores da cena de abertura. */
defineProps({ tipo: { type: String, required: true } });
const serra = (base, amp, f) => {
  let d = `M0,${base}`;
  for (let x = 0; x <= 1200; x += 40) d += ` L${x},${(base - amp * (0.5 + 0.5 * Math.sin(x * f + base))).toFixed(1)}`;
  return d + ' L1200,700 L0,700Z';
};
</script>

<template>
  <defs>
    <linearGradient id="ceu-dia" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DB0D0" /><stop offset="1" stop-color="#E3ECE2" /></linearGradient>
    <linearGradient id="ceu-noite" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141B3D" /><stop offset=".7" stop-color="#525E96" /><stop offset="1" stop-color="#F09A5B" /></linearGradient>
    <linearGradient id="chao-seco" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9C27A" /><stop offset="1" stop-color="#B3A65E" /></linearGradient>
    <linearGradient id="chao-noite" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E6A45" /><stop offset="1" stop-color="#4F4B32" /></linearGradient>
    <radialGradient id="brilho-lanterna"><stop offset="0" stop-color="#FFD98A" stop-opacity=".8" /><stop offset="1" stop-color="#FFD98A" stop-opacity="0" /></radialGradient>
    <radialGradient id="brilho-led"><stop offset="0" stop-color="#F4F9FF" stop-opacity=".8" /><stop offset="1" stop-color="#F4F9FF" stop-opacity="0" /></radialGradient>
    <radialGradient id="sol"><stop offset="0" stop-color="#FFF3C8" /><stop offset=".25" stop-color="#FFF1C4" stop-opacity=".9" /><stop offset="1" stop-color="#FFF1C4" stop-opacity="0" /></radialGradient>
  </defs>

  <template v-if="tipo === 'campismo'">
    <rect width="1200" height="700" fill="url(#ceu-noite)" />
    <circle v-for="i in 40" :key="i" :cx="(i * 137) % 1200" :cy="(i * 71) % 260" :r="(i % 3) * 0.5 + 0.6" fill="#ECECDC" opacity=".7" />
    <path :d="serra(330, 70, 0.006)" fill="#2A3360" />
    <path :d="serra(390, 40, 0.011)" fill="#1C2748" />
    <rect y="420" width="1200" height="280" fill="url(#chao-noite)" />
  </template>
  <template v-else>
    <rect width="1200" height="700" fill="url(#ceu-dia)" />
    <circle cx="1020" cy="110" r="120" fill="url(#sol)" />
    <path :d="serra(300, 80, 0.005)" fill="#A7BCC3" />
    <path :d="serra(360, 46, 0.009)" fill="#83A091" />
    <path :d="serra(400, 30, 0.014)" fill="#5A7D60" />
    <rect y="410" width="1200" height="290" fill="url(#chao-seco)" />
    <!-- trilho de terra -->
    <path v-if="tipo === 'trilho'" d="M560,410 C600,460 420,520 520,580 C600,630 760,640 720,700 L900,700 C920,640 720,600 650,560 C590,520 700,460 600,410Z" fill="#D9C9A3" />
    <!-- clareira de terra batida do parque de merendas -->
    <ellipse v-if="tipo === 'clareira'" cx="720" cy="505" rx="260" ry="46" fill="#D4C49A" />
    <!-- estrada -->
    <template v-if="tipo === 'estrada'">
      <path d="M0,520 C300,505 700,488 1200,470 L1200,560 C700,572 300,585 0,600Z" fill="#5B5B5B" />
      <path d="M0,560 C300,545 700,530 1200,515" stroke="#F3EADB" stroke-width="4" stroke-dasharray="40 30" fill="none" />
      <path d="M0,520 C300,505 700,488 1200,470" stroke="#8C8C8C" stroke-width="3" fill="none" />
      <path d="M0,600 C300,585 700,572 1200,560" stroke="#8C8C8C" stroke-width="3" fill="none" />
    </template>
  </template>
</template>
