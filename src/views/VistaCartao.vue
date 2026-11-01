<script setup>
/* Cartão "O que fazer": o resumo prático de cada zona concluída, para guardar ou partilhar. */
import { computed, ref } from 'vue';
import { ArrowLeft, Share2, Download, Printer, Phone, Lock } from 'lucide-vue-next';
import { useVigiaStore } from '../stores/vigia.js';
import { ZONAS, INSIGNIAS } from '../logica/regras.js';
import InsigniaArte from '../components/InsigniaArte.vue';

const s = useVigiaStore();
const estado = ref('');
const linhas = computed(() => ZONAS.map(z => ({ ...z, aberta: s.estados[z.id] === 'concluida' })));
const abertas = computed(() => linhas.value.filter(l => l.aberta));

const texto = computed(() => [
  'O que fazer para evitar incêndios florestais (Posto de Vigia)',
  '',
  ...abertas.value.map(l => `• ${l.nome}: ${l.dica}`),
  '',
  'Se vires fumo: liga 112 (ou 117) e diz exatamente onde estás.',
  location.href.split('#')[0],
].join('\n'));

async function partilhar() {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'O que fazer · Posto de Vigia', text: texto.value });
      estado.value = 'Cartão partilhado.';
    } else {
      await navigator.clipboard.writeText(texto.value);
      estado.value = 'Texto do cartão copiado. Já o podes colar numa mensagem.';
    }
    s.registarCartao('partilhado');
  } catch (e) {
    if (e?.name !== 'AbortError') estado.value = 'Não foi possível partilhar. Usa “Guardar imagem”.';
  }
}

// desenha o cartão num canvas e descarrega-o como PNG
function quebrar(ctx, t, largura) {
  const palavras = t.split(' '); const out = []; let l = '';
  for (const p of palavras) {
    const tenta = l ? l + ' ' + p : p;
    if (ctx.measureText(tenta).width > largura && l) { out.push(l); l = p; } else l = tenta;
  }
  if (l) out.push(l);
  return out;
}
async function guardar() {
  await document.fonts?.ready;
  const W = 1080, pad = 72, c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = '500 34px "IBM Plex Sans Condensed", sans-serif';
  const blocos = abertas.value.map(l => ({ nome: l.nome, linhas: quebrar(ctx, l.dica, W - pad * 2) }));
  const H = 330 + blocos.reduce((a, b) => a + 70 + b.linhas.length * 46, 0) + 190;
  c.width = W; c.height = H;
  ctx.fillStyle = '#E3E6D3'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#D9481C'; ctx.fillRect(0, 0, W, 18);
  ctx.fillStyle = '#23321F';
  ctx.font = '700 30px "IBM Plex Sans Condensed", sans-serif';
  ctx.fillText('POSTO DE VIGIA · PARQUE NATURAL DA SERRA DA ESTRELA', pad, 100);
  ctx.font = '700 84px "Zilla Slab", Georgia, serif';
  ctx.fillText('O que fazer', pad, 200);
  ctx.font = 'italic 400 34px "Zilla Slab", Georgia, serif';
  ctx.fillStyle = '#4D5A47';
  ctx.fillText('para evitar incêndios florestais', pad, 252);
  let y = 330;
  for (const b of blocos) {
    ctx.fillStyle = '#23321F';
    ctx.font = '700 40px "Zilla Slab", Georgia, serif';
    ctx.fillText(b.nome, pad, y);
    ctx.font = '500 34px "IBM Plex Sans Condensed", sans-serif';
    b.linhas.forEach((l, i) => ctx.fillText(l, pad, y + 50 + i * 46));
    y += 70 + b.linhas.length * 46 + 20;
  }
  ctx.fillStyle = '#D9481C'; ctx.fillRect(pad, y, W - pad * 2, 110);
  ctx.fillStyle = '#FFF6EC';
  ctx.font = '700 44px "IBM Plex Sans Condensed", sans-serif';
  ctx.fillText('Vês fumo? Liga 112 (ou 117)', pad + 30, y + 70);
  const a = document.createElement('a');
  a.download = 'o-que-fazer-posto-de-vigia.png';
  a.href = c.toDataURL('image/png');
  a.click();
  s.registarCartao('guardado');
  estado.value = 'Imagem do cartão guardada.';
}
function imprimir() { s.registarCartao('impresso'); print(); }
</script>

