/**
 * TSE Affiliation Sync
 * 
 * Baixa o arquivo de perfil de filiação partidária do TSE,
 * cruza com os eleitos PSB no banco externo, e atualiza a tabela
 * politician_affiliation_overrides com quem saiu ou entrou no PSB.
 * 
 * Arquivo fonte: https://cdn.tse.jus.br/estatistica/sead/odsele/filiacao_partidaria/perfil_filiacao_partidaria.zip
 * Formato: CSV com separador ';', encoding latin1
 * Colunas relevantes: NM_PARTIDO, NR_CPF_FILIADO, NM_FILIADO, SG_UF, DS_SITUACAO_FILIADO
 * DS_SITUACAO_FILIADO: REGULAR, CANCELADO, DESFILIADO, TRANSFERIDO, etc.
 */

import { createWriteStream } from "fs";
import { mkdir, unlink, readFile } from "fs/promises";
import { createUnzip } from "zlib";
import { pipeline } from "stream/promises";
import { createReadStream } from "fs";
import * as path from "path";
import * as os from "os";
import { getDb } from "./db";
import { politicianAffiliationOverrides } from "../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

const TSE_FILIACAO_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/filiacao_partidaria/perfil_filiacao_partidaria.zip";

export interface SyncResult {
  totalProcessed: number;
  newLeftPsb: number;
  newJoinedPsb: number;
  updated: number;
  errors: string[];
  duration: number;
}

/**
 * Busca todos os eleitos PSB no banco externo com seus CPFs
 */
async function getElectedWithCpf(): Promise<Array<{
  sequencial: string;
  nome: string;
  cpf: string;
  uf: string;
  cargo: string;
  ano: number;
  partidoSigla: string;
}>> {
  const { queryTidb } = await import("./tidb");
  
  // Busca eleitos PSB com CPF disponível
  const rows = await queryTidb<{
    candidatoSequencial: string;
    candidatoNome: string;
    cpf: string;
    uf: string;
    cargo: string;
    ano: number;
    partidoSigla: string;
  }>(`
    SELECT candidatoSequencial, candidatoNome, cpf, uf, cargo, ano, partidoSigla
    FROM candidate_results
    WHERE eleito=1 AND cpf IS NOT NULL AND cpf != '' AND cpf != '000.000.000-00'
      AND (
        (partidoSigla='PSB' AND ano IN (2022, 2024))
        OR (eleito=1 AND ano IN (2018, 2022, 2024))
      )
    GROUP BY candidatoSequencial, candidatoNome, cpf, uf, cargo, ano, partidoSigla
    ORDER BY ano DESC
  `);
  
  return rows.map(r => ({
    sequencial: r.candidatoSequencial,
    nome: r.candidatoNome,
    cpf: r.cpf?.replace(/\D/g, ''), // Normaliza CPF (remove pontos e traços)
    uf: r.uf,
    cargo: r.cargo,
    ano: Number(r.ano),
    partidoSigla: r.partidoSigla,
  }));
}

/**
 * Processa o arquivo CSV de filiação do TSE linha a linha
 * Retorna um Map de CPF -> { partido, situacao }
 */
