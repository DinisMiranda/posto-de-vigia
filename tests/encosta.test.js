import { describe, it, expect } from 'vitest';
import { novaEncosta, agir, avancarEstacao, simularVerao, metricas, podeAgir, ORCAMENTO_INICIAL } from '../src/logica/encosta.js';

const parcela = (e, nome) => e.parcelas.find(p => p.nome === nome);

function jogar(plano) {
  const e = novaEncosta();
  for (let s = 0; s < 4; s++) {
    for (const [estacao, acao, nome] of plano) if (estacao === s) agir(e, parcela(e, nome), acao);
    if (s < 3) avancarEstacao(e);
  }
  return { e, r: simularVerao(e) };
}

describe('desafio da encosta', () => {
  it('começa com 2 500 € e métricas calculadas', () => {
    const e = novaEncosta();
    expect(e.orcamento).toBe(ORCAMENTO_INICIAL);
    const m = metricas(e.parcelas);
    expect(m.risco).toBeGreaterThan(50);
    expect(m.resiliencia).toBeLessThan(40);
  });

  it('não deixa gastar mais do que o orçamento nem agir duas vezes na mesma parcela', () => {
    const e = novaEncosta();
    e.orcamento = 200;
    expect(podeAgir(e, parcela(e, 'Lameiro'), 'limpar').ok).toBe(false);
    e.orcamento = 2500;
    agir(e, parcela(e, 'Lameiro'), 'limpar');
    expect(podeAgir(e, parcela(e, 'Lameiro'), 'autoctone').ok).toBe(false);
  });

  it('não fazer nada deixa arder quase toda a encosta', () => {
    const { r } = jogar([]);
    expect(r.ardeu.length).toBeGreaterThanOrEqual(7);
    expect(r.pontos).toBe(0);
  });

  it('apostar só no lucro rende dinheiro mas arde', () => {
    const { e, r } = jogar([[0, 'vender', 'Meia Encosta'], [0, 'vender', 'Cabeço'], [1, 'eucalipto', 'Meia Encosta'], [1, 'eucalipto', 'Cabeço']]);
    expect(e.orcamento).toBeGreaterThan(ORCAMENTO_INICIAL);
    expect(r.ardeu.length).toBeGreaterThan(4);
  });

  it('equilibrar venda, autóctones e limpeza na primavera protege a encosta', () => {
    const { r } = jogar([
      [0, 'vender', 'Meia Encosta'], [0, 'autoctone', 'Fundo do Vale'], [1, 'autoctone', 'Meia Encosta'],
      [1, 'autoctone', 'Chão da Estrada'], [2, 'limpar', 'Lameiro'], [2, 'limpar', 'Penedo'],
    ]);
    expect(r.ardeu).toHaveLength(0);
    expect(r.pontos).toBe(45);
  });

  it('usar máquinas no verão começa um foco na própria parcela', () => {
    const { r, e } = jogar([[3, 'limpar', 'Cumeada']]);
    expect(r.focos).toContain(parcela(e, 'Cumeada').id);
    expect(r.ardeu).toContain(parcela(e, 'Cumeada').id);
  });

  it('é determinista: as mesmas escolhas dão o mesmo verão', () => {
    const a = jogar([[2, 'limpar', 'Lameiro']]).r;
    const b = jogar([[2, 'limpar', 'Lameiro']]).r;
    expect(a.ardeu).toEqual(b.ardeu);
  });
});
