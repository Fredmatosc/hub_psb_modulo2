import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import PSBLayout from "@/components/PSBLayout";
import {
  User, MapPin, Award, TrendingUp, DollarSign, BarChart2,
  CheckCircle, XCircle, Loader2, Calendar, Users, Target
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend, Cell, PieChart, Pie
} from "recharts";

type ProfileData = {
  sequencial: string; name: string; nameUrna: string; party: string;
  uf: string; stateName: string; cargo: string; municipality: string;
  votes: number; percentage: number; situation: string; elected: boolean;
  receipt: number; expense: number; costPerVote: number; cpf: string;
};

type HistoryItem = {
  year: number; cargo: string; uf: string; municipality: string; party: string;
  votes: number; percentage: number; situation: string; elected: boolean;
  receipt: number; expense: number; costPerVote: number;
};

type ZoneItem = { municipalityCode: string; municipality: string; zone: string; votes: number };

type CompetitorItem = {
  rank: number; sequencial: string; name: string; party: string;
  votes: number; percentage: number; situation: string; elected: boolean; isTarget: boolean;
};

function StatCard({ label, value, sub, icon: Icon, highlight }: {
  label: string; value: string; sub?: string; icon: React.ElementType; highlight?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-xl p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={highlight ? "text-primary" : "text-muted-foreground"} />
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

const PARTY_COLORS: Record<string, string> = {
  PSB: "oklch(0.55 0.22 27)",
  PT: "oklch(0.50 0.20 27)",
  PL: "oklch(0.50 0.18 260)",
  MDB: "oklch(0.50 0.18 200)",
  PP: "oklch(0.50 0.18 130)",
  PSD: "oklch(0.50 0.18 300)",
  PSDB: "oklch(0.50 0.18 220)",
  PDT: "oklch(0.50 0.18 60)",
  UNIÃO: "oklch(0.50 0.18 45)",
};

function getPartyColor(party: string): string {
  return PARTY_COLORS[party] ?? "oklch(0.45 0.05 260)";
}

export default function PoliticoPage() {
  const params = useParams<{ sequencial: string }>();
  const sequencial = params.sequencial ?? "";

  const { data: profileRaw, isLoading: loadingProfile } = trpc.psb.getPoliticianProfile.useQuery({ sequencial });
  const { data: historyRaw, isLoading: loadingHistory } = trpc.psb.getPoliticianHistory.useQuery({ sequencial });
  const { data: zonesRaw, isLoading: loadingZones } = trpc.psb.getPoliticianZones.useQuery({ sequencial, limit: 15 });
  const { data: competitorsRaw } = trpc.psb.getPoliticianCompetitors.useQuery({ sequencial });

  const profile = profileRaw as ProfileData | undefined;
  const history = (historyRaw as HistoryItem[] | undefined) ?? [];
  const zones = (zonesRaw as ZoneItem[] | undefined) ?? [];
  const competitors = (competitorsRaw as CompetitorItem[] | undefined) ?? [];

  const stateName = profile?.stateName ?? profile?.uf ?? "";
  const uf = profile?.uf ?? "";

  const breadcrumbs = [
    ...(uf ? [{ label: stateName, href: `/estado/${uf}` }] : []),
    { label: profile?.nameUrna ?? profile?.name ?? "Político" },
  ];

  // Dados para gráfico de votos histórico
  const votesChartData = history.map(h => ({
    year: h.year,
    Votos: h.votes,
    Eleito: h.elected,
    cargo: h.cargo,
  }));

  // Dados para gráfico financeiro
  const financeChartData = history.filter(h => h.receipt > 0 || h.expense > 0).map(h => ({
    year: h.year,
    Receita: h.receipt,
    Despesa: h.expense,
    "Custo/Voto": h.costPerVote,
  }));

  // Dados para pizza de zonas
  const topZones = zones.slice(0, 8);
  const totalZoneVotes = topZones.reduce((s, z) => s + z.votes, 0);
  const pieData = topZones.map(z => ({
    name: `${z.municipality} - Z${z.zone}`,
    value: z.votes,
    pct: totalZoneVotes > 0 ? ((z.votes / totalZoneVotes) * 100).toFixed(1) : "0",
  }));

  const PIE_COLORS = [
    "oklch(0.60 0.22 27)", "oklch(0.65 0.18 45)", "oklch(0.55 0.18 200)",
    "oklch(0.65 0.18 130)", "oklch(0.55 0.18 300)", "oklch(0.60 0.18 60)",
    "oklch(0.55 0.18 240)", "oklch(0.60 0.18 170)",
  ];

  if (loadingProfile) {
    return (
      <PSBLayout breadcrumbs={[{ label: "Carregando..." }]}>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      </PSBLayout>
    );
  }

  if (!profile) {
    return (
      <PSBLayout breadcrumbs={[{ label: "Não encontrado" }]}>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <XCircle size={40} className="text-muted-foreground" />
          <p className="text-muted-foreground">Político não encontrado.</p>
        </div>
      </PSBLayout>
    );
  }

  return (
    <PSBLayout breadcrumbs={breadcrumbs}>
      <div className="p-4 lg:p-6 space-y-6">

        {/* Perfil Header */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-xl psb-gradient flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {profile.nameUrna || profile.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">{profile.name}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0
                  ${profile.elected
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}>
                  {profile.elected
                    ? <><CheckCircle size={12} /> Eleito</>
                    : <><XCircle size={12} /> Não eleito</>
                  }
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <Award size={13} className="text-primary" />
                  <span className="text-foreground font-medium">{profile.cargo}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <MapPin size={13} className="text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {profile.municipality ? `${profile.municipality} — ` : ""}{profile.stateName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ background: getPartyColor(profile.party) }} />
                  <span className="text-muted-foreground">{profile.party}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            <StatCard
              label="Votos (última eleição)"
              value={profile.votes.toLocaleString("pt-BR")}
              sub={`${profile.percentage.toFixed(2)}% dos votos válidos`}
              icon={Users}
              highlight
            />
            <StatCard
              label="Eleições disputadas"
              value={history.length.toString()}
              sub={`${history.filter(h => h.elected).length} vitórias`}
              icon={Calendar}
            />
            <StatCard
              label="Despesa de campanha"
              value={profile.expense > 0 ? `R$ ${(profile.expense / 1000).toFixed(0)}K` : "—"}
              sub="última eleição"
              icon={DollarSign}
            />
            <StatCard
              label="Custo por voto"
              value={profile.costPerVote > 0 ? `R$ ${profile.costPerVote.toFixed(2)}` : "—"}
              sub="última eleição"
              icon={Target}
            />
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Evolução de Votos */}
          {!loadingHistory && votesChartData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" /> Evolução de Votos
              </h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={votesChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                    <XAxis dataKey="year" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()} />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.16 0.015 260)",
                        border: "1px solid oklch(0.25 0.015 260)",
                        borderRadius: "8px",
                        color: "oklch(0.95 0.01 260)",
                        fontSize: "12px",
                      }}
                      formatter={(v: unknown) => [(v as number).toLocaleString("pt-BR"), "Votos"]}
                      labelFormatter={(label: string) => {
                        const item = votesChartData.find(d => String(d.year) === String(label));
                        return `${label} — ${item?.cargo ?? ""}`;
                      }}
                    />
                    <Bar dataKey="Votos" radius={[4, 4, 0, 0]}>
                      {votesChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.Eleito ? "oklch(0.55 0.22 27)" : "oklch(0.35 0.08 27)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 justify-center mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-xs text-muted-foreground">Eleito</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.35 0.08 27)" }} />
                  <span className="text-xs text-muted-foreground">Não eleito</span>
                </div>
              </div>
            </div>
          )}

          {/* Análise Financeira */}
          {financeChartData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <DollarSign size={14} className="text-primary" /> Análise Financeira de Campanha
              </h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                    <XAxis dataKey="year" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.16 0.015 260)",
                        border: "1px solid oklch(0.25 0.015 260)",
                        borderRadius: "8px",
                        color: "oklch(0.95 0.01 260)",
                        fontSize: "12px",
                      }}
                      formatter={(v: unknown, name: string) => [
                        `R$ ${(v as number).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.01 260)" }} />
                    <Bar dataKey="Receita" fill="oklch(0.55 0.18 200)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesa" fill="oklch(0.55 0.22 27)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Votação por Zona + Concorrentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Zonas */}
          {!loadingZones && zones.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-primary" /> Votação por Zona Eleitoral (Top 15)
              </h2>

              {/* Mini pie */}
              {pieData.length > 0 && (
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-32 h-32 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "oklch(0.16 0.015 260)",
                            border: "1px solid oklch(0.25 0.015 260)",
                            borderRadius: "8px",
                            color: "oklch(0.95 0.01 260)",
                            fontSize: "11px",
                          }}
                          formatter={(v: unknown, _n: string, props: { payload?: { pct?: string } }) => [
                            `${(v as number).toLocaleString("pt-BR")} votos (${props.payload?.pct ?? "0"}%)`,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    {pieData.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                        <span className="text-xs font-medium text-foreground ml-auto flex-shrink-0">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {zones.map((z, i) => {
                  const maxVotes = zones[0]?.votes ?? 1;
                  const pct = (z.votes / maxVotes) * 100;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-foreground truncate">{z.municipality} — Zona {z.zone}</span>
                          <span className="text-xs font-medium text-foreground ml-2 flex-shrink-0">
                            {z.votes.toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Concorrentes */}
          {competitors.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <BarChart2 size={14} className="text-primary" /> Comparação com Concorrentes
              </h2>
              <div className="space-y-2">
                {competitors.map((c) => {
                  const maxVotes = competitors[0]?.votes ?? 1;
                  const pct = (c.votes / maxVotes) * 100;
                  return (
                    <div key={c.sequencial}
                      className={`p-2.5 rounded-lg transition-colors ${c.isTarget
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-muted-foreground w-5">{c.rank}º</span>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: getPartyColor(c.party) }}
                        />
                        <span className={`text-sm font-medium truncate flex-1 ${c.isTarget ? "text-primary" : "text-foreground"}`}>
                          {c.name}
                          {c.isTarget && <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">você</span>}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{c.party}</span>
                        {c.elected
                          ? <CheckCircle size={12} className="text-green-400 flex-shrink-0" />
                          : <XCircle size={12} className="text-muted-foreground flex-shrink-0" />
                        }
                      </div>
                      <div className="flex items-center gap-2 ml-7">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: c.isTarget ? "oklch(0.55 0.22 27)" : getPartyColor(c.party),
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground flex-shrink-0">
                          {c.votes.toLocaleString("pt-BR")}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {c.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tabela Histórico Completo */}
        {history.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                <Calendar size={14} className="text-primary" /> Histórico Eleitoral Completo
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ano</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cargo</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Local</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Partido</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Votos</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Despesa</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">R$/Voto</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} className={`border-b border-border/50 ${h.elected ? "" : "opacity-70"}`}>
                      <td className="px-4 py-2.5 font-bold text-foreground">{h.year}</td>
                      <td className="px-3 py-2.5 text-sm text-foreground">{h.cargo}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">
                        {h.municipality ? `${h.municipality} — ` : ""}{h.uf}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{ background: `${getPartyColor(h.party)}30`, color: getPartyColor(h.party) }}>
                          {h.party}
                        </span>
                      </td>
                      <td className="text-right px-3 py-2.5 font-medium text-foreground">
                        {h.votes.toLocaleString("pt-BR")}
                      </td>
                      <td className="text-right px-3 py-2.5 text-muted-foreground hidden lg:table-cell">
                        {h.expense > 0 ? `R$ ${h.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="text-right px-3 py-2.5 text-muted-foreground hidden lg:table-cell">
                        {h.costPerVote > 0 ? `R$ ${h.costPerVote.toFixed(2)}` : "—"}
                      </td>
                      <td className="text-center px-3 py-2.5">
                        {h.elected
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle size={10} /> Eleito
                            </span>
                          : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              <XCircle size={10} /> {h.situation}
                            </span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PSBLayout>
  );
}
