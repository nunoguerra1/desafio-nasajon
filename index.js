const fs = require('fs');

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6ImR0TG03UVh1SkZPVDJwZEciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL215bnhsdWJ5a3lsbmNpbnR0Z2d1LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4ZTlhYTE1MS05ZDBiLTRlOTYtYTNiNi0zYjllOWI1ZmQxZWMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzczMzUzMzY1LCJpYXQiOjE3NzMzNDk3NjUsImVtYWlsIjoibnVubzFhc3Npc0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibnVubzFhc3Npc0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibm9tZSI6Ik51bm8gTWlndWVsIEd1ZXJyYSBKdW5pb3IiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjhlOWFhMTUxLTlkMGItNGU5Ni1hM2I2LTNiOWU5YjVmZDFlYyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzczMzQ5NzY1fV0sInNlc3Npb25faWQiOiIyZGNkZTU2ZS0xZDA5LTQ4YjUtODk1Yy01NTNjZjc5MDEwMzIiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.LDbJ9FYSyG7q8dWw0PTV5-YhXr_tcA7uEQ2GRs9GgNE";
const SUBMIT_URL = "https://mynxlubykylncinttggu.functions.supabase.co/ibge-submit";
const IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

function normalizar(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function calcularDistancia(a, b) {
    if (a === b) return 0;
    const matriz = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) matriz[0][i] = i;
    for (let j = 0; j <= b.length; j += 1) matriz[j][0] = j;
    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const indicador = a[i - 1] === b[j - 1] ? 0 : 1;
            matriz[j][i] = Math.min(
                matriz[j][i - 1] + 1,
                matriz[j - 1][i] + 1,
                matriz[j - 1][i - 1] + indicador
            );
        }
    }
    return matriz[b.length][a.length];
}

function encontrarMunicipio(nomeInput, listaIbge) {
    const nomeNorm = normalizar(nomeInput);
    let melhoresMatches = [];
    let menorDistancia = Infinity;

    for (const m of listaIbge) {
        const nomeIbgeNorm = normalizar(m.nome);
        const dist = calcularDistancia(nomeNorm, nomeIbgeNorm);

        if (dist < menorDistancia) {
            menorDistancia = dist;
            melhoresMatches = [m];
        } else if (dist === menorDistancia) {
            melhoresMatches.push(m);
        }
    }

    if (menorDistancia <= 2) {
        let melhorMatch = melhoresMatches[0];

        if (melhoresMatches.length > 1) {
            for (const m of melhoresMatches) {
                if (m.microrregiao.mesorregiao.UF.sigla === 'SP') {
                    melhorMatch = m;
                }
            }
        }
        return { municipio: melhorMatch, status: "OK" };
    }

    return { municipio: null, status: "NAO_ENCONTRADO" };
}

async function main() {
    console.log("Iniciando processamento com correção de digitação e deduplicação de agregados...");

    const stats = {
        total_municipios: 0,
        total_ok: 0,
        total_nao_encontrado: 0,
        total_erro_api: 0,
        pop_total_ok: 0,
        medias_por_regiao: {}
    };

    let dadosIbge = [];

    try {
        console.log("A consultar API do IBGE...");
        const res = await fetch(IBGE_URL);
        if (!res.ok) throw new Error("Erro de rede no IBGE");
        dadosIbge = await res.json();
    } catch (erro) {
        console.error("Erro na API do IBGE:", erro);
        stats.total_erro_api += 1;
        return;
    }

    const arquivoCsv = fs.readFileSync('input.csv', 'utf-8');
    const linhas = arquivoCsv.split('\n').filter(linha => linha.trim() !== '');

    const resultadoCSV = [];
    const cidadesUnicas = new Map();

    for (let i = 1; i < linhas.length; i++) {
        const [municipioInput, populacaoStr] = linhas[i].split(',').map(item => item.trim());
        const populacaoInput = Number(populacaoStr);

        stats.total_municipios += 1;

        const match = encontrarMunicipio(municipioInput, dadosIbge);

        if (match.status === "OK") {
            stats.total_ok += 1;

            const uf = match.municipio.microrregiao.mesorregiao.UF.sigla;
            const regiao = match.municipio.microrregiao.mesorregiao.UF.regiao.nome;
            const idIbge = match.municipio.id;

            if (!cidadesUnicas.has(idIbge)) {
                cidadesUnicas.set(idIbge, { regiao: regiao, pop: populacaoInput });
            } else {
                const cidadeAtual = cidadesUnicas.get(idIbge);
                if (populacaoInput > cidadeAtual.pop) {
                    cidadeAtual.pop = populacaoInput;
                }
            }

            resultadoCSV.push(`${municipioInput},${populacaoInput},${match.municipio.nome},${uf},${regiao},${idIbge},OK`);
        } else {
            stats.total_nao_encontrado += 1;
            resultadoCSV.push(`${municipioInput},${populacaoInput},,,,${match.status}`);
        }
    }

    const regiaoSoma = {};
    const regiaoQtd = {};

    for (const [idIbge, dados] of cidadesUnicas.entries()) {
        stats.pop_total_ok += dados.pop;

        if (!regiaoSoma[dados.regiao]) {
            regiaoSoma[dados.regiao] = 0;
            regiaoQtd[dados.regiao] = 0;
        }
        regiaoSoma[dados.regiao] += dados.pop;
        regiaoQtd[dados.regiao] += 1;
    }

    for (const regiao in regiaoSoma) {
        const media = regiaoSoma[regiao] / regiaoQtd[regiao];
        stats.medias_por_regiao[regiao] = Number(media.toFixed(2));
    }

    console.log("A gerar resultado.csv...");
    const cabecalho = "municipio_input,populacao_input,municipio_ibge,uf,regiao,id_ibge,status\n";
    fs.writeFileSync('resultado.csv', cabecalho + resultadoCSV.join('\n'));

    console.log("A enviar resultados para a API da Nasajon...");
    try {
        const respostaSubmit = await fetch(SUBMIT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            },
            body: JSON.stringify({ stats })
        });

        const feedback = await respostaSubmit.json();

        console.log("\n====== RESULTADO DA AVALIAÇÃO ======");
        if (feedback.score !== undefined) {
            console.log(`Nota (Score): ${feedback.score}`);
            console.log(`Feedback: ${feedback.feedback}`);
        } else {
            console.log("A API recusou o envio. Veja a mensagem de erro abaixo:");
            console.log(feedback);
        }
        console.log("====================================\n");

    } catch (erro) {
        console.error("Erro ao enviar estatísticas:", erro);
    }
}

main();