<template>
  <div class="vista-cartao">
    <RouterLink class="voltar" :to="{ name: 'mapa' }"><ArrowLeft aria-hidden="true" /> Voltar ao mapa</RouterLink>
    <div class="cabecalho-vista">
      <div>
        <h2>O teu cartão</h2>
        <p class="lead">Tudo o que aprendeste, numa só página. Guarda-o ou partilha-o com quem vai contigo ao parque.</p>
      </div>
    </div>

    <article class="cartao papel" aria-labelledby="cartao-titulo">
      <header>
        <p class="cartao-marca">Posto de Vigia · Parque Natural da Serra da Estrela</p>
        <h3 id="cartao-titulo">O que fazer</h3>
        <p class="sub">para evitar incêndios florestais</p>
      </header>
      <ol>
        <li v-for="l in linhas" :key="l.id" :class="{ fechada: !l.aberta }">
          <h4>{{ l.nome }}</h4>
          <p v-if="l.aberta">{{ l.dica }}</p>
          <p v-else class="por-descobrir"><Lock aria-hidden="true" /> Conclui esta zona para desbloquear o conselho.</p>
        </li>
      </ol>
      <p class="sos"><Phone aria-hidden="true" /> <span>Vês fumo? Liga <strong>112</strong> (ou 117) e diz exatamente onde estás.</span></p>
      <footer>
        <p>{{ s.nivelAtual.nome }} · {{ s.pontosVigilancia }} pontos de Vigilância</p>
        <ul class="insignias">
          <li v-for="i in INSIGNIAS" :key="i.id" :title="i.nome"><InsigniaArte :id="i.id" :ganha="s.insignias.includes(i.id)" /></li>
        </ul>
      </footer>
    </article>

    <div class="acoes">
      <button type="button" class="botao primario" :disabled="!abertas.length" @click="partilhar"><Share2 aria-hidden="true" /> Partilhar</button>
      <button type="button" class="botao secundario" :disabled="!abertas.length" @click="guardar"><Download aria-hidden="true" /> Guardar imagem</button>
      <button type="button" class="botao secundario" @click="imprimir"><Printer aria-hidden="true" /> Imprimir</button>
    </div>
    <p class="estado" role="status">{{ estado }}</p>
  </div>
</template>

<style scoped>
.vista-cartao { max-width: 720px; margin: 0 auto; }
.cartao { padding: 0 0 22px; overflow: hidden; border-top: 10px solid var(--brasa); }
.cartao header { padding: 24px 28px 8px; }
.cartao-marca { font-size: .8rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #4D5A47; }
.cartao h3 { font-size: 3rem; line-height: 1; margin-top: 8px; }
.sub { font-family: var(--serif); font-style: italic; font-size: 1.2rem; color: #4D5A47; }
ol { list-style: none; padding: 0 28px; margin: 14px 0 0; display: grid; gap: 14px; counter-reset: dica; }
li { counter-increment: dica; display: grid; grid-template-columns: 36px 1fr; column-gap: 12px; padding-top: 14px; border-top: 1px dashed rgba(35, 50, 31, .3); }
li::before { content: counter(dica); grid-row: span 2; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--tinta); color: var(--carta); font-weight: 700; }
li.fechada::before { background: rgba(35, 50, 31, .25); }
h4 { font-family: var(--serif); font-size: 1.3rem; }
li p { font-size: 1.05rem; margin-top: 2px; }
.por-descobrir { display: inline-flex; align-items: center; gap: 6px; color: #6E7468; }
.sos { display: flex; align-items: center; gap: 10px; margin: 20px 28px 0; padding: 14px 16px; border-radius: 8px; background: var(--brasa); color: #FFF6EC; font-size: 1.1rem; }
footer { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; margin: 18px 28px 0; color: #4D5A47; font-weight: 600; }
.insignias { list-style: none; display: flex; gap: 8px; padding: 0; margin: 0; }
.insignias li { display: block; width: 40px; padding: 0; border: 0; }
.insignias li::before { display: none; }
.acoes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.estado { margin-top: 10px; color: var(--bom-madeira); min-height: 1.5em; }

@media print {
  .voltar, .cabecalho-vista, .acoes, .estado { display: none; }
}
</style>

<style>
/* ao imprimir o cartão, só o cartão */
@media print {
  #historia, .saltar, .janelas, .instrumentos, .rodape { display: none !important; }
  body, #posto { background: #fff !important; }
}
</style>
