<script setup>
// Os três emblemas, iguais à Figura 1 do GDD. Por ganhar, aparecem a cinzento.
defineProps({ id: { type: String, required: true }, ganha: { type: Boolean, default: true } });
</script>

<template>
  <svg viewBox="0 0 120 120" class="insignia-arte" :class="{ apagada: !ganha }" aria-hidden="true">
    <template v-if="id === 'guardiao-floresta'">
      <circle cx="60" cy="60" r="56" fill="#2F6B3A" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#B7D7A8" stroke-width="2" stroke-dasharray="3 4" />
      <path d="M60 22 L84 30 V56 C84 74 73 86 60 94 C47 86 36 74 36 56 V30 Z" fill="#E8F3E1" />
      <path d="M60 36 L72 54 H66 L76 68 H64 V78 H56 V68 H44 L54 54 H48 Z" fill="#2F6B3A" />
    </template>
    <template v-else-if="id === 'estrategista'">
      <circle cx="60" cy="60" r="56" fill="#C0572B" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#F4C7A8" stroke-width="2" stroke-dasharray="3 4" />
      <path d="M60 24 C66 38 80 44 80 62 C80 76 71 86 60 86 C49 86 40 76 40 62 C40 52 46 46 50 40 C51 48 54 52 58 54 C56 44 56 34 60 24 Z" fill="#FBE3D3" />
      <circle cx="60" cy="66" r="15" fill="#C0572B" />
      <path d="M53 66 L58 71 L68 60" fill="none" stroke="#FBE3D3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else>
      <circle cx="60" cy="60" r="56" fill="#1F4E78" />
      <circle cx="60" cy="60" r="48" fill="none" stroke="#A9C6E3" stroke-width="2" stroke-dasharray="3 4" />
      <path d="M44 30 H76 L72 40 H48 Z" fill="#DCE8F5" />
      <rect x="50" y="40" width="20" height="14" fill="#DCE8F5" />
      <rect x="54" y="43" width="12" height="8" fill="#1F4E78" />
      <path d="M52 54 H68 L74 92 H66 L62 70 H58 L54 92 H46 Z" fill="#DCE8F5" />
      <path d="M53 66 H67 M51 80 H69" stroke="#1F4E78" stroke-width="2.5" />
      <path d="M78 46 C86 50 90 56 90 62 M82 40 C94 46 99 54 99 63" fill="none" stroke="#DCE8F5" stroke-width="3" stroke-linecap="round" />
    </template>
  </svg>
</template>

<style scoped>
.insignia-arte { display: block; width: 100%; height: auto; transition: filter .4s, opacity .4s; }
.apagada { filter: grayscale(1) brightness(.55); opacity: .55; }
</style>
