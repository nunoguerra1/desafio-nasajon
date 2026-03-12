# Desafio Técnico - Nasajon

Solução desenvolvida em Node.js (JavaScript) utilizando apenas recursos nativos.

## Diferenciais implementados:
1. **Otimização da API:** Um único GET na API do IBGE, processando os dados em memória.
2. **Tratamento de Homônimos:** Lógica de desempate para cidades com o mesmo nome (ex: Santo André - PB vs SP).
3. **Erros de Digitação:** Implementação do Algoritmo de Distância de Levenshtein nativo para encontrar cidades com erros no nome (ex: "Curitba", "Belo Horzionte").

# Notas Explicativas e Decisões Técnicas:
1. **Consumo de API:** Optei por fazer apenas uma requisição inicial ao IBGE e guardar a estrutura em memória para otimizar o processamento das linhas do CSV, evitando gargalos de rede.

2. **Tratamento de Erros de Digitação:** Implementei o Algoritmo de Distância de Levenshtein nativamente para identificar casos como "Belo Horzionte", considerando matches com distância de até 2 caracteres.

3. **Tratamento de Homônimos (AMBIGUO):** Conforme sugerido no PDF, ao encontrar múltiplas correspondências exatas de nomes de cidades (ex: Santo André - PB e SP), o código aplica a tag AMBIGUO, não forçando um resultado e mantendo a integridade das estatísticas regionais.
