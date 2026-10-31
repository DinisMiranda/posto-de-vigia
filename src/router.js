import { createRouter, createWebHashHistory } from 'vue-router';
import { useVigiaStore } from './stores/vigia.js';
import { DESAFIOS } from './logica/regras.js';
import VistaMapa from './views/VistaMapa.vue';
import EmBreve from './views/VistaEmBreve.vue';

const routes = [
  { path: '/', name: 'mapa', component: VistaMapa },
  { path: '/quiz-inicial', name: 'quiz-inicial', component: () => import('./views/VistaQuiz.vue'), props: { tipo: 'inicial' } },
  { path: '/zona/:id', name: 'zona', component: EmBreve, props: true },
  { path: '/zona/:id/:desafio', name: 'desafio', component: EmBreve, props: true },
  { path: '/observatorio/:id?', name: 'observatorio', component: EmBreve, props: true },
  { path: '/desafio-final', name: 'desafio-final', component: () => import('./views/VistaQuiz.vue'), props: { tipo: 'final' } },
  { path: '/cartao', name: 'cartao', component: EmBreve },
  { path: '/:caminho(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from) {
    // ao mudar de vista dentro do posto, volta ao topo do posto (a cena fica por cima)
    if (to.name === from.name && to.params.id === from.params.id) return false;
    const posto = document.getElementById('posto');
    if (!posto || !from.name) return false;
    return { el: '#posto', top: 0 };
  },
});

router.beforeEach(to => {
  const s = useVigiaStore();
  if (to.name === 'zona' || to.name === 'desafio') {
    const id = to.params.id;
    if (s.estados[id] === undefined || s.estados[id] === 'bloqueada') return { name: 'mapa' };
    if (s.quizInicial === null) return { name: 'quiz-inicial', query: { seguir: id } };
    if (to.name === 'desafio' && DESAFIOS[to.params.desafio]?.zona !== id) return { name: 'zona', params: { id } };
  }
  if (to.name === 'desafio-final' && !s.eGuardiao) return { name: 'mapa' };
  return true;
});
