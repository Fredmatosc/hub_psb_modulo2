/**
 * Integração com a API pública DivulgaCandContas do TSE
 * https://divulgacandcontas.tse.jus.br/divulga/rest/v1
 *
 * Mapeamento de eleições ordinárias (ID → ano/nome):
 *   2045202024 → Eleições Municipais 2024
 *   2040602022 → Eleição Geral Federal 2022
 *   2030402020 → Eleições Municipais 2020
 *   2022802018 → Eleição Geral Federal 2018
 *   2       → Eleições Municipais 2016
 *   680     → Eleições Gerais 2014
 *   1699    → Eleição Municipal 2012
 *   14417   → Eleições 2010
 *   14422   → Eleições 2008
 *   14423   → Eleições 2006
 *   14431   → Eleições 2004
 */

const BASE_URL = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";

// Mapeamento ano → código de eleição ordinária
const ELECTION_CODE: Record<number, number> = {
  2024: 2045202024,
  2022: 2040602022,
  2020: 2030402020,
  2018: 2022802018,
  2016: 2,
  2014: 680,
  2012: 1699,
  2010: 14417,
  2008: 14422,
  2006: 14423,
  2004: 14431,
};

// Para eleições gerais (federais), o código UE é a sigla do estado (ex: "PB")
// Para eleições municipais, o código UE é o código do município (ex: "71072")
// Eleições gerais: anos 2022, 2018, 2014, 2010, 2006
const FEDERAL_YEARS = new Set([2022, 2018, 2014, 2010, 2006]);

export interface DivulgaCandCandidate {
  id: number;
  nomeUrna: string;
  nomeCompleto: string;
  numero: number;
  descricaoSexo: string | null;
  dataDeNascimento: string | null;
  descricaoEstadoCivil: string | null;
  descricaoCorRaca: string | null;
  descricaoSituacao: string | null;
  nacionalidade: string | null;
  gastoCampanha1T: number | null;
  gastoCampanha2T: number | null;
  fotoUrl: string | null;
  fotoUrlPublicavel: boolean;
  descricaoTotalizacao: string | null;
  nomeColigacao: string | null;
  totalDeBens: number | null;
  eleicoesAnteriores: Array<{
    nrAno: number;
    id: string;
    nomeUrna: string;
    nomeCandidato: string;
    idEleicao: string;
    sgUe: string;
    local: string;
    cargo: string;
    partido: string;
    situacaoTotalizacao: string;
    txLink: string;
  }>;
  infoComplementar: {
    generoPublicavel: boolean;
    orientacaoSexualPublicavel: boolean;
    identidadeGenero: string | null;
    orientacaoSexual: string | null;
  } | null;
  partido: { numero: number; sigla: string; nome: string } | null;
  cargo: { codigo: number; nome: string } | null;
  eleicao: { id: number; nomeEleicao: string; dataEleicao: string } | null;
  codigoSituacaoCandidato: number;
  descricaoSituacaoCandidato: string | null;
  isCandidatoInapto: boolean;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PerfilPSB/1.0)",
      Accept: "application/json",
      Referer: "https://divulgacandcontas.tse.jus.br/",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`DivulgaCandContas API error: ${res.status} ${url}`);
  }
  const text = await res.text();
  if (!text || text.trim() === "") return null;
  return JSON.parse(text);
}

/**
 * Busca os candidatos de um cargo/UE/eleição e retorna o que corresponde ao sequencial.
 * Para eleições gerais, ueCode = sigla UF (ex: "PB").
 * Para eleições municipais, ueCode = código do município TSE (ex: "71072").
 */
async function findCandidateBySequencial(
  ano: number,
  ueCode: string,
  cargoCode: number,
  sequencial: string
): Promise<DivulgaCandCandidate | null> {
  const electionId = ELECTION_CODE[ano];
  if (!electionId) return null;

  // Primeiro, listar candidatos do cargo/UE/eleição
  const listUrl = `${BASE_URL}/candidatura/listar/${ano}/${ueCode}/${electionId}/${cargoCode}/candidatos`;
  let listData: any;
  try {
    listData = await fetchJson(listUrl);
  } catch {
    return null;
  }

  const candidatos: any[] = listData?.candidatos ?? [];
  // O ID do candidato na API é igual ao sequencial do TSE
  const found = candidatos.find((c: any) => String(c.id) === String(sequencial));
  if (!found) return null;

  // Buscar dados completos
  const detailUrl = `${BASE_URL}/candidatura/buscar/${ano}/${ueCode}/${electionId}/candidato/${found.id}`;
  try {
    return await fetchJson(detailUrl);
  } catch {
    return null;
  }
}

// Mapeamento de código de cargo TSE → código numérico da API
const CARGO_CODE: Record<string, number> = {
  PRESIDENTE: 1,
  "VICE-PRESIDENTE": 2,
  GOVERNADOR: 3,
  "VICE-GOVERNADOR": 4,
  SENADOR: 5,
  "DEPUTADO FEDERAL": 6,
  "DEPUTADO ESTADUAL": 7,
  "DEPUTADO DISTRITAL": 8,
  PREFEITO: 11,
  "VICE-PREFEITO": 12,
  VEREADOR: 13,
};

/**
 * Busca o perfil completo de um candidato na API DivulgaCandContas.
 * Retorna foto real, histórico completo (eleicoesAnteriores) e dados financeiros.
 *
 * @param sequencial - Sequencial do candidato (ex: "50001606032")
 * @param ano - Ano da eleição mais recente (ex: 2022)
 * @param cargo - Cargo (ex: "DEPUTADO FEDERAL")
 * @param uf - UF do candidato (ex: "BA")
 * @param codigoMunicipio - Código do município TSE (para eleições municipais)
 */
export async function getCandidateProfile(params: {
  sequencial: string;
  ano: number;
  cargo: string;
  uf: string;
  codigoMunicipio?: string | null;
}): Promise<DivulgaCandCandidate | null> {
  const { sequencial, ano, cargo, uf, codigoMunicipio } = params;

  const cargoNorm = cargo.toUpperCase().trim();
  const cargoCode = CARGO_CODE[cargoNorm];
  if (!cargoCode) return null;

  const isFederal = FEDERAL_YEARS.has(ano);
  // Para eleições gerais: UE = sigla UF. Para municipais: UE = código do município.
  const ueCode = isFederal ? uf.toUpperCase() : (codigoMunicipio ?? uf.toUpperCase());

  return findCandidateBySequencial(ano, ueCode, cargoCode, sequencial);
}
