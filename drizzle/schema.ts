import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Diretórios Estaduais do PSB
// Tabela real no banco usa snake_case, mapeamos aqui
export const psbStateDirectories = mysqlTable("psb_state_directories", {
  id: int("id").autoincrement().primaryKey(),
  uf: varchar("uf", { length: 2 }).notNull().unique(),
  stateName: varchar("state_name", { length: 100 }).notNull().default(""),
  presidentName: varchar("president_name", { length: 200 }),
  presidentSequencial: varchar("president_sequencial", { length: 20 }),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  cep: varchar("cep", { length: 10 }),
  phone: varchar("phone1", { length: 30 }),
  phone2: varchar("phone2", { length: 30 }),
  email: varchar("email", { length: 200 }),
  website: varchar("website", { length: 300 }),
  facebook: varchar("facebook", { length: 300 }),
  instagram: varchar("instagram", { length: 300 }),
  twitter: varchar("twitter", { length: 300 }),
  youtube: varchar("youtube", { length: 300 }),
  notes: text("notes"),
  updatedAt: timestamp("last_updated").defaultNow().onUpdateNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PsbStateDirectory = typeof psbStateDirectories.$inferSelect;
export type InsertPsbStateDirectory = typeof psbStateDirectories.$inferInsert;

// Diretórios Municipais do PSB
export const psbMunicipalDirectories = mysqlTable("psb_municipal_directories", {
  id: int("id").autoincrement().primaryKey(),
  uf: varchar("uf", { length: 2 }).notNull(),
  municipalityCode: varchar("municipalityCode", { length: 10 }).notNull(),
  municipalityName: varchar("municipalityName", { length: 255 }),
  presidentName: varchar("presidentName", { length: 255 }),
  presidentSequencial: varchar("presidentSequencial", { length: 20 }),
  address: text("address"),
  phone: varchar("phone", { length: 100 }),
  email: varchar("email", { length: 255 }),
  source: varchar("source", { length: 50 }).default("manual"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: varchar("updatedBy", { length: 64 }),
});

export type PsbMunicipalDirectory = typeof psbMunicipalDirectories.$inferSelect;
export type InsertPsbMunicipalDirectory = typeof psbMunicipalDirectories.$inferInsert;

// Overrides de Filiação Partidária
// Tabela real usa snake_case
export const politicianAffiliationOverrides = mysqlTable("politician_affiliation_overrides", {
  id: int("id").autoincrement().primaryKey(),
  sequencial: varchar("candidato_sequencial", { length: 20 }).notNull(),
  candidateName: varchar("candidate_name", { length: 300 }),
  uf: varchar("uf", { length: 2 }),
  originalParty: varchar("original_party", { length: 10 }),
  currentParty: varchar("current_party", { length: 10 }),
  currentPartyName: varchar("current_party_name", { length: 200 }),
  changeDate: varchar("change_date", { length: 10 }),
  notes: text("notes"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type PoliticianAffiliationOverride = typeof politicianAffiliationOverrides.$inferSelect;
export type InsertPoliticianAffiliationOverride = typeof politicianAffiliationOverrides.$inferInsert;

// Log de Sincronizações
export const dataSyncLog = mysqlTable("data_sync_log", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 100 }).notNull(),
  action: varchar("sync_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  recordsAffected: int("records_updated").default(0),
  message: text("message"),
  createdAt: timestamp("synced_at").defaultNow().notNull(),
  createdBy: varchar("source", { length: 100 }),
});

export type DataSyncLog = typeof dataSyncLog.$inferSelect;
