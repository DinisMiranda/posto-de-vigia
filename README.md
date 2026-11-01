# Posto de Vigia

Portal web de sensibilização para os incêndios florestais, centrado no Parque Natural da Serra da Estrela. Projeto da UC de Gamificação e Narrativas Interativas (Licenciatura em Tecnologias e Desenvolvimento Web), Tema 2: Gestão Florestal e Incêndios.

**Site:** https://dinismiranda.github.io/posto-de-vigia/

## Conceito

A página abre com um dia inteiro no posto de vigia, contado pelo scroll: de manhã vê-se o parque todo, ao fim da tarde uma fogueira mal apagada no parque de merendas começa um incêndio. Depois entra-se na cabine, onde está a carta do parque com cinco zonas. Todas ficam dentro do parque e cada uma ensina uma causa humana de incêndio:

| Zona | Causa | Desafios |
|---|---|---|
| Parque de merendas | Fogueiras e churrascos fora dos locais próprios | Cena + decisão (guiado) |
| Parque de campismo | Fogareiros, fogo de campo e lanternas voadoras | Cena + decisão |
| Trilho pedestre | Beatas e lixo deixados no mato | Cena + decisão |
| Estrada do parque | Carros sobre erva seca, faíscas e beatas pela janela | Cena + decisão |
| Floresta de produção | Maquinaria em dias de calor e combustível acumulado | Decisão + gestão da encosta |

### Sistema gamificado (GDD, capítulos 5 a 7)

- **Pontos de Vigilância:** +10 por resposta certa, +5 de bónus por desafio sem pistas, +5 no modo difícil sem erros. Conta sempre a melhor tentativa.
- **Níveis:** Visitante (quiz inicial e parque de merendas guiado) → Vigilante (40 pontos e merendas concluídas; abre campismo, trilho e estrada; depois a floresta) → Guardião (240 pontos e as cinco zonas; abre o desafio final e o Observatório completo).
- **Insígnias:** Guardião da Floresta (cinco zonas), Estrategista Preventivo (todos os desafios de prevenção sem pistas), Observador (Observatório consultado em todas as zonas).
- **Pistas e dificuldade:** dois erros seguidos dão uma pista; quem acerta tudo sem pistas pode repetir em modo difícil, com tempo contado.
- **Encosta:** quatro estações e 2 500 € para limpar, plantar autóctones, plantar eucalipto ou vender madeira. No fim, um incêndio vindo da estrada sobe a encosta e o relatório explica, parcela a parcela, porque ardeu ou travou o fogo. Usa as variáveis do Tema 2: risco de incêndio, orçamento disponível e resiliência ecológica.
- **Medição (KPI):** o quiz inicial e o desafio final "Qual foi a causa?" têm cinco perguntas cada e são comparados no fim; o cartão "O que fazer" conta quantas vezes é partilhado, guardado ou impresso.
- **Observatório:** histórico, causas e risco estimado por zona, decomposto em quatro fatores. Os valores são ilustrativos e o site diz onde encontrar os dados reais (ICNF e IPMA).

## Tecnologias

Vue 3, Pinia e Vue Router, com Vite. A cena de abertura é desenhada em Canvas 2D; o mapa, as cenas dos desafios e os gráficos em SVG. Testes com Vitest.

## Instalar e executar

Precisa de Node.js 20.19 ou mais recente.

```bash
git clone https://github.com/DinisMiranda/posto-de-vigia.git
cd posto-de-vigia
npm install
npm run dev      # servidor local em http://localhost:5173/posto-de-vigia/
npm test         # testes da store e da simulação da encosta
npm run build    # versão de produção na pasta dist/
npm run preview  # serve a pasta dist/ localmente
```

O site é publicado no GitHub Pages pelo workflow `.github/workflows/deploy.yml` sempre que há um push para `main` (em *Settings → Pages*, a origem tem de ser "GitHub Actions"). O endereço base está em `vite.config.js` (`base: '/posto-de-vigia/'`).

O progresso fica guardado no navegador (`localStorage`); o botão "Recomeçar", no rodapé, apaga-o.

## Estrutura

```
src/
  cena/            cena de abertura (canvas) e respetivo CSS
  components/      painel do vigia, mapa, desafios, insígnias, avisos
    cena/          fundos e desenhos das cenas dos desafios
  dados/           conteúdos em JSON: zonas, desafios, quiz, observatório
  logica/          regras (níveis, desbloqueios, insígnias) e simulação da encosta
  stores/vigia.js  estado global em Pinia (GDD, secção 7.2)
  views/           mapa, zona, desafio, quiz, observatório, cartão
tests/             testes em Vitest
```

Os conteúdos estão separados do código (`src/dados/`), para a narrativa do Bloco 2 poder ser acrescentada no mesmo formato.

### Estado global (Pinia)

| Variável | Tipo | Valor inicial | Ações |
|---|---|---|---|
| `zonas` | Array de objetos | 5 zonas; só a 1.ª aberta | `abrirZona(id)`, `concluirZona(id)` |
| `pontosVigilancia` | Number | 0 | `adicionarPontos(valor)` |
| `nivel` | String | `'visitante'` | `atualizarNivel()` |
| `desafiosConcluidos` | Array de strings | `[]` | `concluirDesafio(id, resultado)` |
| `insignias` | Array de strings | `[]` | `desbloquearInsignia(id)` |
| `quizInicial` | Number (0-5) ou null | `null` | `registarQuizInicial(acertos)` |
| `riscoPorZona` | Object {zona: 0-100} | calculado | `carregarObservatorio()` |
| `encosta` | Object {orcamento, parcelas, ...} | 2 500 € | `gastar()`, `avancarEstacao()`, `simularVerao()` |

## Versões anteriores

- O primeiro protótipo (dez anos a gerir a serra) está na tag `prototipo-dez-anos`.
- A animação do incêndio na abertura foi melhorada num commit próprio ("Melhorar a animação da floresta a arder"). Para voltar à versão original basta reverter esse commit: `git revert 31ca048`.

## Grupo

Dinis Miranda, André Lemos, José Guimarães e Rodrigo Ferreira.

## Uso de IA

Foi usado o Claude (Anthropic) como apoio à programação do site, à redação de textos e à criação das ilustrações em SVG. O resultado foi revisto e adaptado pelo grupo, que é responsável pelo conteúdo final.
