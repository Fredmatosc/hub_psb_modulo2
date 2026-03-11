import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  psbStateDirectories,
  psbMunicipalDirectories,
  politicianAffiliationOverrides,
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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

  // Listar todos os overrides de filiação
  listAffiliationOverrides: publicProcedure
    .input(z.object({
      uf: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const query = db.select().from(politicianAffiliationOverrides);
      const rows = await (input.uf
        ? query.where(eq(politicianAffiliationOverrides.uf, input.uf.toUpperCase()))
        : query
      )
        .orderBy(desc(politicianAffiliationOverrides.updatedAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        items: rows.map(r => ({
          id: r.id,
          sequencial: r.sequencial,
          candidateName: r.candidateName,
          uf: r.uf,
          originalParty: r.originalParty,
          currentParty: r.currentParty,
          currentPartyName: r.currentPartyName,
          changeDate: r.changeDate,
          notes: r.notes,
          verified: r.verified,
          status: r.currentParty === 'PSB' ? 'joined_psb' : 'left_psb',
        })),
        total: rows.length,
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
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verifica se já existe
      const existing = await db.select({ id: politicianAffiliationOverrides.id })
        .from(politicianAffiliationOverrides)
        .where(eq(politicianAffiliationOverrides.sequencial, input.sequencial))
        .limit(1);

      if (existing.length > 0) {
        await db.update(politicianAffiliationOverrides)
          .set({
            candidateName: input.candidateName,
            uf: input.uf.toUpperCase(),
            originalParty: input.originalParty,
            currentParty: input.currentParty,
            currentPartyName: input.currentPartyName,
            changeDate: input.changeDate,
            notes: input.notes,
            verified: input.verified,
            updatedAt: new Date(),
          })
          .where(eq(politicianAffiliationOverrides.sequencial, input.sequencial));
      } else {
        await db.insert(politicianAffiliationOverrides).values({
          sequencial: input.sequencial,
          candidateName: input.candidateName,
          uf: input.uf.toUpperCase(),
          originalParty: input.originalParty,
          currentParty: input.currentParty,
          currentPartyName: input.currentPartyName,
          changeDate: input.changeDate,
          notes: input.notes,
          verified: input.verified,
        });
      }

      return { success: true };
    }),

  // Remover override de filiação
  deleteAffiliationOverride: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(politicianAffiliationOverrides)
        .where(eq(politicianAffiliationOverrides.id, input.id));

      return { success: true };
    }),

});
