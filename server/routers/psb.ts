import { z } from "zod";import { publicProcedure, router } from "../_core/trpc";
import { queryTidb, getCached, setCached } from "../tidb";
import { getAllOverrides } from "../affiliationOverrides";
import { gunzipSync } from "zlib";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const STATE_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

// Código de eleição TSE por ano/tipo para montar URL de foto
// Formato correto: https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/{codigoCompleto}/{sequencial}/{uf}
// O código completo já inclui o ano: ex. 2040602022 (geral 2022), 2040402024 (municipal 2024)
const ELECTION_CODES: Record<number, Record<string, string>> = {
  2022: { GERAL: "2040602022" },
  2020: { MUNICIPAL: "2040402020" },
  2024: { MUNICIPAL: "2040402024" },
  2018: { GERAL: "2040602018" },
  2016: { MUNICIPAL: "2040402016" },
  2014: { GERAL: "2040602014" },
  2012: { MUNICIPAL: "2040402012" },
  2010: { GERAL: "2040602010" },
};

function getPhotoUrl(sequencial: string, uf: string, ano: number, cargo: string): string {
  if (!sequencial) return "";
  const isMunicipal = ["PREFEITO", "VEREADOR"].includes(cargo);
  const type = isMunicipal ? "MUNICIPAL" : "GERAL";
  const code = ELECTION_CODES[ano]?.[type] ?? ELECTION_CODES[ano]?.["GERAL"] ?? "2040602022";
  return `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${code}/${sequencial}/${uf}`;
}

// ─── DIRETÓRIOS ESTADUAIS (dados reais do site psb40.org.br) ─────────────────

interface DirectoryInfo {
  president: string;
  address: string;
  phone: string;
  email: string;
  facebook?: string;
  instagram?: string;
  website?: string;
  // Nomes de busca no banco para linkar ao perfil
  presidentSearchName?: string;
}