async function parseTseCsv(csvPath: string): Promise<Map<string, { partido: string; situacao: string; nome: string }>> {
  const content = await readFile(csvPath, { encoding: 'latin1' });
  const lines = content.split('\n');
  
  // Detectar cabeçalho
  const header = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
  const cpfIdx = header.findIndex(h => h.includes('CPF') || h.includes('NR_CPF'));
  const partidoIdx = header.findIndex(h => h.includes('NM_PARTIDO') || h.includes('PARTIDO'));
  const situacaoIdx = header.findIndex(h => h.includes('DS_SITUACAO') || h.includes('SITUACAO'));
  const nomeIdx = header.findIndex(h => h.includes('NM_FILIADO') || h.includes('FILIADO'));
  
  if (cpfIdx === -1 || partidoIdx === -1) {
    throw new Error(`Colunas não encontradas. Header: ${header.join(', ')}`);
  }
  
  const filiados = new Map<string, { partido: string; situacao: string; nome: string }>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const cols = line.split(';').map(c => c.trim().replace(/"/g, ''));
    const cpf = cols[cpfIdx]?.replace(/\D/g, '');
    const partido = cols[partidoIdx]?.trim();
    const situacao = cols[situacaoIdx]?.trim() ?? 'REGULAR';
    const nome = cols[nomeIdx]?.trim() ?? '';
    
    if (!cpf || cpf.length < 11 || !partido) continue;
    
    // Manter apenas filiação REGULAR (ativa)
    if (situacao === 'REGULAR' || situacao === 'ATIVO') {
      filiados.set(cpf, { partido, situacao, nome });
    }
  }
  
  return filiados;
}

/**
 * Executa a sincronização completa
 */
export async function syncAffiliations(options?: {
  localZipPath?: string; // Se fornecido, usa arquivo local em vez de baixar
  dryRun?: boolean;      // Se true, não salva no banco
}): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let newLeftPsb = 0;
  let newJoinedPsb = 0;
  let updated = 0;
  
  const tmpDir = path.join(os.tmpdir(), 'tse_filiacao_sync');
  await mkdir(tmpDir, { recursive: true });
  
  let zipPath = options?.localZipPath;
  
  try {
    // 1. Baixar o arquivo se não fornecido
    if (!zipPath) {
      zipPath = path.join(tmpDir, 'perfil_filiacao.zip');
      console.log('[TSE Sync] Baixando arquivo de filiação...');
      
      const response = await fetch(TSE_FILIACAO_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status} ao baixar arquivo TSE`);
      
      const fileStream = createWriteStream(zipPath);
      const reader = response.body!.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fileStream.write(value);
      }
      fileStream.end();
      await new Promise<void>(resolve => fileStream.on('finish', resolve));
    }
    
    // 2. Extrair o CSV do ZIP
    console.log('[TSE Sync] Extraindo CSV...');
    const csvPath = path.join(tmpDir, 'perfil_filiacao.csv');
    
    // Usar unzip do sistema para extrair
    const { execSync } = await import('child_process');
    execSync(`unzip -o "${zipPath}" -d "${tmpDir}" 2>/dev/null || true`);
    
    // Encontrar o CSV extraído
    const { readdirSync } = await import('fs');
    const files = readdirSync(tmpDir).filter(f => f.endsWith('.csv') || f.endsWith('.txt'));
    if (!files.length) throw new Error('Nenhum CSV encontrado no ZIP');
    
    const extractedCsv = path.join(tmpDir, files[0]);
    console.log(`[TSE Sync] CSV encontrado: ${files[0]}`);
    
    // 3. Buscar eleitos no banco externo
    console.log('[TSE Sync] Buscando eleitos no banco...');
    const elected = await getElectedWithCpf();
    console.log(`[TSE Sync] ${elected.length} eleitos encontrados com CPF`);
    
    // 4. Parsear o CSV do TSE
    console.log('[TSE Sync] Processando CSV do TSE...');
    const filiados = await parseTseCsv(extractedCsv);
    console.log(`[TSE Sync] ${filiados.size} filiados ativos no TSE`);
    
    // 5. Cruzar dados e identificar mudanças
    const db = await getDb();
    if (!db) throw new Error('Banco local não disponível');
    
    // Buscar overrides existentes
    const existingOverrides = await db.select().from(politicianAffiliationOverrides);
    const existingBySeq = new Map(existingOverrides.map(o => [o.sequencial, o]));
    
    const changes: Array<{
      sequencial: string;
      candidateName: string;
      uf: string;
      originalParty: string;
      currentParty: string;
      currentPartyName: string;
      notes: string;
      type: 'left_psb' | 'joined_psb';
    }> = [];
    
    for (const politician of elected) {
      if (!politician.cpf || politician.cpf.length < 11) continue;
      
      const tseData = filiados.get(politician.cpf);
      if (!tseData) continue; // CPF não encontrado no TSE (pode ter saído de todos os partidos)
      
      const electedByPsb = politician.partidoSigla === 'PSB';
      const currentlyPsb = tseData.partido.includes('PSB') || tseData.partido === 'PARTIDO SOCIALISTA BRASILEIRO';
      
      if (electedByPsb && !currentlyPsb) {
        // Saiu do PSB
        const existing = existingBySeq.get(politician.sequencial);
        if (!existing) {
          changes.push({
            sequencial: politician.sequencial,
            candidateName: politician.nome,
            uf: politician.uf,
            originalParty: 'PSB',
            currentParty: tseData.partido.substring(0, 10),
            currentPartyName: tseData.partido,
            notes: `Detectado automaticamente via TSE. Eleito pelo PSB em ${politician.ano} como ${politician.cargo}. Filiação atual: ${tseData.partido}`,
            type: 'left_psb',
          });
          newLeftPsb++;
        } else if (existing.currentParty !== tseData.partido.substring(0, 10)) {
          updated++;
        }
      } else if (!electedByPsb && currentlyPsb && politician.ano >= 2018) {
        // Entrou no PSB (eleito por outro partido, hoje no PSB)
        const existing = existingBySeq.get(politician.sequencial);
        if (!existing) {
          changes.push({
            sequencial: politician.sequencial,
            candidateName: politician.nome,
            uf: politician.uf,
            originalParty: politician.partidoSigla,
            currentParty: 'PSB',
            currentPartyName: 'Partido Socialista Brasileiro',
            notes: `Detectado automaticamente via TSE. Eleito pelo ${politician.partidoSigla} em ${politician.ano} como ${politician.cargo}. Filiação atual: PSB`,
            type: 'joined_psb',
          });
          newJoinedPsb++;
        }
      }
    }
    
    console.log(`[TSE Sync] ${changes.length} mudanças detectadas (${newLeftPsb} saíram, ${newJoinedPsb} entraram)`);
    
    // 6. Salvar no banco
    if (!options?.dryRun && changes.length > 0) {
      for (const change of changes) {
        await db.insert(politicianAffiliationOverrides).values({
          sequencial: change.sequencial,
          candidateName: change.candidateName,
          uf: change.uf,
          originalParty: change.originalParty,
          currentParty: change.currentParty,
          currentPartyName: change.currentPartyName,
          changeDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          notes: change.notes,
          verified: false, // Automático, não verificado manualmente
        });
      }
      console.log(`[TSE Sync] ${changes.length} registros salvos no banco`);
    }
    
    return {
      totalProcessed: elected.length,
      newLeftPsb,
      newJoinedPsb,
      updated,
      errors,
      duration: Date.now() - startTime,
    };
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    console.error('[TSE Sync] Erro:', msg);
    return {
      totalProcessed: 0,
      newLeftPsb: 0,
      newJoinedPsb: 0,
      updated: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }
}
