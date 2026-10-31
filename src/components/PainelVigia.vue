<script setup>
import { computed } from 'vue';
import { useVigiaStore } from '../stores/vigia.js';
import { NIVEIS, INSIGNIAS, CLASSES } from '../logica/regras.js';
import InsigniaArte from './InsigniaArte.vue';

const s = useVigiaStore();

// mostrador de perigo: arco de 180° com as cinco classes do IPMA
const arcos = computed(() => {
  let ini = 0;
  return CLASSES.map(c => {
    const fim = Math.min(c.ate, 100);
    const a0 = Math.PI * (1 - ini / 100), a1 = Math.PI * (1 - fim / 100);
    ini = fim;
    const p = a => [60 + 46 * Math.cos(a), 62 - 46 * Math.sin(a)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return { cor: c.cor, d: `M${x0.toFixed(1)},${y0.toFixed(1)} A46,46 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}` };
  });
});
const angulo = computed(() => -90 + 180 * (s.perigoDoDia.valor / 100));

const progresso = computed(() => {
  const atual = s.nivelAtual, prox = s.proximoNivel?.nivel;
  if (!prox) return 1;
  return Math.min(1, (s.pontosVigilancia - atual.pontos) / (prox.pontos - atual.pontos));
});
const indice = computed(() => NIVEIS.findIndex(n => n.id === s.nivel));
</script>

<template>
  <header class="instrumentos" aria-label="Painel do vigia">
    <section class="medidor nivel">
      <h3>Nível</h3>
      <p class="nome-nivel">{{ s.nivelAtual.nome }} <span class="fase">{{ s.nivelAtual.fase }}</span></p>
      <ol class="degraus" aria-label="Níveis">
        <li v-for="(n, i) in NIVEIS" :key="n.id" :class="{ feito: i < indice, atual: i === indice }">{{ n.nome }}</li>
      </ol>
      <p v-if="s.proximoNivel" class="falta">
        Para {{ s.proximoNivel.nivel.nome }}:
        <template v-if="s.proximoNivel.pontos">mais {{ s.proximoNivel.pontos }} pontos</template>
        <template v-if="s.proximoNivel.pontos && s.proximoNivel.zonas.length"> e </template>
        <template v-if="s.proximoNivel.zonas.length">concluir {{ s.proximoNivel.zonas.join(', ') }}</template>
      </p>
      <p v-else class="falta">Chegaste ao nível mais alto.</p>
    </section>

    <section class="medidor pontos">
      <h3>Pontos de Vigilância</h3>
      <p class="grande"><output aria-live="polite">{{ s.pontosVigilancia }}</output></p>
      <div class="barra" role="progressbar" :aria-valuenow="Math.round(progresso * 100)" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso para o próximo nível">
        <span :style="{ width: progresso * 100 + '%' }"></span>
      </div>
      <p class="falta">{{ s.zonasConcluidas }} de 5 zonas concluídas</p>
    </section>

    <section class="medidor perigo">
      <h3>Perigo de incêndio</h3>
      <svg class="mostrador" viewBox="0 0 120 70" aria-hidden="true">
        <path v-for="a in arcos" :key="a.cor" :d="a.d" :stroke="a.cor" stroke-width="9" fill="none" />
        <line x1="60" y1="62" x2="60" y2="20" :style="{ transform: `rotate(${angulo}deg)` }" />
        <circle cx="60" cy="62" r="4.5" />
      </svg>
      <p class="classe" :style="{ '--c': s.perigoDoDia.cor }">{{ s.perigoDoDia.nome }}</p>
      <p class="falta">Estimativa para as zonas por concluir</p>
    </section>

    <section class="medidor insignias">
      <h3>Insígnias</h3>
      <ul>
        <li v-for="i in INSIGNIAS" :key="i.id" :title="`${i.nome}: ${i.criterio}`">
          <InsigniaArte :id="i.id" :ganha="s.insignias.includes(i.id)" />
          <span class="sr">{{ i.nome }} ({{ s.insignias.includes(i.id) ? 'ganha' : 'por ganhar' }}): {{ i.criterio }}</span>
        </li>
      </ul>
    </section>
  </header>
</template>

<style scoped>
.instrumentos {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr 1fr;
  gap: 14px;
  padding: 26px 0 22px;
}
.medidor {
  background: var(--madeira-2);
  border: 1px solid var(--madeira-3);
  border-radius: var(--raio);
  padding: 14px 16px;
  min-width: 0;
}
.medidor h3 { font-family: var(--cond); font-weight: 500; font-size: .95rem; color: var(--texto-2); }
.nome-nivel { font-family: var(--serif); font-weight: 700; font-size: 1.75rem; line-height: 1.15; margin-top: 4px; }
.fase { font-family: var(--cond); font-size: .9rem; font-weight: 500; font-style: italic; color: var(--texto-2); }
.degraus { list-style: none; display: flex; gap: 4px; padding: 0; margin: 10px 0 8px; }
.degraus li { flex: 1; font-size: .78rem; text-align: center; padding-top: 12px; position: relative; color: var(--texto-2); }
.degraus li::before { content: ""; position: absolute; inset: 0 0 auto; height: 8px; border-radius: 2px; background: var(--madeira-3); }
.degraus li.feito::before { background: var(--folhosa); }
.degraus li.atual { color: var(--texto); font-weight: 600; }
.degraus li.atual::before { background: var(--lampada); }
.falta { font-size: .9rem; color: var(--texto-2); }
.grande output { font-size: 2.6rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
.barra { position: relative; height: 10px; background: var(--madeira-3); border-radius: 3px; margin: 8px 0 8px; overflow: hidden; }
.barra span { position: absolute; inset: 0 auto 0 0; background: var(--lampada); border-radius: 3px; transition: width .9s cubic-bezier(.2, .8, .2, 1); }
.perigo { display: grid; grid-template-columns: auto 1fr; column-gap: 12px; align-items: center; }
.perigo h3, .perigo .falta { grid-column: 1 / -1; }
.mostrador { width: 100px; height: auto; margin-top: 6px; }
.mostrador line { stroke: var(--texto); stroke-width: 3; stroke-linecap: round; transform-box: view-box; transform-origin: 60px 62px; transition: transform .9s cubic-bezier(.3, 1.4, .5, 1); }
.mostrador circle { fill: var(--texto); }
.classe { display: inline-flex; align-items: center; gap: 6px; font-size: 1.1rem; font-weight: 700; }
.classe::before { content: ""; width: 11px; height: 11px; border-radius: 50%; background: var(--c); flex: none; }
.insignias ul { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0; margin: 10px 0 0; }
.insignias li { max-width: 72px; }

@media (max-width: 980px) {
  .instrumentos { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px) {
  .instrumentos { gap: 10px; padding: 18px 0; }
  .nivel, .insignias { grid-column: 1 / -1; }
  .medidor { padding: 12px 12px; }
  .nome-nivel { font-size: 1.5rem; }
  .grande output { font-size: 2.1rem; }
  .perigo { grid-template-columns: 1fr; }
  .mostrador { width: 84px; }
  .classe { font-size: 1rem; }
  .perigo .falta { display: none; }
  .insignias ul { grid-template-columns: repeat(3, 56px); }
}
</style>
