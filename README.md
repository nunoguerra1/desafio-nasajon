# Desafio Técnico - Nasajon

Solução desenvolvida em Node.js (JavaScript) utilizando apenas recursos nativos.

## Diferenciais implementados:
1. **Otimização da API:** Um único GET na API do IBGE, processando os dados em memória.
2. **Tratamento de Homônimos:** Lógica de desempate para cidades com o mesmo nome (ex: Santo André - PB vs SP).
3. **Erros de Digitação:** Implementação do Algoritmo de Distância de Levenshtein nativo para encontrar cidades com erros no nome (ex: "Curitba", "Belo Horzionte").
