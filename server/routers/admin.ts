import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  psbStateDirectories,
  psbMunicipalDirectories,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  listOverrides,
  upsertOverride,
  deleteOverride,
  getAllOverrides,
} from "../affiliationOverrides";

export const adminRouter = router({

  // ─── DIRETÓRIOS ESTADUAIS ──────────────────────────────────────────────────────

  // Listar todos os diretórios estaduais
  listStateDirectories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(psbStateDirectories).orderBy(psbStateDirectories.uf);
  }),

  // Atualizar um diretório estadual
  updateStateDirectory: adminProcedure
    .input(z.object({
      uf: z.string().length(2),
      presidentName: z.string().optional(),
      presidentSequencial: z.string().optional().nullable(),
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const uf = input.uf.toUpperCase();
      const updateData: Record<string, string | null | undefined> = {};
      if (input.presidentName !== undefined) updateData.presidentName = input.presidentName;
      if (input.presidentSequencial !== undefined) updateData.presidentSequencial = input.presidentSequencial;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.website !== undefined) updateData.website = input.website;
      if (input.facebook !== undefined) updateData.facebook = input.facebook;
      if (input.instagram !== undefined) updateData.instagram = input.instagram;
      if (input.notes !== undefined) updateData.notes = input.notes;

      await db.update(psbStateDirectories)
        .set(updateData)
        .where(eq(psbStateDirectories.uf, uf));

      return { success: true, uf };
    }),

  // ─── DIRETÓRIOS MUNICIPAIS ─────────────────────────────────────────────────────

  // Listar diretórios municipais por UF
  listMunicipalDirectories: publicProcedure
    .input(z.object({ uf: z.string().length(2).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const query = db.select().from(psbMunicipalDirectories);
      if (input.uf) {
        return query.where(eq(psbMunicipalDirectories.uf, input.uf.toUpperCase()));
      }
      return query.orderBy(psbMunicipalDirectories.uf, psbMunicipalDirectories.municipalityName);
    }),

  // Adicionar/atualizar diretório municipal
  upsertMunicipalDirectory: adminProcedure
    .input(z.object({
      uf: z.string().length(2),
      municipalityCode: z.string(),
      municipalityName: z.string(),
      presidentName: z.string().optional(),
      presidentSequencial: z.string().optional().nullable(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const uf = input.uf.toUpperCase();

      // Verifica se já existe
      const existing = await db.select({ id: psbMunicipalDirectories.id })
        .from(psbMunicipalDirectories)
        .where(eq(psbMunicipalDirectories.municipalityCode, input.municipalityCode))
        .limit(1);

      if (existing.length > 0) {
        await db.update(psbMunicipalDirectories)
          .set({
            presidentName: input.presidentName,
            presidentSequencial: input.presidentSequencial,
            address: input.address,
            phone: input.phone,
            email: input.email,
            updatedBy: ctx.user.openId,
          })
          .where(eq(psbMunicipalDirectories.municipalityCode, input.municipalityCode));
      } else {
        await db.insert(psbMunicipalDirectories).values({
          uf,
          municipalityCode: input.municipalityCode,
          municipalityName: input.municipalityName,
          presidentName: input.presidentName,
          presidentSequencial: input.presidentSequencial,
          address: input.address,
          phone: input.phone,
          email: input.email,
          source: "manual",
          updatedBy: ctx.user.openId,
        });
      }

      return { success: true };
    }),

  // ─── FILIAÇÃO PARTIDÁRIA ───────────────────────────────────────────────────────
  // Todos os endpoints de filiação usam o banco compartilhado (SHARED_ELECTORAL_DB_URL)
  // para que Hub PSB e Mapa de Votação compartilhem os mesmos dados de filiação.

  // Listar todos os overrides de filiação
  listAffiliationOverrides: publicProcedure
    .input(z.object({
      uf: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const { items, total } = await listOverrides({
        uf: input.uf,
        page: input.page,
        pageSize: input.pageSize,
      });
      return {
        items: items.map(r => ({
          id: r.id,
          sequencial: r.candidato_sequencial,
          candidateName: r.candidate_name ?? r.candidato_sequencial,
          uf: r.uf ?? '',
          originalParty: r.original_party,
          currentParty: r.current_party,
          currentPartyName: r.current_party_name ?? r.current_party,
          changeDate: r.change_date,
          notes: r.notes,
          verified: Boolean(r.verified),
          status: r.current_party === 'PSB' ? 'joined_psb' : 'left_psb',
        })),
        total,
      };
    }),

  // Adicionar/atualizar override de filiação
  upsertAffiliationOverride: adminProcedure
    .input(z.object({
      sequencial: z.string(),
      candidateName: z.string(),
      uf: z.string().length(2),
      originalParty: z.string(),
      currentParty: z.string(),
      currentPartyName: z.string().optional(),
      changeDate: z.string().optional(),
      notes: z.string().optional(),
      verified: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      await upsertOverride({
        sequencial: input.sequencial,
        candidateName: input.candidateName,
        uf: input.uf,
        originalParty: input.originalParty,
        currentParty: input.currentParty,
        currentPartyName: input.currentPartyName,
        changeDate: input.changeDate,
        notes: input.notes,
        verified: input.verified,
      });
      return { success: true };
    }),

  // Remover override de filiação
  deleteAffiliationOverride: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteOverride(input.id);
      return { success: true };
    }),

  // Sincronizar filiação via TSE (arquivo local já baixado)
  syncAffiliationsFromTse: adminProcedure
    .input(z.object({
      localZipPath: z.string().optional(),
      dryRun: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const { syncAffiliations } = await import("../tse-sync");
      const result = await syncAffiliations({
        localZipPath: input.localZipPath,
        dryRun: input.dryRun,
      });
      return result;
    }),

  // Buscar políticos no banco externo por nome/UF/cargo
  searchPoliticians: adminProcedure
    .input(z.object({
      name: z.string().min(2),
      uf: z.string().length(2).optional(),
      cargo: z.string().optional(),
      partido: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const { queryTidb } = await import("../tidb");
      const conditions: string[] = ['candidatoNome LIKE ?'];
      const params: (string | number)[] = [`%${input.name.toUpperCase()}%`];

      if (input.uf) { conditions.push('uf = ?'); params.push(input.uf.toUpperCase()); }
      if (input.cargo) { conditions.push('cargo = ?'); params.push(input.cargo.toUpperCase()); }
      if (input.partido) { conditions.push('partidoSigla = ?'); params.push(input.partido.toUpperCase()); }

      // Busca apenas eleitos para simplificar
      conditions.push('eleito = 1');

      const rows = await queryTidb<{
        candidatoSequencial: string;
        candidatoNome: string;
        candidatoNomeUrna: string;
        uf: string;
        cargo: string;
        ano: number;
        partidoSigla: string;
        cpf: string | null;
      }>(
        `SELECT candidatoSequencial, candidatoNome, candidatoNomeUrna, uf, cargo, ano, partidoSigla, cpf
         FROM candidate_results
         WHERE ${conditions.join(' AND ')}
         ORDER BY ano DESC, candidatoNome ASC
         LIMIT ?`,
        [...params, input.limit]
      );

      return rows;
    }),

  // ─── DETECÇÃO AUTOMÁTICA DE TROCAS DE PARTIDO ─────────────────────────────

  // Detecta automaticamente políticos que trocaram de partido via cruzamento de CPF
  // Retorna candidatos para revisão manual antes de confirmar
  detectPartyChanges: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(true), // true = apenas mostra, false = salva no banco
    }))
    .mutation(async ({ input }) => {
      const { queryTidb } = await import('../tidb');

      // Busca overrides já existentes para evitar duplicatas
      const existingOverrides = await getAllOverrides();
      const existingSeqs = new Set(existingOverrides.map(o => o.candidato_sequencial));

      // 1. Detecta saídas do PSB: eleitos pelo PSB que depois foram eleitos por outro partido
      const saiuPsb = await queryTidb<{
        cpf: string; candidatoNome: string; uf: string;
        cargoOriginal: string; anoEleicaoPsb: number; seqPsb: string;
        anoEleicaoNovo: number; novoPartido: string; novoCargoEleito: string; seqNovo: string;
      }>(`
        SELECT 
          cr_psb.cpf,
          cr_psb.candidatoNome,
          cr_psb.uf,
          cr_psb.cargo as cargoOriginal,
          cr_psb.ano as anoEleicaoPsb,
          cr_psb.candidatoSequencial as seqPsb,
          cr_outro.ano as anoEleicaoNovo,
          cr_outro.partidoSigla as novoPartido,
          cr_outro.cargo as novoCargoEleito,
          cr_outro.candidatoSequencial as seqNovo
        FROM candidate_results cr_psb
        JOIN candidate_results cr_outro 
          ON cr_psb.cpf = cr_outro.cpf 
          AND cr_psb.cpf IS NOT NULL 
          AND cr_psb.cpf != ''
        WHERE cr_psb.partidoSigla = 'PSB' 
          AND cr_psb.eleito = 1
          AND cr_outro.partidoSigla != 'PSB'
          AND cr_outro.eleito = 1
          AND cr_outro.ano > cr_psb.ano
          AND NOT EXISTS (
            SELECT 1 FROM candidate_results cr_volta
            WHERE cr_volta.cpf = cr_psb.cpf
              AND cr_volta.partidoSigla = 'PSB'
              AND cr_volta.eleito = 1
              AND cr_volta.ano > cr_outro.ano
          )
        ORDER BY cr_psb.candidatoNome
      `);

      // 2. Detecta entradas no PSB: eleitos por outro partido que depois foram eleitos pelo PSB
      const entrouPsb = await queryTidb<{
        cpf: string; candidatoNome: string; uf: string;
        cargoOriginal: string; anoEleicaoOriginal: number; partidoOriginal: string; seqOriginal: string;
        anoEleicaoPsb: number; cargoPsb: string; seqPsb: string;
      }>(`
        SELECT 
          cr_outro.cpf,
          cr_outro.candidatoNome,
          cr_outro.uf,
          cr_outro.cargo as cargoOriginal,
          cr_outro.ano as anoEleicaoOriginal,
          cr_outro.partidoSigla as partidoOriginal,
          cr_outro.candidatoSequencial as seqOriginal,
          cr_psb.ano as anoEleicaoPsb,
          cr_psb.cargo as cargoPsb,
          cr_psb.candidatoSequencial as seqPsb
        FROM candidate_results cr_outro
        JOIN candidate_results cr_psb 
          ON cr_outro.cpf = cr_psb.cpf 
          AND cr_outro.cpf IS NOT NULL 
          AND cr_outro.cpf != ''
        WHERE cr_outro.partidoSigla != 'PSB' 
          AND cr_outro.eleito = 1
          AND cr_psb.partidoSigla = 'PSB'
          AND cr_psb.eleito = 1
          AND cr_psb.ano > cr_outro.ano
        ORDER BY cr_outro.candidatoNome
      `);

      // Filtra casos já registrados
      const newSaidas = saiuPsb.filter(r => !existingSeqs.has(r.seqPsb));
      const newEntradas = entrouPsb.filter(r => !existingSeqs.has(r.seqPsb));

      if (!input.dryRun) {
        // Salva saídas do PSB no banco compartilhado
        for (const r of newSaidas) {
          await upsertOverride({
            sequencial: r.seqPsb,
            candidateName: r.candidatoNome,
            uf: r.uf,
            originalParty: 'PSB',
            currentParty: r.novoPartido,
            currentPartyName: r.novoPartido,
            changeDate: String(r.anoEleicaoNovo),
            notes: `Detectado automaticamente: eleito pelo PSB em ${r.anoEleicaoPsb} (${r.cargoOriginal}), depois eleito por ${r.novoPartido} em ${r.anoEleicaoNovo} (${r.novoCargoEleito})`,
            verified: false,
          });
        }
        // Salva entradas no PSB no banco compartilhado
        for (const r of newEntradas) {
          await upsertOverride({
            sequencial: r.seqPsb,
            candidateName: r.candidatoNome,
            uf: r.uf,
            originalParty: r.partidoOriginal,
            currentParty: 'PSB',
            currentPartyName: 'PSB',
            changeDate: String(r.anoEleicaoPsb),
            notes: `Detectado automaticamente: eleito por ${r.partidoOriginal} em ${r.anoEleicaoOriginal} (${r.cargoOriginal}), depois eleito pelo PSB em ${r.anoEleicaoPsb} (${r.cargoPsb})`,
            verified: false,
          });
        }
      }

      return {
        saidasDetectadas: newSaidas.length,
        entradasDetectadas: newEntradas.length,
        totalNovos: newSaidas.length + newEntradas.length,
        dryRun: input.dryRun,
        saidas: newSaidas.map(r => ({
          nome: r.candidatoNome, uf: r.uf,
          cargoOriginal: r.cargoOriginal, anoOriginal: r.anoEleicaoPsb,
          novoPartido: r.novoPartido, novoAno: r.anoEleicaoNovo, novoCargo: r.novoCargoEleito,
          seqPsb: r.seqPsb,
        })),
        entradas: newEntradas.map(r => ({
          nome: r.candidatoNome, uf: r.uf,
          partidoOriginal: r.partidoOriginal, anoOriginal: r.anoEleicaoOriginal, cargoOriginal: r.cargoOriginal,
          anoPsb: r.anoEleicaoPsb, cargoPsb: r.cargoPsb,
          seqPsb: r.seqPsb,
        })),
      };
    }),

  // Obter status da sincronização (contagens de overrides)
  getAffiliationStats: publicProcedure.query(async () => {
    const all = await getAllOverrides();
    return {
      total: all.length,
      leftPsb: all.filter(o => o.original_party === 'PSB' && o.current_party !== 'PSB').length,
      joinedPsb: all.filter(o => o.original_party !== 'PSB' && o.current_party === 'PSB').length,
      verified: all.filter(o => o.verified).length,
      unverified: all.filter(o => !o.verified).length,
    };
  }),

});
