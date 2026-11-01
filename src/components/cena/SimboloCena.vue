<script setup>
/* Biblioteca de desenhos das cenas dos desafios. Cada símbolo é desenhado com a base em (0,0),
   a crescer para cima (y negativo), à escala 1. */
defineProps({ s: { type: String, required: true }, cor: { type: String, default: '#3F7FA6' } });
</script>

<template>
  <!-- ===== vegetação ===== -->
  <g v-if="s === 'pinheiro'">
    <rect x="-6" y="-46" width="12" height="46" fill="#6B4A2F" />
    <path d="M0,-176 L42,-98 L-42,-98Z M0,-146 L52,-62 L-52,-62Z M0,-110 L60,-34 L-60,-34Z" fill="#3E6045" />
    <path d="M0,-176 L42,-98 L0,-98Z M0,-146 L52,-62 L0,-62Z M0,-110 L60,-34 L0,-34Z" fill="#2F4F36" />
  </g>
  <g v-else-if="s === 'carvalho'">
    <path d="M-8,0 L-6,-60 L-22,-82 M6,-60 L8,0 M0,-60 L18,-86" stroke="#6B4A2F" stroke-width="12" fill="none" stroke-linecap="round" />
    <circle cx="-36" cy="-84" r="34" fill="#5A7D60" />
    <circle cx="34" cy="-88" r="36" fill="#4F7356" />
    <circle cx="0" cy="-118" r="40" fill="#5A7D60" />
    <circle cx="-8" cy="-96" r="30" fill="#66896B" />
  </g>
  <g v-else-if="s === 'eucalipto'">
    <path d="M-3,0 L-2,-160 M0,-120 L22,-150" stroke="#CDBEA6" stroke-width="7" fill="none" stroke-linecap="round" />
    <ellipse cx="-16" cy="-168" rx="22" ry="34" fill="#6F9A8D" />
    <ellipse cx="20" cy="-178" rx="20" ry="32" fill="#5E8A7D" />
    <ellipse cx="2" cy="-206" rx="18" ry="26" fill="#7AA597" />
    <ellipse cx="26" cy="-142" rx="16" ry="22" fill="#6F9A8D" />
  </g>
  <g v-else-if="s === 'arbusto'">
    <path d="M-48,0 C-56,-20 -40,-36 -26,-30 C-24,-48 0,-52 8,-38 C18,-50 42,-44 40,-26 C56,-24 58,-6 48,0Z" fill="#A89B5C" />
    <path d="M-30,-4 L-36,-26 M-14,-4 L-10,-38 M4,-4 L10,-34 M22,-4 L30,-30 M36,-4 L46,-18" stroke="#7D7036" stroke-width="2.5" stroke-linecap="round" />
  </g>
  <g v-else-if="s === 'erva'" stroke="#B5A55A" stroke-width="3" stroke-linecap="round" fill="none">
    <path d="M-30,0 Q-34,-22 -42,-34 M-18,0 Q-18,-28 -12,-44 M-6,0 Q-8,-24 -20,-38 M6,0 Q8,-30 2,-48 M18,0 Q22,-22 32,-36 M30,0 Q30,-18 40,-26" />
  </g>

  <!-- ===== parque de merendas ===== -->
  <g v-else-if="s === 'mesa'">
    <path d="M-50,0 L-30,-38 M50,0 L30,-38 M-36,0 L-48,-38 M36,0 L48,-38" stroke="#6E4A2C" stroke-width="6" stroke-linecap="round" />
    <rect x="-66" y="-46" width="132" height="10" rx="3" fill="#8B5E3C" />
    <rect x="-74" y="-22" width="148" height="7" rx="3" fill="#8B5E3C" />
  </g>
  <g v-else-if="s === 'pessoa' || s === 'caminhante' || s === 'fumador'">
    <rect v-if="s === 'caminhante'" x="10" y="-72" width="16" height="30" rx="5" fill="#6B4A2F" />
    <rect x="-12" y="-34" width="10" height="34" rx="4" fill="#37474F" />
    <rect x="2" y="-34" width="10" height="34" rx="4" fill="#37474F" />
    <rect x="-15" y="-74" width="30" height="44" rx="12" :fill="cor" />
    <circle cx="0" cy="-86" r="11" fill="#C68B59" />
    <path d="M-11,-90 Q0,-104 11,-90 Z" fill="#3B2A20" />
    <template v-if="s === 'caminhante'">
      <path d="M-13,-66 L-22,-44" stroke="#C68B59" stroke-width="7" stroke-linecap="round" />
      <rect x="-28" y="-50" width="10" height="20" rx="3" fill="#3F7FA6" />
    </template>
    <template v-if="s === 'fumador'">
      <path d="M12,-66 Q24,-70 14,-84" stroke="#C68B59" stroke-width="7" fill="none" stroke-linecap="round" />
      <rect x="12" y="-90" width="14" height="3" fill="#F3EADB" />
      <circle cx="27" cy="-88.5" r="2.6" fill="#FF6A2A" class="brilho" />
      <path d="M28,-92 C34,-102 24,-108 32,-120 C38,-128 30,-134 36,-142" stroke="#9A9A9A" stroke-width="2" fill="none" opacity=".7" class="fumo" />
      <circle cx="20" cy="-40" r="1.6" fill="#888" /><circle cx="26" cy="-20" r="1.4" fill="#888" />
    </template>
  </g>
  <g v-else-if="s === 'fogueira'">
    <ellipse cx="0" cy="-2" rx="44" ry="10" fill="#3B2A20" opacity=".35" />
    <ellipse v-for="(x, i) in [-34, -20, -4, 14, 30]" :key="i" :cx="x" cy="-4" rx="9" ry="7" fill="#8C8A84" stroke="#5E5C57" stroke-width="1.5" />
    <path d="M-24,-8 L22,-20 M-20,-20 L24,-8" stroke="#5A3A22" stroke-width="7" stroke-linecap="round" />
    <g class="chamas">
      <path d="M-18,-12 C-26,-34 -8,-44 -6,-66 C6,-48 2,-36 10,-46 C20,-30 22,-18 16,-12Z" fill="#F07B2D" />
      <path d="M-8,-12 C-12,-26 0,-32 0,-46 C8,-34 6,-26 12,-30 C14,-20 12,-14 8,-12Z" fill="#FFD166" />
    </g>
    <path d="M-2,-70 C-14,-90 8,-100 -4,-122 C-12,-136 4,-150 -6,-168" stroke="#B9B4AA" stroke-width="10" fill="none" opacity=".45" stroke-linecap="round" class="fumo" />
  </g>
  <g v-else-if="s === 'cinzas'">
    <path d="M-38,0 C-30,-16 -8,-22 6,-20 C22,-18 36,-10 40,0Z" fill="#5E5A57" />
    <path d="M-24,-4 C-16,-12 -4,-14 8,-12" stroke="#4A4643" stroke-width="3" fill="none" />
    <circle cx="-12" cy="-8" r="3" fill="#FF6A2A" class="brilho" />
    <circle cx="6" cy="-12" r="2.5" fill="#FF8A3A" class="brilho" />
    <circle cx="20" cy="-6" r="2.5" fill="#FF6A2A" class="brilho" />
    <path d="M0,-22 C-8,-36 8,-44 0,-60 C-6,-72 6,-80 0,-94" stroke="#B9B4AA" stroke-width="6" fill="none" opacity=".45" stroke-linecap="round" class="fumo" />
  </g>
  <g v-else-if="s === 'descartavel'">
    <ellipse cx="0" cy="2" rx="40" ry="8" fill="#6B5A2E" opacity=".45" />
    <path d="M-30,0 L-26,-14 L26,-14 L30,0Z" fill="#C9CDD2" stroke="#8E959C" stroke-width="1.5" />
    <path d="M-24,-14 L24,-14 M-16,-14 L-14,-20 M0,-14 L0,-20 M16,-14 L14,-20" stroke="#5E5C57" stroke-width="2" />
    <path d="M-20,-20 H20" stroke="#5E5C57" stroke-width="3" />
    <path d="M-14,-24 C-18,-32 -10,-34 -12,-40 M2,-24 C-2,-34 6,-36 2,-44 M16,-24 C12,-32 20,-34 16,-40" stroke="#E9A06A" stroke-width="2" fill="none" class="fumo" />
    <path d="M-36,4 L-46,-14 M36,4 L46,-12 M-20,6 L-26,-10" stroke="#D9A54A" stroke-width="3" stroke-linecap="round" />
  </g>
  <g v-else-if="s === 'grelhador'">
    <rect x="-46" y="-56" width="92" height="56" fill="#A39E93" />
    <path d="M-46,-42 H46 M-46,-28 H46 M-46,-14 H46 M-20,-56 V-42 M14,-42 V-28 M-30,-28 V-14 M24,-14 V0" stroke="#7E796F" stroke-width="2" />
    <rect x="-40" y="-64" width="80" height="8" fill="#4A4643" />
    <path d="M-36,-64 V-58 M-24,-64 V-58 M-12,-64 V-58 M0,-64 V-58 M12,-64 V-58 M24,-64 V-58 M36,-64 V-58" stroke="#2E2A27" stroke-width="2" />
    <path d="M-10,-66 C-14,-80 4,-86 -4,-100" stroke="#B9B4AA" stroke-width="5" fill="none" opacity=".4" class="fumo" />
  </g>
  <g v-else-if="s === 'balde'">
    <path d="M-14,0 L-17,-30 H17 L14,0Z" fill="#3F7FA6" />
    <ellipse cx="0" cy="-30" rx="17" ry="4" fill="#9FD0EA" />
    <path d="M-17,-30 Q0,-50 17,-30" stroke="#2A5674" stroke-width="2" fill="none" />
  </g>
  <g v-else-if="s === 'contentor'">
    <rect x="-20" y="-56" width="40" height="56" rx="4" fill="#3D6B45" />
    <rect x="-24" y="-64" width="48" height="10" rx="3" fill="#2E5235" />
    <path d="M-10,-44 V-10 M0,-44 V-10 M10,-44 V-10" stroke="#2E5235" stroke-width="3" />
  </g>

  <!-- ===== parque de campismo ===== -->
  <g v-else-if="s === 'tenda'">
    <path d="M-80,0 L0,-96 L80,0Z" :fill="cor" />
    <path d="M0,-96 L80,0 L40,0Z" fill="#000" opacity=".18" />
    <path d="M-18,0 L0,-50 L18,0Z" fill="#1B1B24" opacity=".7" />
    <path d="M0,-96 L0,-104" stroke="#444" stroke-width="3" />
  </g>
  <g v-else-if="s === 'fogareiro'">
    <ellipse cx="0" cy="2" rx="26" ry="6" fill="#6B5A2E" opacity=".4" />
    <rect x="-10" y="-22" width="20" height="22" rx="4" fill="#C0392B" />
    <rect x="-16" y="-28" width="32" height="6" rx="2" fill="#555" />
    <path d="M-8,-28 C-10,-38 -2,-40 -4,-46 M4,-28 C2,-38 10,-40 6,-46" stroke="#3FA7FF" stroke-width="3" fill="none" />
    <path d="M-4,-30 C-6,-40 2,-44 0,-52 C6,-44 6,-36 4,-30Z" fill="#F7A23B" class="chamas" />
    <path d="M-34,6 L-44,-12 M34,6 L42,-14 M-24,6 L-28,-16 M22,4 L26,-18" stroke="#D9A54A" stroke-width="3" stroke-linecap="round" />
  </g>
  <g v-else-if="s === 'bancada'">
    <rect x="-56" y="-46" width="112" height="46" fill="#A39E93" />
    <rect x="-62" y="-52" width="124" height="8" fill="#8E897F" />
    <path d="M-56,-30 H56 M-56,-14 H56" stroke="#7E796F" stroke-width="2" />
    <rect x="-8" y="-68" width="16" height="16" rx="3" fill="#C0392B" />
    <rect x="-13" y="-72" width="26" height="5" rx="2" fill="#555" />
    <path d="M-3,-72 C-4,-80 2,-82 0,-88 C5,-82 4,-76 3,-72Z" fill="#3FA7FF" />
    <rect x="28" y="-74" width="18" height="22" rx="3" fill="#3F7FA6" />
  </g>
  <g v-else-if="s === 'lanterna'">
    <circle cx="0" cy="-20" r="46" fill="url(#brilho-lanterna)" />
    <path d="M-16,-46 L16,-46 L22,0 L-22,0Z" fill="#F6C46A" stroke="#E09A3C" stroke-width="2" />
    <path d="M-16,-46 L16,-46 L22,0 L-22,0Z" fill="#FFF3C8" opacity=".35" />
    <path d="M-4,6 C-6,-4 0,-8 0,-14 C4,-8 6,-2 4,6Z" fill="#FF6A2A" class="chamas" />
    <path d="M-22,0 L-6,8 M22,0 L6,8" stroke="#8B5E3C" stroke-width="1.5" />
  </g>
  <g v-else-if="s === 'led'">
    <circle cx="0" cy="-26" r="30" fill="url(#brilho-led)" />
    <rect x="-10" y="-36" width="20" height="26" rx="4" fill="#E9F2FF" stroke="#7A8CA3" stroke-width="2" />
    <rect x="-12" y="-10" width="24" height="10" rx="2" fill="#4A5568" />
    <path d="M-8,-36 Q0,-50 8,-36" stroke="#4A5568" stroke-width="2.5" fill="none" />
  </g>
  <g v-else-if="s === 'extintor'">
    <rect x="-4" y="-120" width="8" height="120" fill="#6B4A2F" />
    <rect x="-34" y="-130" width="68" height="24" rx="3" fill="#F3EADB" stroke="#6B4A2F" stroke-width="2" />
    <text x="0" y="-113" text-anchor="middle" font-size="13" font-weight="700" fill="#B93A14" font-family="IBM Plex Sans Condensed, sans-serif">EXTINTOR</text>
    <rect x="6" y="-92" width="22" height="50" rx="8" fill="#C0392B" />
    <rect x="12" y="-100" width="10" height="9" fill="#333" />
    <path d="M22,-96 Q34,-90 30,-70" stroke="#222" stroke-width="3" fill="none" />
  </g>
  <g v-else-if="s === 'fogocampo'">
    <ellipse cx="0" cy="-2" rx="56" ry="12" fill="#3B2A20" opacity=".35" />
    <path d="M-44,-6 L40,-22 M-40,-22 L44,-6 M-10,-2 L6,-30" stroke="#5A3A22" stroke-width="10" stroke-linecap="round" />
    <g class="chamas">
      <path d="M-30,-14 C-40,-48 -14,-58 -12,-92 C4,-66 0,-52 12,-66 C28,-44 32,-24 26,-14Z" fill="#F07B2D" />
      <path d="M-14,-14 C-18,-36 0,-44 0,-62 C10,-46 8,-34 16,-40 C18,-26 16,-18 12,-14Z" fill="#FFD166" />
    </g>
    <circle v-for="(p, i) in [[-8, -110], [14, -128], [-20, -142], [6, -160]]" :key="i" :cx="p[0]" :cy="p[1]" r="2.6" fill="#FFB347" class="faulha" />
  </g>

  <!-- ===== trilho ===== -->
  <g v-else-if="s === 'beata'">
    <ellipse cx="0" cy="0" rx="34" ry="8" fill="#6B5A2E" opacity=".25" />
    <rect x="-14" y="-5" width="22" height="5" rx="1" fill="#F3EADB" transform="rotate(-8)" />
    <rect x="-14" y="-5" width="8" height="5" fill="#D99A4E" transform="rotate(-8)" />
    <circle cx="9" cy="-4" r="3" fill="#FF6A2A" class="brilho" />
    <path d="M10,-8 C4,-18 14,-24 8,-34 C4,-42 12,-48 8,-56" stroke="#9A9A9A" stroke-width="2" fill="none" opacity=".75" class="fumo" />
    <path d="M-30,2 L-38,-14 M22,2 L30,-16 M-6,2 L-8,-14" stroke="#D9A54A" stroke-width="2.5" stroke-linecap="round" />
  </g>
  <g v-else-if="s === 'garrafa'">
    <path d="M-30,-6 L10,-14 L22,-12 L32,-14 L33,-8 L23,-6 L12,-2 L-28,4Z" fill="#5C9C6A" opacity=".85" stroke="#3E6D48" stroke-width="1.5" />
    <path d="M-20,-4 L4,-9" stroke="#D8F0DD" stroke-width="2" opacity=".8" />
    <path d="M-50,4 L-40,-6 L-32,2 L-44,8Z" fill="#E6E2D6" />
    <path d="M30,4 C36,-4 48,-2 46,6Z" fill="#C9D6E2" />
  </g>
  <g v-else-if="s === 'placa'">
    <rect x="-4" y="-110" width="8" height="110" fill="#6B4A2F" />
    <path d="M-46,-112 H40 L52,-100 L40,-88 H-46Z" fill="#8B5E3C" />
    <text x="-2" y="-95" text-anchor="middle" font-size="13" font-weight="700" fill="#F3EADB" font-family="IBM Plex Sans Condensed, sans-serif">PR3 Fervença</text>
    <rect x="-46" y="-84" width="30" height="10" fill="#F0B43C" /><rect x="-16" y="-84" width="30" height="10" fill="#C0392B" />
  </g>
  <g v-else-if="s === 'banco'">
    <path d="M-50,0 V-22 M50,0 V-22 M-44,-22 V-52 M44,-22 V-52" stroke="#6E4A2C" stroke-width="6" />
    <rect x="-58" y="-28" width="116" height="8" rx="2" fill="#8B5E3C" />
    <rect x="-54" y="-52" width="108" height="7" rx="2" fill="#8B5E3C" />
    <rect x="-54" y="-42" width="108" height="7" rx="2" fill="#8B5E3C" />
  </g>

  <!-- ===== estrada ===== -->
  <g v-else-if="['carroerva', 'carrojanela', 'atrelado', 'estacionamento'].includes(s)">
    <template v-if="s === 'estacionamento'">
      <path d="M-150,10 L-120,-40 H150 L170,10Z" fill="#B9AC8E" />
      <rect x="120" y="-130" width="6" height="96" fill="#555" />
      <rect x="104" y="-158" width="38" height="38" rx="5" fill="#2F6FB0" />
      <text x="123" y="-128" text-anchor="middle" font-size="28" font-weight="700" fill="#fff" font-family="IBM Plex Sans Condensed, sans-serif">P</text>
    </template>
    <template v-if="s === 'carroerva'">
      <path d="M-120,4 Q-60,-26 0,-18 Q60,-28 120,4Z" fill="#C9B66A" />
      <path v-for="x in [-100, -80, -56, -30, -6, 20, 44, 70, 96]" :key="x" :d="`M${x},2 Q${x - 4},-22 ${x - 10},-34`" stroke="#B5A55A" stroke-width="3" fill="none" stroke-linecap="round" />
    </template>
    <g :transform="s === 'atrelado' ? 'translate(90,0)' : s === 'estacionamento' ? 'translate(-10,-18)' : ''">
      <path d="M-98,-22 L-98,-44 Q-94,-56 -72,-58 L-46,-60 L-22,-88 L42,-88 L68,-60 L92,-56 Q102,-52 102,-38 L102,-22Z" :fill="s === 'carrojanela' ? '#C0392B' : s === 'atrelado' ? '#2F6FB0' : s === 'estacionamento' ? '#7A8C99' : '#E0A63A'" />
      <path d="M-16,-82 L-38,-60 L-2,-60 L-2,-82Z M6,-82 L6,-60 L58,-60 L38,-82Z" fill="#CFE3EE" />
      <circle cx="-60" cy="-20" r="17" fill="#222" /><circle cx="-60" cy="-20" r="7" fill="#999" />
      <circle cx="62" cy="-20" r="17" fill="#222" /><circle cx="62" cy="-20" r="7" fill="#999" />
      <template v-if="s === 'carrojanela'">
        <path d="M-6,-66 L-30,-56" stroke="#C68B59" stroke-width="7" stroke-linecap="round" />
        <rect x="-44" y="-58" width="12" height="3" fill="#F3EADB" />
        <circle cx="-46" cy="-56" r="2.6" fill="#FF6A2A" class="brilho" />
        <path d="M-50,-50 Q-70,-30 -84,10" stroke="#FF8A3A" stroke-width="2" stroke-dasharray="3 5" fill="none" />
        <circle cx="-86" cy="16" r="3" fill="#FF6A2A" class="brilho" />
      </template>
      <template v-if="s === 'carroerva'">
        <path d="M-40,-4 C-46,-12 -36,-18 -42,-26 M-10,-2 C-16,-12 -6,-18 -12,-28 M20,-4 C14,-12 24,-18 18,-26" stroke="#F2B06B" stroke-width="2.5" fill="none" class="fumo" />
        <path d="M-6,2 C-14,-10 0,-16 -8,-30 C-14,-40 -2,-46 -10,-60" stroke="#A9A49A" stroke-width="5" fill="none" opacity=".5" class="fumo" />
      </template>
    </g>
    <template v-if="s === 'carroerva'">
      <path v-for="x in [-92, -70, -38, -14, 12, 38, 74, 98]" :key="'f' + x" :d="`M${x},6 Q${x + 4},-14 ${x + 12},-26`" stroke="#C2B060" stroke-width="3.5" fill="none" stroke-linecap="round" />
    </template>
    <template v-if="s === 'atrelado'">
      <rect x="-150" y="-62" width="110" height="44" fill="#8E897F" stroke="#5E5C57" stroke-width="2" />
      <circle cx="-96" cy="-16" r="14" fill="#222" />
      <path d="M-40,-30 H-8" stroke="#444" stroke-width="5" />
      <path d="M-30,-28 Q-30,-6 -50,-2 Q-70,2 -76,-2" stroke="#777" stroke-width="3" fill="none" stroke-dasharray="5 3" />
      <g class="faiscas">
        <path d="M-78,-4 L-92,-16 M-80,-2 L-96,-2 M-78,0 L-88,10 M-82,-6 L-90,-22" stroke="#FFC24A" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="-98" cy="-8" r="2" fill="#FFE08A" /><circle cx="-94" cy="12" r="1.8" fill="#FFE08A" />
      </g>
    </template>
  </g>
  <g v-else-if="s === 'faixa'">
    <path d="M-150,0 L-140,-40 H150 L160,0Z" fill="#C8B48C" />
    <path v-for="x in [-120, -90, -60, -30, 0, 30, 60, 90, 120]" :key="x" :d="`M${x},-8 l3,-8 M${x + 12},-24 l2,-6`" stroke="#9C8A62" stroke-width="2.5" stroke-linecap="round" />
    <rect x="96" y="-104" width="6" height="66" fill="#6B4A2F" />
    <rect x="70" y="-126" width="62" height="26" rx="3" fill="#2F6B3A" />
    <text x="101" y="-108" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="IBM Plex Sans Condensed, sans-serif">FAIXA LIMPA</text>
  </g>
</template>

<style scoped>
.chamas { transform-box: fill-box; transform-origin: 50% 100%; animation: tremer .5s ease-in-out infinite alternate; }
.fumo { animation: subir 3s ease-in-out infinite; }
.brilho { animation: piscar 1.1s ease-in-out infinite alternate; }
.faulha { animation: faulha 2.2s ease-out infinite; }
.faulha:nth-child(2n) { animation-delay: .7s; }
.faiscas { animation: piscar .25s steps(2) infinite; }
@keyframes tremer { from { transform: scale(1, 1); } to { transform: scale(.92, 1.08) skewX(2deg); } }
@keyframes subir { 50% { opacity: .25; transform: translateY(-4px); } }
@keyframes piscar { from { opacity: 1; } to { opacity: .45; } }
@keyframes faulha { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-40px); opacity: 0; } }
</style>
