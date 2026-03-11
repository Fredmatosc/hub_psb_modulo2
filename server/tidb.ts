import mysql from "mysql2/promise";

let _tidbPool: mysql.Pool | null = null;

/**
 * Retorna um pool de conexões com o banco TiDB externo (mapa_votacao_psb).
 * Usa a variável TIDB_DATABASE_URL para conectar.
 */
export function getTidbPool(): mysql.Pool {
  if (!_tidbPool) {
    const url = process.env.TIDB_DATABASE_URL;
    if (!url) {
      throw new Error("TIDB_DATABASE_URL não configurada");
    }

    // Parse da URL mysql://user:pass@host:port/db?ssl=...
    const parsed = new URL(url);
    const sslParam = parsed.searchParams.get("ssl");
    const sslConfig = sslParam ? JSON.parse(decodeURIComponent(sslParam)) : undefined;

    _tidbPool = mysql.createPool({
      host: parsed.hostname,
      port: parseInt(parsed.port || "4000"),
      user: parsed.username,
      password: parsed.password,
      database: parsed.pathname.replace("/", ""),
      ssl: sslConfig,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 10000,
    });
  }
  return _tidbPool;
}

/**
 * Executa uma query no banco TiDB externo.
 */
export async function queryTidb<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getTidbPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

/**
 * Cache simples em memória com TTL.
 */
const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}