const PSB_DIRECTORIES: Record<string, DirectoryInfo> = {
  AC: {
    president: "César Messias",
    address: "Rua Coronel Fontenelle de Castro nº 283 – Bairro Estação Experimental, Rio Branco-AC, CEP: 69918-188",
    phone: "(68) 3222-7947",
    email: "psb40ac@hotmail.com",
    presidentSearchName: "CESAR MESSIAS",
  },
  AL: {
    president: "Paula Dantas",
    address: "Av. Comendador Gustavo Paiva nº 2789 – Condomínio Norcon Empresarial – Salas 1112 a 14 – MANGABEIRAS, Maceió-AL, CEP: 57037-532",
    phone: "(82) 3024-4040 / (82) 3024-4444",
    email: "paulacintradantas.med@gmail.com / psb.alagoas@gmail.com",
    presidentSearchName: "PAULA DANTAS",
  },
  AP: {
    president: "João Capiberibe",
    address: "Rua Eliézer Levi nº 903 – Bairro do Laguinho, Macapá-AP, CEP: 68908-183",
    phone: "(96) 3222-2782",
    email: "psb.ap@hotmail.com",
    facebook: "PSB Amapá",
    presidentSearchName: "JOAO CAPIBERIBE",
  },
  AM: {
    president: "Serafim Correa",
    address: "Rua Barão de Itamaracá nº 05 – Bairro Flores, Manaus-AM, CEP: 69058-170",
    phone: "(92) 3232-2029",
    email: "psbamazonas40@gmail.com",
    facebook: "PSB Amazonas",
    presidentSearchName: "SERAFIM CORREA",
  },
  BA: {
    president: "Lídice da Mata",
    address: "Rua Deputado Cunha Bueno nº 71 – Rio Vermelho, Salvador-BA, CEP: 41950-220",
    phone: "(71) 2132-4811",
    email: "partidosocialistabrasileiroba@gmail.com",
    presidentSearchName: "LIDICE DA MATA",
  },
  CE: {
    president: "Eudoro Santana",
    address: "Rua Deputado João Pontes nº 756 – Bairro de Fátima, Fortaleza-CE, CEP: 60040-430",
    phone: "(85) 3253-4141",
    email: "psbestadual40@gmail.com",
    facebook: "PSB Ceará",
    presidentSearchName: "EUDORO SANTANA",
  },
  DF: {
    president: "Rodrigo Dias",
    address: "SCS Quadra 4 – Bloco A – Nº 209 – Sala 506 – Edifício Mineiro – Asa Sul, Brasília-DF, CEP: 70310-500",
    phone: "(61) 3202-2502",
    email: "psb40df@gmail.com",
    presidentSearchName: "RODRIGO DIAS",
  },
  ES: {
    president: "Alberto Faria Gavini",
    address: "Rua Pedro Carlos de Souza nº 84 – Salas 604 a 608 – Edifício Madeira – Ilha de Santa Maria, Vitória-ES, CEP: 29017-280",
    phone: "(27) 3322-1005",
    email: "psbes40@gmail.com",
    presidentSearchName: "ALBERTO GAVINI",
  },
  GO: {
    president: "Aava Santiago",
    address: "Rua 119 – nº 100 – Setor Sul, Goiânia-GO, CEP: 74085-420",
    phone: "(62) 3642-0216",
    email: "gabinete.aavasantiago@gmail.com",
    facebook: "PSB Goiás",
    presidentSearchName: "AAVA SANTIAGO",
  },
  MA: {
    president: "Senadora Ana Paula Lobato",
    address: "Rua das Acácias – Quadra 39 – Casa 08 – Jardim Renascença, São Luís-MA, CEP: 65075-010",
    phone: "(98) 3221-1770 / (98) 3235-2012",
    email: "40psbmaranhao@gmail.com",
    facebook: "PSB Maranhão",
    presidentSearchName: "ANA PAULA LOBATO",
  },
  MT: {
    president: "Pedro Taques",
    address: "Avenida Bosque da Saúde, Cuiabá-MT, CEP: 78050-070",
    phone: "",
    email: "pedrotaques2019@gmail.com",
    facebook: "PSB Mato Grosso",
    presidentSearchName: "PEDRO TAQUES",
  },
  MS: {
    president: "Paulo Duarte",
    address: "Rua Hiroshima nº 1909 – Caranda Bosque II, Campo Grande-MS, CEP: 79032-050",
    phone: "(67) 3305-5943 / (67) 3305-2940",
    email: "psb.ms@hotmail.com",
    facebook: "PSB Mato Grosso do Sul",
    presidentSearchName: "PAULO DUARTE",
  },
  MG: {
    president: "Otacílio Neto Costa Mattos",
    address: "Praça Carlos Chagas nº 49 – Cond. Edifício Cezanne – Salas 501 a 503, Bairro Santo Agostinho, Belo Horizonte-MG, CEP: 30170-200",
    phone: "(31) 9 9967-0040",
    email: "otaciliocosta40@hotmail.com",
    presidentSearchName: "OTACILIO NETO",
  },
  PA: {
    president: "Daniel Santos",
    address: "Rodovia BR 316 – Sala 410 – 4º Andar – nº 410 – Centro Res. Business – Centro, Ananindeua-PA, CEP: 67030-000",
    phone: "(91) 99807-1917",
    email: "danielsantosdr@hotmail.com / psbpa40@gmail.com",
    presidentSearchName: "DANIEL SANTOS",
  },
  PB: {
    president: "Governador João Azevêdo",
    address: "Avenida Coremas nº 350 – Centro, João Pessoa-PB, CEP: 58013-430",
    phone: "(83) 3241-3323",
    email: "anselmocastilho@gmail.com",
    presidentSearchName: "JOAO AZEVEDO",
  },
  PR: {
    president: "Luciano Ducci",
    address: "Rua Reinaldino Schaffemberg de Quadros nº 292 – Bairro Alto da XV, Curitiba-PR, CEP: 80045-070",
    phone: "(41) 3252-4015 / (41) 3122-4040",
    email: "psbparana40@gmail.com",
    presidentSearchName: "LUCIANO DUCCI",
  },
  PE: {
    president: "Sileno Guedes",
    address: "Rua Governador Agamenon Magalhães nº 2615 – 14º Andar – Boa Vista, Recife-PE, CEP: 50050-290",
    phone: "(81) 3243-1729 / (81) 3194-4700",
    email: "psbpe40@gmail.com",
    facebook: "PSB Pernambuco",
    instagram: "@psbpernambuco",
    presidentSearchName: "SILENO GUEDES",
  },
  PI: {
    president: "Washington Luiz de Souza Martins",
    address: "Rua Félix Pacheco nº 1533 – Centro Sul, Teresina-PI, CEP: 64001-160",
    phone: "(86) 3221-7677",
    email: "psbpiaui@gmail.com",
    facebook: "PSB Piauí",
    presidentSearchName: "WASHINGTON MARTINS",
  },
  RJ: {
    president: "Alessandro Molon",
    address: "Rua Sete de Setembro nº 99/11º – Centro, Rio de Janeiro-RJ, CEP: 20050-005",
    phone: "(21) 2215-2722 / (21) 2215-2760",
    email: "psbriodejaneiro@gmail.com",
    presidentSearchName: "ALESSANDRO MOLON",
  },
  RN: {
    president: "Larissa Rosado",
    address: "Rua Afrânio Peixoto nº 1107 – Bairro Barro Vermelho, Natal-RN, CEP: 59030-210",
    phone: "(84) 98191-4545",
    email: "larissa40000@gmail.com",
    facebook: "PSB Rio Grande do Norte",
    presidentSearchName: "LARISSA ROSADO",
  },
  RS: {
    president: "José Luiz Stédile",
    address: "Rua Barros Cassal nº 288 – Floresta, Porto Alegre-RS, CEP: 90035-030",
    phone: "(51) 3211-3900",
    email: "psbrs@psbrs.org.br",
    facebook: "https://www.facebook.com/PSBRioGrandedoSul",
    website: "https://psbrs.org.br/",
    presidentSearchName: "JOSE LUIZ STEDILE",
  },
  RO: {
    president: "Vinicius Miguel",
    address: "Rua Belém nº 140 – Bairro Embratel, Porto Velho-RO, CEP: 76820-734",
    phone: "(69) 3222-9953",
    email: "v.miguel@uol.com.br / psbro@hotmail.com",
    presidentSearchName: "VINICIUS MIGUEL",
  },
  RR: {
    president: "Senador Chico Rodrigues",
    address: "Rua Governador Aquilino Mota Duarte nº 1976 – Bairro São Francisco, Boa Vista-RR, CEP: 69305-095",
    phone: "(95) 3194-6098",
    email: "sen.chicorodrigues@senador.leg.br / psbroraima@gmail.com",
    facebook: "PSB Roraima",
    presidentSearchName: "CHICO RODRIGUES",
  },
  SC: {
    president: "Nikolas Salvador Bottos",
    address: "Rua Tenente Silveira nº 293 – Apto. 802 – Centro, Florianópolis-SC, CEP: 88010-301",
    phone: "(47) 99115-5527",
    email: "leonardo.psbsc@gmail.com",
    facebook: "PSB Santa Catarina",
    presidentSearchName: "NIKOLAS BOTTOS",
  },
  SP: {
    president: "Caio França",
    address: "Rua Indianópolis nº 1787 – Bairro Planalto Paulista, São Paulo-SP, CEP: 04063-003",
    phone: "(11) 3804-4329 / (11) 3804-4451",
    email: "psbsp4040@gmail.com",
    presidentSearchName: "CAIO FRANCA",
  },
  SE: {
    president: "Zezinho Sobral",
    address: "Avenida Pedro Paes de Azevedo nº 627 – Salgado Filho, Aracaju-SE, CEP: 49020-450",
    phone: "(79) 3246-5999",
    email: "psbsergipe40@gmail.com",
    presidentSearchName: "ZEZINHO SOBRAL",
  },
  TO: {
    president: "Roberto César",
    address: "Avenida JK – 104 Norte – Nº 99 – Sala 9 – Plano Diretor Norte, Palmas-TO, CEP: 77006-014",
    phone: "(63) 3013-2482",
    email: "robertocesarprefeito@gmail.com",
    facebook: "PSB Tocantins",
    presidentSearchName: "ROBERTO CESAR",
  },
};

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export const psbRouter = router({

  // ─── RESUMO NACIONAL ────────────────────────────────────────────────────────
  getNationalSummary: publicProcedure.query(async () => {
    const cacheKey = "psb:national:summary:v6";
    const cached = getCached<unknown>(cacheKey);
    if (cached) return cached;

    // Busca overrides de filiação do banco compartilhado (Mapa de Votação)
    const rawOverrides = await getAllOverrides();
    // Normaliza para o formato usado pela lógica abaixo
    const overrides = rawOverrides.map(o => ({
      sequencial: o.candidato_sequencial,
      originalParty: o.original_party ?? '',
      currentParty: o.current_party ?? '',
    }));

    // Sequenciais que SAÍRAM do PSB (eleitos pelo PSB, hoje em outro partido)
    // Exclui sequenciais ficticios (suplentes) pois não existem no banco externo
    const FICTITIOUS_PREFIX = 'SUPLENTE_';
    const leftPsbSeqs = new Set(overrides
      .filter(o => o.originalParty === 'PSB' && o.currentParty !== 'PSB' && !o.sequencial.startsWith(FICTITIOUS_PREFIX))
      .map(o => o.sequencial));

    // Overrides de quem ENTROU no PSB (eleitos por outro partido, hoje no PSB)
    // Inclui também suplentes PSB (SUP_PSB) que assumiram mandato
    const joinedPsbSeqs = overrides
      .filter(o => (o.originalParty !== 'PSB' && o.originalParty !== 'SUP_PSB') && o.currentParty === 'PSB')
      .map(o => o.sequencial);

    // Suplentes PSB que assumiram mandato (sequencial ficticio, contagem manual)
    const supplantsPsb = overrides.filter(
      o => o.originalParty === 'SUP_PSB' && o.currentParty === 'PSB'
    );

    // Helper para excluir saídas do PSB da query base
    const excludeSeqs = (seqs: Set<string>) =>
      seqs.size > 0 ? `AND candidatoSequencial NOT IN (${Array.from(seqs).map(() => '?').join(',')})` : '';
    const excludeParams = (seqs: Set<string>) => Array.from(seqs);

    // Busca o cargo dos políticos que entraram no PSB (para somar nas contagens corretas)
    // Usa o banco externo para identificar cargo/ano de cada sequencial
    // Separa sequenciais reais (no banco externo) de ficticios (suplentes/casos especiais)
    const realJoinedSeqs = joinedPsbSeqs.filter(s => !s.startsWith(FICTITIOUS_PREFIX));
    // fictitiousJoined: entrou no PSB via sequencial ficticio (ex: suplente de outro partido)
    // Exclui SUP_PSB pois esses já são contados em supplantsPsb
    const fictitiousJoined = overrides.filter(
      o => o.originalParty !== 'PSB' && o.originalParty !== 'SUP_PSB' && o.currentParty === 'PSB' && o.sequencial.startsWith(FICTITIOUS_PREFIX)
    );

    let joinedByCargo: Record<string, number> = {};
    if (realJoinedSeqs.length > 0) {
      const placeholders = realJoinedSeqs.map(() => '?').join(',');
      const joinedRows = await queryTidb<{ cargo: string; ano: number; count: number }>(
        `SELECT cargo, ano, COUNT(*) as count FROM candidate_results
         WHERE candidatoSequencial IN (${placeholders}) AND eleito=1
         GROUP BY cargo, ano`,
        realJoinedSeqs
      );
      for (const row of joinedRows) {
        const key = `${row.cargo}:${row.ano}`;
        joinedByCargo[key] = (joinedByCargo[key] ?? 0) + Number(row.count);
      }
    }

    // Suplentes que assumiram mandato: contados pelo campo notes (cargo:ano)
    // Formato esperado no notes: "cargo:SENADOR ano:2022" ou inferido pelo contexto
    // Por ora, suplentes de SENADOR 2022 contam como +1 senador
    for (const fictitious of fictitiousJoined) {
      // Inferir cargo/ano pelo sequencial ficticio: SUPLENTE_{CARGO}_{UF}_{ANO}
      const parts = fictitious.sequencial.split('_'); // ['SUPLENTE', 'MA', '2022']
      // Formato: SUPLENTE_{UF}_{ANO} → assume cargo SENADOR
      if (parts.length >= 3) {
        const ano = parseInt(parts[parts.length - 1]);
        const key = `SENADOR:${ano}`;
        joinedByCargo[key] = (joinedByCargo[key] ?? 0) + 1;
      }
    }

    const [mayors, councilors, fedDeps, stateDeps, distDeps, senators, governors] = await Promise.all([
      queryTidb<{ total: number }>(
        `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND cargo='PREFEITO' AND ano=2024 ${excludeSeqs(leftPsbSeqs)}`,
        excludeParams(leftPsbSeqs)
      ),
      queryTidb<{ total: number }>(
        `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND cargo='VEREADOR' AND ano=2024 ${excludeSeqs(leftPsbSeqs)}`,
        excludeParams(leftPsbSeqs)
      ),
      queryTidb<{ total: number }>(
        `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND cargo='DEPUTADO FEDERAL' AND ano=2022 ${excludeSeqs(leftPsbSeqs)}`,
        excludeParams(leftPsbSeqs)
      ),
      queryTidb<{ total: number }>(
        `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND cargo='DEPUTADO ESTADUAL' AND ano=2022 ${excludeSeqs(leftPsbSeqs)}`,
        excludeParams(leftPsbSeqs)
      ),
      queryTidb<{ total: number }>(
        `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND cargo='DEPUTADO DISTRITAL' AND ano=2022 ${excludeSeqs(leftPsbSeqs)}`,
        excludeParams(leftPsbSeqs)
      ),
      queryTidb<{ total: number }>(
        `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND cargo='SENADOR' AND ano=2022 ${excludeSeqs(leftPsbSeqs)}`,
        excludeParams(leftPsbSeqs)
      ),
      queryTidb<{ total: number }>(
        `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND cargo='GOVERNADOR' AND ano=2022 ${excludeSeqs(leftPsbSeqs)}`,
        excludeParams(leftPsbSeqs)
      ),
    ]);

    const result = {
      mayors: Number(mayors[0]?.total ?? 0) + (joinedByCargo['PREFEITO:2024'] ?? 0),
      councilors: Number(councilors[0]?.total ?? 0) + (joinedByCargo['VEREADOR:2024'] ?? 0),
      federalDeputies: Number(fedDeps[0]?.total ?? 0) + (joinedByCargo['DEPUTADO FEDERAL:2022'] ?? 0),
      stateDeputies: Number(stateDeps[0]?.total ?? 0) + Number(distDeps[0]?.total ?? 0) + (joinedByCargo['DEPUTADO ESTADUAL:2022'] ?? 0) + (joinedByCargo['DEPUTADO DISTRITAL:2022'] ?? 0),
      senators: Number(senators[0]?.total ?? 0) + (joinedByCargo['SENADOR:2022'] ?? 0) + (joinedByCargo['SENADOR:2018'] ?? 0) + supplantsPsb.length,
      governors: Number(governors[0]?.total ?? 0) + (joinedByCargo['GOVERNADOR:2022'] ?? 0),
      // Metadados para exibição
      affiliationOverrides: {
        leftPsb: leftPsbSeqs.size,
        joinedPsb: joinedPsbSeqs.length,
        lastSync: new Date().toISOString(),
      },
    };

    setCached(cacheKey, result, 3600); // 1h (mais curto pois overrides mudam)
    return result;
  }),

  // ─── RANKING DE ESTADOS (todos os cargos) ────────────────────────────────────
  getStateRanking: publicProcedure
    .input(z.object({ limit: z.number().default(27) }))
    .query(async ({ input }) => {
      const cacheKey = `psb:state:ranking:v2:${input.limit}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const limitVal = Math.min(Math.max(1, parseInt(String(input.limit))), 27);
      const rows = await queryTidb<{
        uf: string; mayors: number; councilors: number;
        fedDeps: number; stateDeps: number; senators: number; governors: number;
      }>(`
        SELECT
          uf,
          SUM(CASE WHEN cargo='PREFEITO' AND ano=2024 AND turno=1 THEN 1 ELSE 0 END) as mayors,
          SUM(CASE WHEN cargo='VEREADOR' AND ano=2024 AND turno=1 THEN 1 ELSE 0 END) as councilors,
          SUM(CASE WHEN cargo='DEPUTADO FEDERAL' AND ano=2022 AND turno=1 THEN 1 ELSE 0 END) as fedDeps,
          SUM(CASE WHEN cargo IN ('DEPUTADO ESTADUAL','DEPUTADO DISTRITAL') AND ano=2022 AND turno=1 THEN 1 ELSE 0 END) as stateDeps,
          SUM(CASE WHEN cargo='SENADOR' AND ano=2022 AND turno=1 THEN 1 ELSE 0 END) as senators,
          SUM(CASE WHEN cargo='GOVERNADOR' AND ano=2022 AND turno=1 THEN 1 ELSE 0 END) as governors
        FROM candidate_results
        WHERE partidoSigla='PSB' AND eleito=1
          AND ((cargo IN ('PREFEITO','VEREADOR') AND ano=2024 AND turno=1)
            OR (cargo IN ('DEPUTADO FEDERAL','DEPUTADO ESTADUAL','DEPUTADO DISTRITAL','SENADOR','GOVERNADOR') AND ano=2022 AND turno=1))
        GROUP BY uf
        ORDER BY (
          SUM(CASE WHEN cargo='GOVERNADOR' AND ano=2022 THEN 10 ELSE 0 END) +
          SUM(CASE WHEN cargo='SENADOR' AND ano=2022 THEN 8 ELSE 0 END) +
          SUM(CASE WHEN cargo='DEPUTADO FEDERAL' AND ano=2022 THEN 3 ELSE 0 END) +
          SUM(CASE WHEN cargo IN ('DEPUTADO ESTADUAL','DEPUTADO DISTRITAL') AND ano=2022 THEN 2 ELSE 0 END) +
          SUM(CASE WHEN cargo='PREFEITO' AND ano=2024 THEN 5 ELSE 0 END) +
          SUM(CASE WHEN cargo='VEREADOR' AND ano=2024 THEN 1 ELSE 0 END)
        ) DESC
        LIMIT ${limitVal}
      `);

      const result = rows.map(r => ({
        uf: r.uf,
        name: STATE_NAMES[r.uf] ?? r.uf,
        mayors: Number(r.mayors),
        councilors: Number(r.councilors),
        federalDeputies: Number(r.fedDeps),
        stateDeputies: Number(r.stateDeps),
        senators: Number(r.senators),
        governors: Number(r.governors),
        total: Number(r.mayors) + Number(r.councilors) + Number(r.fedDeps) + Number(r.stateDeps) + Number(r.senators) + Number(r.governors),
      }));

      setCached(cacheKey, result, 86400);
      return result;
    }),

  // ─── DADOS DEMOGRÁFICOS DO ESTADO (IBGE) ─────────────────────────────────────
  getStateDemographics: publicProcedure
    .input(z.object({ uf: z.string().length(2) }))
    .query(async ({ input }) => {
      const uf = input.uf.toUpperCase();
      const cacheKey = `psb:state:demographics:v2:${uf}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      // Busca dados do IBGE via API (população 2022)
      let population = 0;
      let ibgeCode = "";

      // Helper para buscar JSON do IBGE (fetch descomprime gzip automaticamente)
      async function fetchIbgeJson(url: string): Promise<unknown> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`IBGE HTTP ${res.status}`);
        return res.json();
      }

      try {
        const states = await fetchIbgeJson("https://servicodados.ibge.gov.br/api/v1/localidades/estados") as Array<{ sigla: string; id: number }>;
        const state = states.find((s) => s.sigla === uf);
        if (state) {
          ibgeCode = String(state.id);
          // Busca população do censo 2022
          const popData = await fetchIbgeJson(
            `https://servicodados.ibge.gov.br/api/v3/agregados/4709/periodos/2022/variaveis/93?localidades=N3[${ibgeCode}]`
          ) as Array<{ resultados: Array<{ series: Array<{ serie: Record<string, string> }> }> }>;
          const val = popData?.[0]?.resultados?.[0]?.series?.[0]?.serie?.["2022"];
          if (val) population = parseInt(val);
        }
      } catch (_) { /* fallback */ }

      // Busca eleitores do TSE via candidate_results (soma de eleitores por município)
      let voters = 0;
      try {
        // Usa o total de votos válidos + brancos + nulos como proxy de comparecimento
        const voteRows = await queryTidb<{ totalVotos: number }>(`
          SELECT SUM(totalVotos) as totalVotos
          FROM candidate_results
          WHERE uf=? AND ano=2022 AND turno=1 AND cargo='DEPUTADO FEDERAL'
          LIMIT 1
        `, [uf]);
        // Eleitores = votos / taxa de comparecimento (~79%)
        const totalVotos = Number(voteRows[0]?.totalVotos ?? 0);
        if (totalVotos > 0) voters = Math.round(totalVotos / 0.79);
      } catch (_) { /* fallback */ }

      // Se não tiver dados do banco, estima pelo IBGE (72% da população)
      if (voters === 0 && population > 0) {
        voters = Math.round(population * 0.72);
      }

      const result = {
        uf,
        name: STATE_NAMES[uf] ?? uf,
        population,
        voters,
        turnout: 79.5,
        abstention: 20.5,
        ibgeCode,
      };

      setCached(cacheKey, result, 604800); // 7 dias
      return result;
    }),

  // ─── DIRETÓRIO ESTADUAL PSB ──────────────────────────────────────────────────
  getStateDirectory: publicProcedure
    .input(z.object({ uf: z.string().length(2) }))
    .query(async ({ input }) => {
      const uf = input.uf.toUpperCase();
      const dir = PSB_DIRECTORIES[uf];

      if (!dir) {
        return {
          uf,
          name: STATE_NAMES[uf] ?? uf,
          president: "Informação não disponível",
          address: `${STATE_NAMES[uf] ?? uf}`,
          phone: "",
          email: "",
          presidentSequencial: null as string | null,
          presidentPhotoUrl: null as string | null,
        };
      }

      // Busca o sequencial do presidente no banco para linkar ao perfil
      let presidentSequencial: string | null = null;
      let presidentPhotoUrl: string | null = null;

      if (dir.presidentSearchName) {
        try {
          const searchName = dir.presidentSearchName.toUpperCase();
          const presRows = await queryTidb<{
            candidatoSequencial: string; ano: number; cargo: string; uf: string;
          }>(`
            SELECT candidatoSequencial, ano, cargo, uf
            FROM candidate_results
            WHERE candidatoNome LIKE ? AND uf=?
            ORDER BY ano DESC, eleito DESC
            LIMIT 1
          `, [`%${searchName}%`, uf]);

          if (presRows.length) {
            presidentSequencial = presRows[0].candidatoSequencial;
            presidentPhotoUrl = getPhotoUrl(
              presRows[0].candidatoSequencial,
              presRows[0].uf,
              presRows[0].ano,
              presRows[0].cargo
            );
          }
        } catch (_) { /* fallback */ }
      }

      return {
        uf,
        name: STATE_NAMES[uf] ?? uf,
        ...dir,
        presidentSequencial,
        presidentPhotoUrl,
      };
    }),

  // ─── QUADRO ATUAL DE ELEITOS ─────────────────────────────────────────────────
  getStateQuadro: publicProcedure
    .input(z.object({ uf: z.string().length(2) }))
    .query(async ({ input }) => {
      const uf = input.uf.toUpperCase();
      const cacheKey = `psb:state:quadro:v2:${uf}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const rows = await queryTidb<{ cargo: string; total: number }>(`
        SELECT cargo, COUNT(*) as total
        FROM candidate_results
        WHERE partidoSigla='PSB' AND eleito=1 AND uf=? AND turno=1
          AND ((cargo IN ('PREFEITO','VEREADOR') AND ano=2024)
            OR (cargo IN ('DEPUTADO FEDERAL','DEPUTADO ESTADUAL','DEPUTADO DISTRITAL','SENADOR','GOVERNADOR') AND ano=2022))
        GROUP BY cargo
      `, [uf]);

      const byRole: Record<string, number> = {};
      rows.forEach(r => { byRole[r.cargo] = Number(r.total); });

      const result = {
        uf,
        name: STATE_NAMES[uf] ?? uf,
        mayors: byRole["PREFEITO"] ?? 0,
        councilors: byRole["VEREADOR"] ?? 0,
        federalDeputies: byRole["DEPUTADO FEDERAL"] ?? 0,
        stateDeputies: (byRole["DEPUTADO ESTADUAL"] ?? 0) + (byRole["DEPUTADO DISTRITAL"] ?? 0),
        senators: byRole["SENADOR"] ?? 0,
        governors: byRole["GOVERNADOR"] ?? 0,
      };

      setCached(cacheKey, result, 86400);
      return result;
    }),

  // ─── HISTÓRICO 2014-2024 ─────────────────────────────────────────────────────
  getStateHistory: publicProcedure
    .input(z.object({ uf: z.string().length(2) }))
    .query(async ({ input }) => {
      const uf = input.uf.toUpperCase();
      const cacheKey = `psb:state:history:v2:${uf}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const rows = await queryTidb<{
        ano: number; cargo: string; total: number;
      }>(`
        SELECT ano, cargo, COUNT(*) as total
        FROM candidate_results
        WHERE partidoSigla='PSB' AND eleito=1 AND uf=? AND turno=1
        GROUP BY ano, cargo
        ORDER BY ano ASC
      `, [uf]);

      const byYear: Record<number, Record<string, number>> = {};
      rows.forEach(r => {
        const yr = Number(r.ano);
        if (!byYear[yr]) byYear[yr] = {};
        const cargo = r.cargo === "DEPUTADO DISTRITAL" ? "DEPUTADO ESTADUAL" : r.cargo;
        byYear[yr][cargo] = (byYear[yr][cargo] ?? 0) + Number(r.total);
      });

      const result = Object.entries(byYear).map(([year, cargos]) => ({
        year: parseInt(year),
        mayors: cargos["PREFEITO"] ?? 0,
        councilors: cargos["VEREADOR"] ?? 0,
        federalDeputies: cargos["DEPUTADO FEDERAL"] ?? 0,
        stateDeputies: cargos["DEPUTADO ESTADUAL"] ?? 0,
        senators: cargos["SENADOR"] ?? 0,
        governors: cargos["GOVERNADOR"] ?? 0,
        total: Object.values(cargos).reduce((a, b) => a + b, 0),
      }));

      setCached(cacheKey, result, 604800);
      return result;
    }),

  // ─── LISTA DE ELEITOS POR CARGO ───────────────────────────────────────────────
  getStateElected: publicProcedure
    .input(z.object({
      uf: z.string().length(2),
      cargo: z.string(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
      municipio: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const uf = input.uf.toUpperCase();
      const cargo = input.cargo.toUpperCase();
      const offset = (input.page - 1) * input.pageSize;
      const ano = ["PREFEITO", "VEREADOR"].includes(cargo) ? 2024 : 2022;
      const cacheKey = `psb:state:elected:v2:${uf}:${cargo}:${input.page}:${input.municipio ?? ""}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const needsMunicipio = ["PREFEITO", "VEREADOR"].includes(cargo);
      const limitVal = parseInt(String(input.pageSize));
      const offsetVal = parseInt(String(offset));

      let sql: string;
      const params: unknown[] = [];

      if (needsMunicipio) {
        sql = `
          SELECT DISTINCT cr.candidatoSequencial, cr.candidatoNome, cr.candidatoNomeUrna,
            cr.cargo, cr.uf, cr.ano, cr.totalVotos, cr.percentualSobreValidos,
            cr.situacao, cr.receitaTotal, cr.despesaTotal,
            czr.nomeMunicipio
          FROM candidate_results cr
          LEFT JOIN (
            SELECT candidatoSequencial, nomeMunicipio
            FROM candidate_zone_results
            WHERE ano=? AND turno=1
            GROUP BY candidatoSequencial, nomeMunicipio
          ) czr ON cr.candidatoSequencial = czr.candidatoSequencial
          WHERE cr.partidoSigla='PSB' AND cr.eleito=1 AND cr.uf=? AND cr.cargo=? AND cr.ano=? AND cr.turno=1
        `;
        params.push(ano, uf, cargo, ano);
        if (input.municipio) {
          sql += ` AND czr.nomeMunicipio LIKE ?`;
          params.push(`%${input.municipio.toUpperCase()}%`);
        }
        sql += ` ORDER BY cr.totalVotos DESC LIMIT ${limitVal} OFFSET ${offsetVal}`;
      } else {
        sql = `
          SELECT candidatoSequencial, candidatoNome, candidatoNomeUrna,
            cargo, uf, ano, totalVotos, percentualSobreValidos,
            situacao, receitaTotal, despesaTotal, NULL as nomeMunicipio
          FROM candidate_results
          WHERE partidoSigla='PSB' AND eleito=1 AND uf=? AND cargo=? AND ano=? AND turno=1
          ORDER BY totalVotos DESC LIMIT ${limitVal} OFFSET ${offsetVal}
        `;
        params.push(uf, cargo, ano);
      }

      const [rows, countRows] = await Promise.all([
        queryTidb<{
          candidatoSequencial: string; candidatoNome: string; candidatoNomeUrna: string;
          cargo: string; uf: string; ano: number; totalVotos: number; percentualSobreValidos: number;
          situacao: string; receitaTotal: number; despesaTotal: number; nomeMunicipio: string;
        }>(sql, params),
        queryTidb<{ total: number }>(
          needsMunicipio
            ? `SELECT COUNT(DISTINCT cr.candidatoSequencial) as total FROM candidate_results cr LEFT JOIN (SELECT candidatoSequencial, nomeMunicipio FROM candidate_zone_results WHERE ano=? AND turno=1 GROUP BY candidatoSequencial, nomeMunicipio) czr ON cr.candidatoSequencial=czr.candidatoSequencial WHERE cr.partidoSigla='PSB' AND cr.eleito=1 AND cr.uf=? AND cr.cargo=? AND cr.ano=? AND cr.turno=1 ${input.municipio ? "AND czr.nomeMunicipio LIKE ?" : ""}`
            : `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND uf=? AND cargo=? AND ano=? AND turno=1`,
          needsMunicipio
            ? (input.municipio ? [ano, uf, cargo, ano, `%${input.municipio.toUpperCase()}%`] : [ano, uf, cargo, ano])
            : [uf, cargo, ano]
        ),
      ]);

      const result = {
        items: rows.map(r => ({
          sequencial: r.candidatoSequencial,
          name: r.candidatoNome,
          nameUrna: r.candidatoNomeUrna,
          cargo: r.cargo,
          uf: r.uf,
          ano: Number(r.ano),
          municipality: r.nomeMunicipio ?? "",
          votes: Number(r.totalVotos),
          percentage: Number(r.percentualSobreValidos),
          situation: r.situacao,
          receipt: Number(r.receitaTotal ?? 0),
          expense: Number(r.despesaTotal ?? 0),
          costPerVote: r.totalVotos > 0
            ? Math.round((Number(r.despesaTotal ?? 0) / Number(r.totalVotos)) * 100) / 100
            : 0,
          photoUrl: getPhotoUrl(r.candidatoSequencial, r.uf, Number(r.ano), r.cargo),
        })),
        total: Number(countRows[0]?.total ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };

      setCached(cacheKey, result, 86400);
      return result;
    }),

  // ─── LISTA NACIONAL POR CARGO ─────────────────────────────────────────────────
  getNationalElected: publicProcedure
    .input(z.object({
      cargo: z.string(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
      uf: z.string().optional(),
      orderBy: z.enum(["votes", "costPerVote", "name"]).default("votes"),
    }))
    .query(async ({ input }) => {
      const cargo = input.cargo.toUpperCase();
      const ano = ["PREFEITO", "VEREADOR"].includes(cargo) ? 2024 : 2022;
      const offset = (input.page - 1) * input.pageSize;
      const limitVal = parseInt(String(input.pageSize));
      const offsetVal = parseInt(String(offset));
      const cacheKey = `psb:national:elected:v2:${cargo}:${input.page}:${input.uf ?? ""}:${input.orderBy}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      // Para a query sem múnicipios não usa alias cr., para a com municípios usa
      // Usamos nomes sem alias pois ambas as queries têm as mesmas colunas
      const orderClause = input.orderBy === "costPerVote"
        ? "CASE WHEN totalVotos > 0 THEN despesaTotal/totalVotos ELSE 0 END DESC"
        : input.orderBy === "name"
          ? "candidatoNome ASC"
          : "totalVotos DESC";

      const needsMunicipio = ["PREFEITO", "VEREADOR"].includes(cargo);
      const params: unknown[] = [];

      let sql: string;
      if (needsMunicipio) {
        sql = `
          SELECT DISTINCT cr.candidatoSequencial, cr.candidatoNome, cr.candidatoNomeUrna,
            cr.cargo, cr.uf, cr.ano, cr.totalVotos, cr.percentualSobreValidos,
            cr.situacao, cr.receitaTotal, cr.despesaTotal,
            czr.nomeMunicipio
          FROM candidate_results cr
          LEFT JOIN (
            SELECT candidatoSequencial, nomeMunicipio
            FROM candidate_zone_results
            WHERE ano=? AND turno=1
            GROUP BY candidatoSequencial, nomeMunicipio
          ) czr ON cr.candidatoSequencial = czr.candidatoSequencial
          WHERE cr.partidoSigla='PSB' AND cr.eleito=1 AND cr.cargo=? AND cr.ano=? AND cr.turno=1
        `;
        params.push(ano, cargo, ano);
      } else {
        sql = `
          SELECT candidatoSequencial, candidatoNome, candidatoNomeUrna,
            cargo, uf, ano, totalVotos, percentualSobreValidos,
            situacao, receitaTotal, despesaTotal, NULL as nomeMunicipio
          FROM candidate_results
          WHERE partidoSigla='PSB' AND eleito=1 AND cargo=? AND ano=? AND turno=1
        `;
        params.push(cargo, ano);
      }

      if (input.uf) {
        // Para query sem múnicipios não tem alias cr., para a com múnicipios tem
        sql += needsMunicipio ? ` AND cr.uf=?` : ` AND uf=?`;
        params.push(input.uf.toUpperCase());
      }

      sql += ` ORDER BY ${orderClause} LIMIT ${limitVal} OFFSET ${offsetVal}`;

      const [rows, countRows] = await Promise.all([
        queryTidb<{
          candidatoSequencial: string; candidatoNome: string; candidatoNomeUrna: string;
          cargo: string; uf: string; ano: number; totalVotos: number; percentualSobreValidos: number;
          situacao: string; receitaTotal: number; despesaTotal: number; nomeMunicipio: string;
        }>(sql, params),
        queryTidb<{ total: number }>(
          needsMunicipio
            ? `SELECT COUNT(DISTINCT cr.candidatoSequencial) as total FROM candidate_results cr WHERE cr.partidoSigla='PSB' AND cr.eleito=1 AND cr.cargo=? AND cr.ano=? AND cr.turno=1 ${input.uf ? "AND cr.uf=?" : ""}`
            : `SELECT COUNT(*) as total FROM candidate_results WHERE partidoSigla='PSB' AND eleito=1 AND cargo=? AND ano=? AND turno=1 ${input.uf ? "AND uf=?" : ""}`,
          input.uf ? [cargo, ano, input.uf.toUpperCase()] : [cargo, ano]
        ),
      ]);

      const result = {
        items: rows.map(r => ({
          sequencial: r.candidatoSequencial,
          name: r.candidatoNome,
          nameUrna: r.candidatoNomeUrna,
          cargo: r.cargo,
          uf: r.uf,
          stateName: STATE_NAMES[r.uf] ?? r.uf,
          ano: Number(r.ano),
          municipality: r.nomeMunicipio ?? "",
          votes: Number(r.totalVotos),
          percentage: Number(r.percentualSobreValidos),
          situation: r.situacao,
          receipt: Number(r.receitaTotal ?? 0),
          expense: Number(r.despesaTotal ?? 0),
          costPerVote: r.totalVotos > 0
            ? Math.round((Number(r.despesaTotal ?? 0) / Number(r.totalVotos)) * 100) / 100
            : 0,
          photoUrl: getPhotoUrl(r.candidatoSequencial, r.uf, Number(r.ano), r.cargo),
        })),
        total: Number(countRows[0]?.total ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };

      setCached(cacheKey, result, 86400);
      return result;
    }),

  // ─── MUNICÍPIOS COM ELEITOS PSB ───────────────────────────────────────────────
  getStateMunicipalities: publicProcedure
    .input(z.object({ uf: z.string().length(2) }))
    .query(async ({ input }) => {
      const uf = input.uf.toUpperCase();
      const cacheKey = `psb:state:municipalities:v2:${uf}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const rows = await queryTidb<{
        nomeMunicipio: string; codigoMunicipio: string;
        mayors: number; councilors: number;
      }>(`
        SELECT czr.nomeMunicipio, czr.codigoMunicipio,
          SUM(CASE WHEN cr.cargo='PREFEITO' THEN 1 ELSE 0 END) as mayors,
          SUM(CASE WHEN cr.cargo='VEREADOR' THEN 1 ELSE 0 END) as councilors
        FROM candidate_results cr
        INNER JOIN (
          SELECT DISTINCT candidatoSequencial, nomeMunicipio, codigoMunicipio
          FROM candidate_zone_results
          WHERE ano=2024 AND turno=1
        ) czr ON cr.candidatoSequencial = czr.candidatoSequencial
        WHERE cr.partidoSigla='PSB' AND cr.eleito=1 AND cr.uf=?
          AND cr.cargo IN ('PREFEITO','VEREADOR') AND cr.ano=2024 AND cr.turno=1
        GROUP BY czr.nomeMunicipio, czr.codigoMunicipio
        ORDER BY (SUM(CASE WHEN cr.cargo='PREFEITO' THEN 5 ELSE 1 END)) DESC
      `, [uf]);

      const result = rows.map(r => ({
        name: r.nomeMunicipio,
        code: r.codigoMunicipio,
        mayors: Number(r.mayors),
        councilors: Number(r.councilors),
        total: Number(r.mayors) + Number(r.councilors),
      }));

      setCached(cacheKey, result, 86400);
      return result;
    }),

  // ─── ELEITOS POR MUNICÍPIO ────────────────────────────────────────────────────
  getMunicipalityElected: publicProcedure
    .input(z.object({
      uf: z.string().length(2),
      municipio: z.string(),
    }))
    .query(async ({ input }) => {
      const uf = input.uf.toUpperCase();
      const municipio = input.municipio.toUpperCase();
      const cacheKey = `psb:municipality:elected:v2:${uf}:${municipio}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const rows = await queryTidb<{
        candidatoSequencial: string; candidatoNome: string; candidatoNomeUrna: string;
        cargo: string; uf: string; ano: number; totalVotos: number;
        percentualSobreValidos: number; situacao: string; receitaTotal: number;
        despesaTotal: number; nomeMunicipio: string;
      }>(`
        SELECT DISTINCT cr.candidatoSequencial, cr.candidatoNome, cr.candidatoNomeUrna,
          cr.cargo, cr.uf, cr.ano, cr.totalVotos, cr.percentualSobreValidos,
          cr.situacao, cr.receitaTotal, cr.despesaTotal,
          czr.nomeMunicipio
        FROM candidate_results cr
        INNER JOIN (
          SELECT DISTINCT candidatoSequencial, nomeMunicipio
          FROM candidate_zone_results
          WHERE nomeMunicipio LIKE ? AND ano=2024 AND turno=1
        ) czr ON cr.candidatoSequencial = czr.candidatoSequencial
        WHERE cr.partidoSigla='PSB' AND cr.eleito=1 AND cr.uf=?
          AND cr.cargo IN ('PREFEITO','VEREADOR') AND cr.ano=2024 AND cr.turno=1
        ORDER BY cr.cargo ASC, cr.totalVotos DESC
      `, [`%${municipio}%`, uf]);

      const result = rows.map(r => ({
        sequencial: r.candidatoSequencial,
        name: r.candidatoNome,
        nameUrna: r.candidatoNomeUrna,
        cargo: r.cargo,
        uf: r.uf,
        ano: Number(r.ano),
        municipality: r.nomeMunicipio ?? municipio,
        votes: Number(r.totalVotos),
        percentage: Number(r.percentualSobreValidos),
        situation: r.situacao,
        receipt: Number(r.receitaTotal ?? 0),
        expense: Number(r.despesaTotal ?? 0),
        costPerVote: r.totalVotos > 0
          ? Math.round((Number(r.despesaTotal ?? 0) / Number(r.totalVotos)) * 100) / 100
          : 0,
        photoUrl: getPhotoUrl(r.candidatoSequencial, r.uf, Number(r.ano), r.cargo),
      }));

      setCached(cacheKey, result, 86400);
      return result;
    }),

  // ─── PERFIL DO POLÍTICO ───────────────────────────────────────────────────────
  getPoliticianProfile: publicProcedure
    .input(z.object({ sequencial: z.string() }))
    .query(async ({ input }) => {
      const cacheKey = `psb:politician:profile:v2:${input.sequencial}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const rows = await queryTidb<{
        candidatoSequencial: string; candidatoNome: string; candidatoNomeUrna: string;
        partidoSigla: string; uf: string; cargo: string; ano: number; turno: number;
        totalVotos: number; percentualSobreValidos: number; situacao: string;
        eleito: number; receitaTotal: number; despesaTotal: number; cpf: string;
        nomeMunicipio: string;
      }>(`
        SELECT cr.candidatoSequencial, cr.candidatoNome, cr.candidatoNomeUrna,
               cr.partidoSigla, cr.uf, cr.cargo, cr.ano, cr.turno,
               cr.totalVotos, cr.percentualSobreValidos, cr.situacao, cr.eleito,
               cr.receitaTotal, cr.despesaTotal, cr.cpf,
               czr.nomeMunicipio
        FROM candidate_results cr
        LEFT JOIN (
          SELECT candidatoSequencial, nomeMunicipio
          FROM candidate_zone_results
          WHERE candidatoSequencial=?
          GROUP BY candidatoSequencial, nomeMunicipio
          LIMIT 1
        ) czr ON cr.candidatoSequencial = czr.candidatoSequencial
        WHERE cr.candidatoSequencial=?
        ORDER BY cr.ano DESC, cr.turno DESC
        LIMIT 1
      `, [input.sequencial, input.sequencial]);

      if (!rows.length) throw new Error("Político não encontrado");
      const r = rows[0];

      const result = {
        sequencial: r.candidatoSequencial,
        name: r.candidatoNome,
        nameUrna: r.candidatoNomeUrna,
        party: r.partidoSigla,
        uf: r.uf,
        stateName: STATE_NAMES[r.uf] ?? r.uf,
        cargo: r.cargo,
        ano: Number(r.ano),
        municipality: r.nomeMunicipio ?? "",
        votes: Number(r.totalVotos),
        percentage: Number(r.percentualSobreValidos),
        situation: r.situacao,
        elected: Boolean(r.eleito),
        receipt: Number(r.receitaTotal ?? 0),
        expense: Number(r.despesaTotal ?? 0),
        costPerVote: r.totalVotos > 0
          ? Math.round((Number(r.despesaTotal ?? 0) / Number(r.totalVotos)) * 100) / 100
          : 0,
        cpf: r.cpf ?? "",
        photoUrl: getPhotoUrl(r.candidatoSequencial, r.uf, Number(r.ano), r.cargo),
      };

      setCached(cacheKey, result, 604800);
      return result;
    }),

  // ─── HISTÓRICO ELEITORAL DO POLÍTICO (por CPF, sem duplicatas) ───────────────
  getPoliticianHistory: publicProcedure
    .input(z.object({ sequencial: z.string() }))
    .query(async ({ input }) => {
      const cacheKey = `psb:politician:history:v3:${input.sequencial}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const nameRows = await queryTidb<{ candidatoNome: string; cpf: string; uf: string }>(
        `SELECT candidatoNome, cpf, uf FROM candidate_results WHERE candidatoSequencial=? LIMIT 1`,
        [input.sequencial]
      );

      if (!nameRows.length) return [];
      const { candidatoNome, cpf, uf } = nameRows[0];

      // Busca histórico - usa UNION de CPF + nome COLLATE para cobrir anos sem CPF (ex: 2018)
      // Agrupa por ano+cargo para evitar duplicatas
      let rows: Array<{
        ano: number; cargo: string; uf: string; turno: number;
        totalVotos: number; percentualSobreValidos: number; situacao: string;
        eleito: number; receitaTotal: number; despesaTotal: number;
        partidoSigla: string; candidatoSequencial: string; nomeMunicipio: string;
      }>;

      // Query principal: candidate_results com UNION CPF + nome COLLATE
      // O UNION garante que anos sem CPF (ex: 2018) também sejam incluídos
      const namePrefixForMain = candidatoNome.split(' ').slice(0, 2).join(' ') + '%';
      const mainQuery = cpf && cpf.length > 5 ? `
        SELECT cr.ano, cr.cargo, cr.uf, cr.turno, cr.totalVotos, cr.percentualSobreValidos,
               cr.situacao, cr.eleito, cr.receitaTotal, cr.despesaTotal, cr.partidoSigla,
               cr.candidatoSequencial,
               czr.nomeMunicipio
        FROM candidate_results cr
        LEFT JOIN (
          SELECT candidatoSequencial, nomeMunicipio, ano
          FROM candidate_zone_results
          GROUP BY candidatoSequencial, nomeMunicipio, ano
        ) czr ON cr.candidatoSequencial = czr.candidatoSequencial AND cr.ano = czr.ano
        WHERE cr.cpf=?
        UNION
        SELECT cr.ano, cr.cargo, cr.uf, cr.turno, cr.totalVotos, cr.percentualSobreValidos,
               cr.situacao, cr.eleito, cr.receitaTotal, cr.despesaTotal, cr.partidoSigla,
               cr.candidatoSequencial,
               czr.nomeMunicipio
        FROM candidate_results cr
        LEFT JOIN (
          SELECT candidatoSequencial, nomeMunicipio, ano
          FROM candidate_zone_results
          GROUP BY candidatoSequencial, nomeMunicipio, ano
        ) czr ON cr.candidatoSequencial = czr.candidatoSequencial AND cr.ano = czr.ano
        WHERE cr.candidatoNome COLLATE utf8mb4_general_ci LIKE ? AND cr.uf=?
        ORDER BY ano ASC, turno ASC
      ` : `
        SELECT cr.ano, cr.cargo, cr.uf, cr.turno, cr.totalVotos, cr.percentualSobreValidos,
               cr.situacao, cr.eleito, cr.receitaTotal, cr.despesaTotal, cr.partidoSigla,
               cr.candidatoSequencial,
               czr.nomeMunicipio
        FROM candidate_results cr
        LEFT JOIN (
          SELECT candidatoSequencial, nomeMunicipio, ano
          FROM candidate_zone_results
          GROUP BY candidatoSequencial, nomeMunicipio, ano
        ) czr ON cr.candidatoSequencial = czr.candidatoSequencial AND cr.ano = czr.ano
        WHERE cr.candidatoNome=? AND cr.uf=?
        ORDER BY cr.ano ASC, cr.turno ASC
      `;
      const mainParams = cpf && cpf.length > 5
        ? [cpf, namePrefixForMain, uf]
        : [candidatoNome, uf];
      rows = await queryTidb(mainQuery, mainParams);

      // Complementar com dados da tabela candidates (DivulgaCand) para anos sem CPF (ex: 2010)
      // Usa COLLATE utf8mb4_general_ci para ignorar acentos, e prefixo das 2 primeiras palavras
      // para cobrir variações de nome (ex: "LIDICE DA MATA" vs "LÍDICE DA MATA E SOUZA")
      const existingYears = new Set(rows.map(r => Number(r.ano)));
      try {
        // Extrair prefixo: primeiras 2 palavras do nome (sem acento via COLLATE)
        const nameParts = candidatoNome.split(' ');
        const namePrefix = nameParts.slice(0, 2).join(' ') + '%';
        const candidatesRows = await queryTidb<{
          ano: number; cargo: string; uf: string; situacao: string; eleito: number;
          partidoSigla: string; sequencial: string;
        }>(
          `SELECT ano, cargo, uf, situacao, eleito, partidoSigla, sequencial
           FROM candidates
           WHERE nome COLLATE utf8mb4_general_ci LIKE ? AND uf=?
           ORDER BY ano ASC`,
          [namePrefix, uf]
        );
        for (const c of candidatesRows) {
          const yr = Number(c.ano);
          if (!existingYears.has(yr)) {
            rows.push({
              ano: yr,
              cargo: c.cargo,
              uf: c.uf ?? uf,
              turno: 1,
              totalVotos: 0,
              percentualSobreValidos: 0,
              situacao: c.situacao ?? "ELEITO",
              eleito: c.eleito ?? 1,
              receitaTotal: 0,
              despesaTotal: 0,
              partidoSigla: c.partidoSigla,
              candidatoSequencial: c.sequencial ?? input.sequencial,
              nomeMunicipio: "",
            });
            existingYears.add(yr);
          }
        }
      } catch (_) { /* tabela candidates pode não existir em todos os ambientes */ }

      // Agrupa por ano+cargo, priorizando turno 2 se eleito, senão turno 1
      const grouped: Record<string, typeof rows[0]> = {};
      rows.forEach(r => {
        const key = `${r.ano}-${r.cargo}`;
        const existing = grouped[key];
        if (!existing) {
          grouped[key] = r;
        } else {
          // Prefere turno 2 se eleito, senão mantém o turno com mais votos
          if (r.eleito && !existing.eleito) {
            grouped[key] = r;
          } else if (r.turno === 2 && existing.turno === 1 && r.eleito) {
            grouped[key] = r;
          }
        }
      });

      const result = Object.values(grouped)
        .sort((a, b) => a.ano - b.ano)
        .map(r => ({
          year: Number(r.ano),
          cargo: r.cargo,
          uf: r.uf,
          municipality: r.nomeMunicipio ?? "",
          party: r.partidoSigla,
          votes: Number(r.totalVotos),
          percentage: Number(r.percentualSobreValidos),
          situation: r.situacao,
          elected: Boolean(r.eleito),
          receipt: Number(r.receitaTotal ?? 0),
          expense: Number(r.despesaTotal ?? 0),
          costPerVote: r.totalVotos > 0
            ? Math.round((Number(r.despesaTotal ?? 0) / Number(r.totalVotos)) * 100) / 100
            : 0,
          sequencial: r.candidatoSequencial,
          photoUrl: getPhotoUrl(r.candidatoSequencial, r.uf, Number(r.ano), r.cargo),
        }));

      setCached(cacheKey, result, 604800);
      return result;
    }),

  // ─── VOTAÇÃO POR ZONA ELEITORAL ───────────────────────────────────────────────
  getPoliticianZones: publicProcedure
    .input(z.object({
      sequencial: z.string(),
      ano: z.number().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const cacheKey = `psb:politician:zones:v2:${input.sequencial}:${input.ano ?? "latest"}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      let ano = input.ano;
      if (!ano) {
        const anoRows = await queryTidb<{ ano: number }>(
          `SELECT MAX(ano) as ano FROM candidate_results WHERE candidatoSequencial=?`,
          [input.sequencial]
        );
        ano = Number(anoRows[0]?.ano ?? 2024);
      }

      const limitVal = Math.min(Math.max(1, parseInt(String(input.limit))), 100);
      const rows = await queryTidb<{
        codigoMunicipio: string; nomeMunicipio: string; numeroZona: string; totalVotos: number;
      }>(`
        SELECT codigoMunicipio, nomeMunicipio, numeroZona, SUM(totalVotos) as totalVotos
        FROM candidate_zone_results
        WHERE candidatoSequencial=? AND ano=? AND turno=1
        GROUP BY codigoMunicipio, nomeMunicipio, numeroZona
        ORDER BY totalVotos DESC
        LIMIT ${limitVal}
      `, [input.sequencial, ano]);

      const result = rows.map(r => ({
        municipalityCode: r.codigoMunicipio,
        municipality: r.nomeMunicipio,
        zone: r.numeroZona,
        votes: Number(r.totalVotos),
      }));

      setCached(cacheKey, result, 604800);
      return result;
    }),

  // ─── CONCORRENTES DO POLÍTICO ─────────────────────────────────────────────────
  getPoliticianCompetitors: publicProcedure
    .input(z.object({ sequencial: z.string() }))
    .query(async ({ input }) => {
      const cacheKey = `psb:politician:competitors:v2:${input.sequencial}`;
      const cached = getCached<unknown>(cacheKey);
      if (cached) return cached;

      const profileRows = await queryTidb<{
        uf: string; cargo: string; ano: number; nomeMunicipio: string;
      }>(`
        SELECT cr.uf, cr.cargo, cr.ano, czr.nomeMunicipio
        FROM candidate_results cr
        LEFT JOIN (
          SELECT candidatoSequencial, nomeMunicipio
          FROM candidate_zone_results
          WHERE candidatoSequencial=?
          GROUP BY candidatoSequencial, nomeMunicipio
          LIMIT 1
        ) czr ON cr.candidatoSequencial = czr.candidatoSequencial
        WHERE cr.candidatoSequencial=?
        ORDER BY cr.ano DESC LIMIT 1
      `, [input.sequencial, input.sequencial]);

      if (!profileRows.length) return [];
      const { uf, cargo, ano, nomeMunicipio } = profileRows[0];

      const needsMunicipioFilter = (cargo === "VEREADOR" || cargo === "PREFEITO") && nomeMunicipio;

      const rows = await queryTidb<{
        candidatoSequencial: string; candidatoNome: string; partidoSigla: string;
        totalVotos: number; percentualSobreValidos: number; situacao: string; eleito: number;
      }>(
        needsMunicipioFilter
          ? `SELECT cr.candidatoSequencial, cr.candidatoNome, cr.partidoSigla,
               cr.totalVotos, cr.percentualSobreValidos, cr.situacao, cr.eleito
             FROM candidate_results cr
             INNER JOIN (
               SELECT DISTINCT candidatoSequencial FROM candidate_zone_results
               WHERE nomeMunicipio=? AND ano=? AND turno=1
             ) czr ON cr.candidatoSequencial = czr.candidatoSequencial
             WHERE cr.uf=? AND cr.cargo=? AND cr.ano=? AND cr.turno=1
             ORDER BY cr.totalVotos DESC LIMIT 15`
          : `SELECT candidatoSequencial, candidatoNome, partidoSigla,
               totalVotos, percentualSobreValidos, situacao, eleito
             FROM candidate_results
             WHERE uf=? AND cargo=? AND ano=? AND turno=1
             ORDER BY totalVotos DESC LIMIT 15`,
        needsMunicipioFilter
          ? [nomeMunicipio, ano, uf, cargo, ano]
          : [uf, cargo, ano]
      );

      const result = rows.map((r, i) => ({
        rank: i + 1,
        sequencial: r.candidatoSequencial,
        name: r.candidatoNome,
        party: r.partidoSigla,
        votes: Number(r.totalVotos),
        percentage: Number(r.percentualSobreValidos),
        situation: r.situacao,
        elected: Boolean(r.eleito),
        isTarget: r.candidatoSequencial === input.sequencial,
        photoUrl: getPhotoUrl(r.candidatoSequencial, uf, Number(ano), cargo),
      }));

      setCached(cacheKey, result, 604800);
      return result;
    }),

  // ─── FILIAÇÃO PARTIDÁRIA: busca override para um político ─────────────────────
  getAffiliationOverride: publicProcedure
    .input(z.object({ sequencial: z.string() }))
    .query(async ({ input }) => {
      const { getOverrideBySequencial } = await import("../affiliationOverrides");
      const r = await getOverrideBySequencial(input.sequencial);
      if (!r) return null;
      return {
        sequencial: r.candidato_sequencial,
        candidateName: r.candidate_name,
        uf: r.uf,
        originalParty: r.original_party,
        currentParty: r.current_party,
        currentPartyName: r.current_party_name,
        changeDate: r.change_date,
        notes: r.notes,
        verified: r.verified,
        status: r.current_party === 'PSB'
          ? 'joined_psb'
          : r.original_party === 'PSB'
            ? 'left_psb'
            : 'psb_current',
      };
    }),

  // ─── FILIAÇÃO PARTIDÁRIA: lista todos os overrides ──────────────────────────
  listAffiliationOverrides: publicProcedure
    .input(z.object({
      uf: z.string().optional(),
      status: z.enum(["left_psb", "joined_psb", "all"]).default("all"),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const { listOverrides } = await import("../affiliationOverrides");
      const statusFilter = input.status === 'all' ? undefined : input.status as 'left_psb' | 'joined_psb';
      const { items } = await listOverrides({
        uf: input.uf,
        status: statusFilter,
        page: input.page,
        pageSize: input.pageSize,
      });
      return items.map(r => ({
        id: r.id,
        sequencial: r.candidato_sequencial,
        candidateName: r.candidate_name,
        uf: r.uf,
        originalParty: r.original_party,
        currentParty: r.current_party,
        currentPartyName: r.current_party_name,
        changeDate: r.change_date,
        notes: r.notes,
        verified: r.verified,
        status: r.current_party === 'PSB' ? 'joined_psb' : 'left_psb',
      }));
    }),
});
