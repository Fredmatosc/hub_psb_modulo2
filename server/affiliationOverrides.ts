/**
 * Helper para gerenciar overrides de filiação partidária no banco compartilhado.
 * Usa queryTidb (banco SHARED_ELECTORAL_DB_URL) para que tanto o Perfil PSB
 * quanto o Mapa de Votação compartilhem os mesmos dados de filiação.
 */
import { queryTidb, getTidbPool } from "./tidb";

export interface AffiliationOverride {
  id: number;
  candidato_sequencial: string;
  candidate_name: string | null;
  uf: string | null;
  original_party: string | null;
  current_party: string | null;
  current_party_name: string | null;
  change_date: string | null;
  notes: string | null;
  verified: number;
  created_at: string;
  updated_at: string;
}

/**
 * Busca todos os overrides de filiação do banco compartilhado.
 */
export async function getAllOverrides(): Promise<AffiliationOverride[]> {
  return queryTidb<AffiliationOverride>(
    `SELECT * FROM politician_affiliation_overrides ORDER BY updated_at DESC`
  );
}

/**
 * Busca o override de um político específico pelo sequencial.
 */
export async function getOverrideBySequencial(sequencial: string): Promise<AffiliationOverride | null> {
  const rows = await queryTidb<AffiliationOverride>(
    `SELECT * FROM politician_affiliation_overrides WHERE candidato_sequencial = ? LIMIT 1`,
    [sequencial]
  );
  return rows[0] ?? null;
}

/**
 * Insere ou atualiza um override de filiação.
 */
export async function upsertOverride(data: {
  sequencial: string;
  candidateName?: string;
  uf?: string;
  originalParty?: string;
  currentParty: string;
  currentPartyName?: string;
  changeDate?: string;
  notes?: string;
  verified?: boolean;
}): Promise<void> {
  const pool = getTidbPool();
  await pool.execute(
    `INSERT INTO politician_affiliation_overrides
      (candidato_sequencial, candidate_name, uf, original_party, current_party, current_party_name, change_date, notes, verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       candidate_name = COALESCE(VALUES(candidate_name), candidate_name),
       uf = COALESCE(VALUES(uf), uf),
       original_party = COALESCE(VALUES(original_party), original_party),
       current_party = VALUES(current_party),
       current_party_name = VALUES(current_party_name),
       change_date = COALESCE(VALUES(change_date), change_date),
       notes = COALESCE(VALUES(notes), notes),
       verified = VALUES(verified),
       updated_at = CURRENT_TIMESTAMP`,
    [
      data.sequencial,
      data.candidateName ?? null,
      data.uf ?? null,
      data.originalParty ?? null,
      data.currentParty,
      data.currentPartyName ?? null,
      data.changeDate ?? null,
      data.notes ?? null,
      data.verified ? 1 : 0,
    ]
  );
}

/**
 * Remove um override pelo ID.
 */
export async function deleteOverride(id: number): Promise<void> {
  const pool = getTidbPool();
  await pool.execute(`DELETE FROM politician_affiliation_overrides WHERE id = ?`, [id]);
}

/**
 * Busca overrides com filtros opcionais.
 */
export async function listOverrides(opts?: {
  uf?: string;
  status?: "left_psb" | "joined_psb";
  page?: number;
  pageSize?: number;
}): Promise<{ items: AffiliationOverride[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts?.uf) {
    conditions.push("uf = ?");
    params.push(opts.uf.toUpperCase());
  }
  if (opts?.status === "left_psb") {
    conditions.push("original_party = 'PSB' AND current_party != 'PSB'");
  } else if (opts?.status === "joined_psb") {
    conditions.push("original_party != 'PSB' AND current_party = 'PSB'");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const [countRows, items] = await Promise.all([
    queryTidb<{ total: number }>(`SELECT COUNT(*) as total FROM politician_affiliation_overrides ${where}`, params),
    queryTidb<AffiliationOverride>(
      // TiDB não aceita parâmetros em LIMIT/OFFSET, usar valores literais
      `SELECT * FROM politician_affiliation_overrides ${where} ORDER BY updated_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params
    ),
  ]);

  return { items, total: countRows[0]?.total ?? 0 };
}
