import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import PSBLayout from "@/components/PSBLayout";
import BrazilMap from "@/components/BrazilMap";
import { Building2, Users, Landmark, Award, TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 stat-card">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-foreground text-2xl font-bold leading-tight">
          {value.toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

export default function BrasilPage() {
  const [, navigate] = useLocation();

  type Summary = { mayors: number; councilors: number; federalDeputies: number; stateDeputies: number; senators: number; governors: number };
  type StateRanking = { uf: string; name: string; mayors: number; councilors: number; federalDeputies: number; stateDeputies: number; total: number };
  const { data: summaryRaw, isLoading: loadingSummary } = trpc.psb.getNationalSummary.useQuery();
  const { data: rankingRaw, isLoading: loadingRanking } = trpc.psb.getStateRanking.useQuery({ limit: 27 });
  const summary = summaryRaw as Summary | undefined;
  const ranking = rankingRaw as StateRanking[] | undefined;

  const isLoading = loadingSummary || loadingRanking;

  const handleStateClick = (uf: string) => {
    navigate(`/estado/${uf}`);
  };

  const top10: StateRanking[] = ranking?.slice(0, 10) ?? [];
  const chartData = top10.map(s => ({
    uf: s.uf,
    name: s.name,
    mayors: s.mayors,
    councilors: s.councilors,
    total: s.mayors + s.councilors,
  }));

  return (
    <PSBLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 rounded-full psb-gradient" />
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              PSB no Brasil
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-3">
            Presença eleitoral do Partido Socialista Brasileiro em todo o território nacional
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <KpiCard label="Prefeitos" value={summary?.mayors ?? 0} icon={Building2} color="bg-primary" />
              <KpiCard label="Vereadores" value={summary?.councilors ?? 0} icon={Users} color="bg-[oklch(0.50_0.18_45)]" />
              <KpiCard label="Dep. Federais" value={summary?.federalDeputies ?? 0} icon={Landmark} color="bg-[oklch(0.50_0.18_200)]" />
              <KpiCard label="Dep. Estaduais" value={summary?.stateDeputies ?? 0} icon={Landmark} color="bg-[oklch(0.50_0.18_130)]" />
              <KpiCard label="Senadores" value={summary?.senators ?? 0} icon={Award} color="bg-[oklch(0.50_0.18_300)]" />
              <KpiCard label="Governadores" value={summary?.governors ?? 0} icon={TrendingUp} color="bg-[oklch(0.45_0.18_60)]" />
            </div>

            {/* Map + Ranking */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Mapa */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Mapa de Presença — Eleições 2024
                  </h2>
                  <span className="text-xs text-muted-foreground">Clique em um estado</span>
                </div>
                <BrazilMap
                  stateData={ranking ?? []}
                  onStateClick={handleStateClick}
                />
              </div>

              {/* Ranking */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                  Top 10 Estados — Eleitos PSB
                </h2>
                <div className="space-y-2">
                  {top10.map((state, i) => (
                    <button
                      key={state.uf}
                      onClick={() => handleStateClick(state.uf)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors group text-left"
                    >
                      <span className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                          i === 1 ? "bg-gray-400/20 text-gray-300" :
                          i === 2 ? "bg-orange-600/20 text-orange-400" :
                          "bg-muted text-muted-foreground"}
                      `}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {state.uf}
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">{state.name}</span>
                        </div>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{state.mayors} prefeitos</span>
                          <span className="text-xs text-muted-foreground">{state.councilors} vereadores</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-foreground">{state.total.toLocaleString("pt-BR")}</span>
                        <p className="text-xs text-muted-foreground">eleitos</p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráfico de barras */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                Distribuição de Eleitos por Estado (Top 10)
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis
                      dataKey="uf"
                      tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.16 0.015 260)",
                        border: "1px solid oklch(0.25 0.015 260)",
                        borderRadius: "8px",
                        color: "oklch(0.95 0.01 260)",
                        fontSize: "12px",
                      }}
                      formatter={(value: unknown, name: string) => [
                        (value as number).toLocaleString("pt-BR"),
                  name === "mayors" ? "Prefeitos" : "Vereadores",
              ] as [string, string]}
                      labelFormatter={(label: string) => chartData.find((d: {uf: string; name: string}) => d.uf === label)?.name ?? label}
                    />
                    <Bar dataKey="mayors" name="mayors" stackId="a" fill="oklch(0.55 0.22 27)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="councilors" name="councilors" stackId="a" fill="oklch(0.65 0.18 45)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 justify-center mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-xs text-muted-foreground">Prefeitos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "oklch(0.65 0.18 45)" }} />
                  <span className="text-xs text-muted-foreground">Vereadores</span>
                </div>
              </div>
            </div>

            {/* Tabela completa */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Todos os Estados
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prefeitos</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vereadores</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Dep. Fed.</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Dep. Est.</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                      <th className="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ranking ?? []).map((state, i) => (
                      <tr
                        key={state.uf}
                        className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => handleStateClick(state.uf)}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {state.uf}
                            </span>
                            <span className="font-medium text-foreground">{state.name}</span>
                          </div>
                        </td>
                        <td className="text-right px-3 py-2.5 text-foreground font-medium">{state.mayors}</td>
                        <td className="text-right px-3 py-2.5 text-foreground">{state.councilors.toLocaleString("pt-BR")}</td>
                        <td className="text-right px-3 py-2.5 text-foreground hidden md:table-cell">{state.federalDeputies}</td>
                        <td className="text-right px-3 py-2.5 text-foreground hidden md:table-cell">{state.stateDeputies}</td>
                        <td className="text-right px-4 py-2.5 font-bold text-foreground">{state.total.toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2.5">
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PSBLayout>
  );
}
