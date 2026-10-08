# Simulador de Monitoração Multi-Trecho (V41)

Modelo analítico-paramétrico, em um único arquivo HTML/JavaScript (sem dependências além das fontes do Google Fonts), que acompanha a dissertação *Proposta de framework de comunicação para suportar a monitoração de falhas em smart grids* (Romulo Silva Kruta, PPGDT, Lactec/UFPR).

Não é um simulador de eventos discretos: os cinco Setups de referência usam os valores consolidados das tabelas do V41 da dissertação, e a agregação fim a fim é calculada a partir deles.

## Como usar

Abra `index.html` no navegador. Não há build nem servidor.

## Origem dos dados (numeração do corpo do V41)

| Tabela | Uso no simulador |
|---|---|
| 10 | Metas dos KPIs |
| 26 | Configuração dos 5 Setups |
| 27 / 28 | KPIs Campo→Borda e Borda→Centro (sem/com segurança) |
| 29 | KPIs fim a fim (validação da agregação) |
| 30 | Premissas de tráfego por carregamento |
| 31 | KPI-04 por carregamento (30/65/95 %) |
| 32 | Decomposição da latência |
| 33 | Avalanche / *last gasp* (50 DTMs em 100 ms, a 95 %) |
| 34 | Síntese comparativa ("X de 7 KPIs") |
| 20 / 21 | Combinações customizadas (modelo genérico bottom-up) |

## Decisões de modelagem

- Jitter fim a fim por raiz da soma dos quadrados.
- p99 fim a fim por soma linear, como limite superior conservador (não é o percentil exato da soma).
- Disponibilidade fim a fim em série; redundância de backhaul limita o resultado ao trecho de campo; redundância de campo entra em paralelo.
- Custo de segurança = diferença publicada entre os cenários sem e com segurança, por trecho.
- Contagem "X de 7 KPIs" estrita, sem crédito parcial (A=0, B=4, C=2, D=4, E=7).
- Combinações customizadas não modelam avalanche nem colisão específica e aparecem com o selo "Combinação customizada".

## Verificação realizada e limites

- Com os valores padrão (carga 65 %, segurança plena, redundância ativada), a tabela de KPIs reproduz as Tabelas 27 a 29 e a contagem 0/4/2/4/7 da Tabela 34. Teste manual automatizado com Chromium headless (Playwright): sem erros de JavaScript.
- Os resultados de B, C e D dependem de premissas declaradas na dissertação (taxas de alarme, processamento do DMS, capacidade da portadora NB-IoT).
- Ainda não foi comparado com o cálculo analítico por tentativa do Setup A (ALOHA).
- Sem testes de sensibilidade nem validação empírica.

## Uso de IA generativa

O código foi desenvolvido com apoio de IA generativa (Claude, Anthropic) e revisado pelo autor. A descrição completa do papel da IA e da verificação consta na dissertação.

## Licença

A definir pelo autor.
