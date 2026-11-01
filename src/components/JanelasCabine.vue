<script setup>
/* As janelas da cabine: a mesma serra da abertura, já de noite, com o clarão do incêndio
   a noroeste. Liga o fim da cena (o zoom para dentro da janela) ao interior do posto. */
const serra = (base, amp, f, fase) => {
  let d = `M0,${base}`;
  for (let x = 0; x <= 1200; x += 24) d += ` L${x},${(base - amp * (0.5 + 0.5 * Math.sin(x * f + fase)) - amp * 0.3 * Math.sin(x * f * 2.7 + fase)).toFixed(1)}`;
  return d + ' L1200,160 L0,160Z';
};
const estrelas = Array.from({ length: 70 }, (_, i) => ({ x: (i * 173) % 1200, y: (i * 37) % 70 + 4, r: (i % 4) * 0.25 + 0.5, d: (i % 7) * 0.6 }));
</script>

<template>
  <div class="janelas" aria-hidden="true">
    <svg class="vista" viewBox="0 0 1200 160" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="jc-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0E1434" /><stop offset=".75" stop-color="#232B57" /><stop offset="1" stop-color="#3A2E52" />
        </linearGradient>
        <radialGradient id="jc-clarao" cx="230" cy="112" r="260" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#FF8A3A" stop-opacity=".75" /><stop offset=".35" stop-color="#D9481C" stop-opacity=".28" /><stop offset="1" stop-color="#D9481C" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="160" fill="url(#jc-ceu)" />
      <circle v-for="(e, i) in estrelas" :key="i" :cx="e.x" :cy="e.y" :r="e.r" class="estrela" :style="{ animationDelay: e.d + 's' }" />
      <path d="M1020,34 a14,14 0 1,0 12,22 a11,11 0 1,1 -12,-22Z" fill="#F0ECD6" opacity=".9" />
      <rect width="1200" height="160" fill="url(#jc-clarao)" class="clarao" />
      <path :d="serra(112, 26, 0.006, 1)" fill="#232A52" />
      <!-- frente de fogo na cumeada distante -->
      <g class="frente">
        <path d="M150,100 Q190,92 230,98 T320,96" stroke="#FFB347" stroke-width="2.4" fill="none" stroke-linecap="round" />
        <path d="M160,99 l3,-7 l3,7 M205,95 l3,-9 l3,9 M262,97 l3,-8 l3,8 M300,96 l4,-11 l4,11" stroke="#FFD27A" stroke-width="1.6" fill="none" />
      </g>
      <path d="M230,92 C220,70 250,58 238,36 C230,22 250,12 244,0" stroke="#7A5E6A" stroke-width="16" fill="none" opacity=".35" stroke-linecap="round" />
      <path :d="serra(132, 22, 0.009, 4)" fill="#161D3A" />
      <path :d="serra(150, 16, 0.014, 2)" fill="#0B1022" />
    </svg>
    <div class="caixilhos">
      <span v-for="i in 4" :key="i" class="vidro"></span>
    </div>
    <div class="parapeito"></div>
  </div>
</template>

<style scoped>
.janelas { position: relative; height: 150px; margin: 0 calc(-1 * var(--gutter)); overflow: hidden; background: #0B1022; }
.vista { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.estrela { fill: #ECECDC; opacity: .7; animation: cintilar 3.2s ease-in-out infinite alternate; }
.clarao { animation: clarao 2.6s ease-in-out infinite alternate; transform-origin: 230px 112px; }
.frente { animation: tremer .6s steps(2) infinite; }
@keyframes cintilar { to { opacity: .25; } }
@keyframes clarao { to { opacity: .72; } }
@keyframes tremer { 50% { opacity: .75; } }
/* caixilhos de madeira, com espessura e luz do candeeiro por dentro */
.caixilhos {
  position: absolute; inset: 0;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
  padding: 14px var(--gutter) 0;
  background:
    linear-gradient(90deg, #4A3627 0 var(--gutter), transparent var(--gutter) calc(100% - var(--gutter)), #4A3627 calc(100% - var(--gutter))),
    linear-gradient(#4A3627 0 14px, transparent 14px);
}
.vidro {
  position: relative;
  box-shadow: 0 0 0 8px #4A3627, inset 0 0 0 2px #2E2119, inset 0 10px 18px -8px rgba(0, 0, 0, .7);
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, .07) 38%, transparent 46%, transparent 62%, rgba(255, 255, 255, .04) 66%, transparent 70%);
}
.vidro::after { content: ""; position: absolute; left: 0; right: 0; top: 34%; height: 3px; background: #4A3627; box-shadow: 0 1px 0 rgba(255, 220, 160, .12); }
.parapeito {
  position: absolute; left: 0; right: 0; bottom: 0; height: 14px;
  background: linear-gradient(#6B4E37, #4A3627 40%, #3A2A1F);
  box-shadow: 0 1px 0 rgba(255, 220, 160, .18) inset, 0 12px 22px -6px rgba(0, 0, 0, .7);
}
@media (max-width: 520px) {
  .janelas { height: 96px; }
  .caixilhos { gap: 10px; }
}
</style>
