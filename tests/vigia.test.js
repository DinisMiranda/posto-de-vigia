import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVigiaStore } from '../src/stores/vigia.js';
import { DESAFIOS, ZONAS, pontosMaximos, pontuar, nivelMerecido } from '../src/logica/regras.js';

const concluirTudo = (s, ids, semPistas = true) => {
  for (const id of ids) s.concluirDesafio(id, { acertos: 3, pistas: semPistas ? 0 : 1, pontos: pontosMaximos(id) - (semPistas ? 0 : 5) });
};

describe('store do posto de vigia', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('começa como no GDD: Visitante, 0 pontos, só a primeira zona aberta', () => {
    const s = useVigiaStore();
    expect(s.nivel).toBe('visitante');
    expect(s.pontosVigilancia).toBe(0);
    expect(s.estados).toEqual({ merendas: 'por-explorar', campismo: 'bloqueada', trilho: 'bloqueada', estrada: 'bloqueada', floresta: 'bloqueada' });
    expect(s.encosta.orcamento).toBe(2500);
  });

  it('dá +10 por resposta certa e +5 sem pistas', () => {
    expect(pontuar({ acertos: 3, pistas: 0 })).toBe(35);
    expect(pontuar({ acertos: 3, pistas: 2 })).toBe(30);
    expect(pontuar({ acertos: 3, pistas: 0, dificil: true, perfeito: true })).toBe(40);
  });

  it('sobe a Vigilante ao concluir o parque de merendas e abre três zonas', () => {
    const s = useVigiaStore();
    s.registarQuizInicial(2);
    concluirTudo(s, ['merendas-cena', 'merendas-escolha']);
    expect(s.nivel).toBe('vigilante');
    expect(s.estados.merendas).toBe('concluida');
    expect(s.estados.campismo).toBe('por-explorar');
    expect(s.estados.floresta).toBe('bloqueada');
    expect(s.novidades.some(n => n.tipo === 'nivel' && n.id === 'vigilante')).toBe(true);
  });

  it('só abre a floresta depois do campismo, do trilho e da estrada', () => {
    const s = useVigiaStore();
    concluirTudo(s, ['merendas-cena', 'merendas-escolha', 'campismo-cena', 'campismo-escolha', 'trilho-cena', 'trilho-escolha']);
    expect(s.estados.floresta).toBe('bloqueada');
    concluirTudo(s, ['estrada-cena', 'estrada-escolha']);
    expect(s.estados.floresta).toBe('por-explorar');
  });

  it('repetir um desafio conta só a melhor pontuação', () => {
    const s = useVigiaStore();
    s.concluirDesafio('merendas-cena', { acertos: 3, pistas: 1, pontos: 30 });
    s.concluirDesafio('merendas-cena', { acertos: 3, pistas: 1, pontos: 30 });
    expect(s.pontosVigilancia).toBe(30);
    s.concluirDesafio('merendas-cena', { acertos: 3, pistas: 0, pontos: 35 });
    expect(s.pontosVigilancia).toBe(35);
  });

  it('chega a Guardião e ganha o Guardião da Floresta com tudo concluído', () => {
    const s = useVigiaStore();
    concluirTudo(s, Object.keys(DESAFIOS));
    expect(s.zonasConcluidas).toBe(5);
    expect(s.nivel).toBe('guardiao');
    expect(s.insignias).toContain('guardiao-floresta');
    expect(s.insignias).toContain('estrategista');
  });

  it('não dá o Estrategista Preventivo se usou pistas na prevenção', () => {
    const s = useVigiaStore();
    concluirTudo(s, Object.keys(DESAFIOS), false);
    expect(s.insignias).not.toContain('estrategista');
  });

  it('dá o Observador depois de consultar o Observatório em todas as zonas', () => {
    const s = useVigiaStore();
    expect(s.abrirObservatorio('trilho')).toBe(false); // zona por concluir
    concluirTudo(s, Object.keys(DESAFIOS));
    for (const z of ZONAS) s.abrirObservatorio(z.id);
    expect(s.insignias).toContain('observador');
  });

  it('o máximo de pontos dá para chegar a Guardião, com margem', () => {
    const max = Object.keys(DESAFIOS).reduce((t, id) => t + pontosMaximos(id), 0);
    expect(nivelMerecido(max, Object.keys(DESAFIOS))).toBe('guardiao');
    expect(max).toBeGreaterThan(240 / 0.75);
  });

  it('guarda o progresso no navegador', async () => {
    const s = useVigiaStore();
    s.registarQuizInicial(3);
    await Promise.resolve();
    await new Promise(r => setTimeout(r));
    expect(JSON.parse(localStorage.getItem('posto-de-vigia:v1')).quizInicial).toBe(3);
  });
});
