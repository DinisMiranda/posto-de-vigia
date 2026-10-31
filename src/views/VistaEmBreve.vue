<script setup>
import { ArrowLeft } from 'lucide-vue-next';
</script>

<template>
  <div>
    <RouterLink class="voltar" :to="{ name: 'mapa' }"><ArrowLeft aria-hidden="true" /> Voltar ao mapa</RouterLink>
    <h2>Em preparação</h2>
  </div>
</template>
