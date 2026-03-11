import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import PSBLayout from "@/components/PSBLayout";
import {
  Building2, Users, Landmark, Award, TrendingUp, Phone, Mail,
  MapPin, Globe, Instagram, Facebook, ChevronRight, Loader2,
  BarChart2, Calendar, DollarSign
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, BarChart, Bar
} from "recharts";

const CARGO_LABELS: Record<string, string> = {
  PREFEITO: "Prefeitos",
  VEREADOR: "Vereadores",
  "DEPUTADO FEDERAL": "Dep. Federais",
  "DEPUTADO ESTADUAL": "Dep. Estaduais",
  SENADOR: "Senadores",
  GOVERNADOR: "Governadores",
};

const CARGO_ANOS: Record<string, number> = {
  PREFEITO: 2024, VEREADOR: 2024,
  "DEPUTADO FEDERAL": 2022, "DEPUTADO ESTADUAL": 2022,
  SENADOR: 2022, GOVERNADOR: 2022,
};

type ElectedItem = {
  sequencial: string; name: string; nameUrna: string; cargo: string;
  uf: string; municipality: string; votes: number; percentage: number;
  situation: string; receipt: number; expense: number; costPerVote: number;
};

function QuadroCard({ label, value, icon: Icon, color, onClick }: {
  label: string; value: number; icon: React.ElementType;
  color: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={value === 0}
      className={`bg-card border border-border rounded-xl p-4 flex items-center gap-3 transition-all text-left w-full
        ${value > 0 ? "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-foreground text-2xl font-bold">{value}</p>
      </div>
      {value > 0 && <ChevronRight size={14} className="ml-auto text-muted-foreground flex-shrink-0" />}
    </button>
  );
}

export default function EstadoPage() {
  const params = useParams<{ uf: string }>();
  const uf = params.uf?.toUpperCase() ?? "";
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("PREFEITO");
  const [municipioFilter, setMunicipioFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: quadro, isLoading: loadingQuadro } = trpc.psb.getStateQuadro.useQuery({ uf });
  const { data: demographics, isLoading: loadingDemo } = trpc.psb.getStateDemographics.useQuery({ uf });
  const { data: directory } = trpc.psb.getStateDirectory.useQuery({ uf });
  const { data: history, isLoading: loadingHistory } = trpc.psb.getStateHistory.useQuery({ uf });
  const { data: elected, isLoading: loadingElected } = trpc.psb.getStateElected.useQuery({
    uf, cargo: activeTab, page, pageSize: 30,
    municipio: municipioFilter || undefined,
  });

  type QuadroData = { uf: string; name: string; mayors: number; councilors: number; federalDeputies: number; stateDeputies: number; senators: number; governors: number };
  type DemoData = { uf: string; name: string; population: number; voters: number; turnout: number; abstention: number };
  type DirectoryData = { uf: string; name: string; president: string; address: string; phone: string; email: string; instagram?: string; facebook?: string; website?: string };
  type HistoryItem = { year: number; mayors: number; councilors: number; federalDeputies: number; stateDeputies: number; total: number };
  type ElectedData = { items: ElectedItem[]; total: number; page: number; pageSize: number };

  const q = quadro as QuadroData | undefined;
  const demo = demographics as DemoData | undefined;
  const dir = directory as DirectoryData | undefined;
  const hist = (history as HistoryItem[] | undefined) ?? [];
  const electedData = elected as ElectedData | undefined;

  const stateName = q?.name ?? demo?.name ?? dir?.name ?? uf;

  const tabCounts: Record<string, number> = {
    PREFEITO: q?.mayors ?? 0,
    VEREADOR: q?.councilors ?? 0,
    "DEPUTADO FEDERAL": q?.federalDeputies ?? 0,
    "DEPUTADO ESTADUAL": q?.stateDeputies ?? 0,
    SENADOR: q?.senators ?? 0,
    GOVERNADOR: q?.governors ?? 0,
  };

  const availableTabs = Object.entries(tabCounts).filter(([, v]) => v > 0).map(([k]) => k);

  const handlePoliticianClick = (sequencial: string) => {
    navigate(`/politico/${sequencial}`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
    setMunicipioFilter("");
  };

  const histChartData = hist.map(h => ({
    year: h.year,
    Prefeitos: h.mayors,
    Vereadores: h.councilors,
    "Dep. Federais": h.federalDeputies,
    "Dep. Estaduais": h.stateDeputies,
    Total: h.total,
  }));

  const isLoading = loadingQuadro || loadingDemo;

  return (
    <PSBLayout
      breadcrumbs={[{ label: stateName }]}
    >
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 rounded-full psb-gradient" />
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                PSB em {stateName}
              </h1>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{uf}</span>
            </div>
            <p className="text-muted-foreground text-sm ml-3">
              Quadro atual de eleitos e histórico eleitoral do PSB no estado
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {/* Dados Demográficos + Diretório */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Dados do Estado */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <BarChart2 size={13} /> Dados do Estado
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">População</p>
                    <p className="text-lg font-bold text-foreground">
                      {demo?.population ? (demo.population / 1_000_000).toFixed(1) + "M" : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">habitantes (Censo 2022)</p>
                  </div>
                  <div className="bg-background rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Eleitores</p>
                    <p className="text-lg font-bold text-foreground">
                      {demo?.voters ? (demo.voters / 1_000_000).toFixed(1) + "M" : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">eleitores aptos</p>
                  </div>
                  <div className="bg-background rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Comparecimento</p>
                    <p className="text-lg font-bold text-foreground">{demo?.turnout?.toFixed(1) ?? "—"}%</p>
                    <p className="text-xs text-muted-foreground">média eleitoral</p>
                  </div>
                  <div className="bg-background rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Abstenção</p>
                    <p className="text-lg font-bold text-foreground">{demo?.abstention?.toFixed(1) ?? "—"}%</p>
                    <p className="text-xs text-muted-foreground">média eleitoral</p>
                  </div>
                </div>
              </div>

              {/* Diretório PSB */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Building2 size={13} /> Diretório Estadual PSB
                </h2>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <Users size={14} className="text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Presidente Estadual</p>
                      <p className="text-sm font-medium text-foreground">{dir?.president ?? "Informação não disponível"}</p>
                    </div>
                  </div>
                  {dir?.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Endereço</p>
                        <p className="text-sm text-foreground">{dir.address}</p>
                      </div>
                    </div>
                  )}
                  {dir?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm text-foreground">{dir.phone}</p>
                      </div>
                    </div>
                  )}
                  {dir?.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-primary flex-shrink-0" />
                      <a href={`mailto:${dir.email}`} className="text-sm text-primary hover:underline">{dir.email}</a>
                    </div>
                  )}
                  <div className="flex gap-3 mt-2 pt-2 border-t border-border">
                    {dir?.instagram && (
                      <a href={`https://instagram.com/${dir.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <Instagram size={13} /> {dir.instagram}
                      </a>
                    )}
                    {dir?.facebook && (
                      <a href={`https://facebook.com/${dir.facebook}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <Facebook size={13} /> {dir.facebook}
                      </a>
                    )}
                    {dir?.website && (
                      <a href={dir.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <Globe size={13} /> Site oficial
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quadro Atual */}
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Award size={15} className="text-primary" /> Quadro Atual de Eleitos PSB
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <QuadroCard label="Prefeitos" value={q?.mayors ?? 0} icon={Building2} color="bg-primary"
                  onClick={() => handleTabChange("PREFEITO")} />
                <QuadroCard label="Vereadores" value={q?.councilors ?? 0} icon={Users} color="bg-[oklch(0.50_0.18_45)]"
                  onClick={() => handleTabChange("VEREADOR")} />
                <QuadroCard label="Dep. Federais" value={q?.federalDeputies ?? 0} icon={Landmark} color="bg-[oklch(0.50_0.18_200)]"
                  onClick={() => handleTabChange("DEPUTADO FEDERAL")} />
                <QuadroCard label="Dep. Estaduais" value={q?.stateDeputies ?? 0} icon={Landmark} color="bg-[oklch(0.50_0.18_130)]"
                  onClick={() => handleTabChange("DEPUTADO ESTADUAL")} />
                <QuadroCard label="Senadores" value={q?.senators ?? 0} icon={Award} color="bg-[oklch(0.50_0.18_300)]"
                  onClick={() => handleTabChange("SENADOR")} />
                <QuadroCard label="Governadores" value={q?.governors ?? 0} icon={TrendingUp} color="bg-[oklch(0.45_0.18_60)]"
                  onClick={() => handleTabChange("GOVERNADOR")} />
              </div>
            </div>

            {/* Abas de Eleitos */}
            {availableTabs.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Tabs */}
                <div className="flex overflow-x-auto border-b border-border">
                  {availableTabs.map(tab => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors border-b-2 flex-shrink-0
                        ${activeTab === tab
                          ? "border-primary text-primary bg-primary/5"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                    >
                      {CARGO_LABELS[tab] ?? tab}
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs
                        ${activeTab === tab ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {tabCounts[tab]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Filtro por município (para vereadores) */}
                {activeTab === "VEREADOR" && (
                  <div className="px-4 py-3 border-b border-border">
                    <input
                      type="text"
                      placeholder="Filtrar por município..."
                      value={municipioFilter}
                      onChange={(e) => { setMunicipioFilter(e.target.value); setPage(1); }}
                      className="w-full max-w-xs bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Ano de referência */}
                <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
                  <Calendar size={12} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Eleição de {CARGO_ANOS[activeTab] ?? 2024} — Clique no candidato para ver o perfil completo
                  </span>
                </div>

                {/* Lista */}
                {loadingElected ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nome</th>
                          {activeTab === "VEREADOR" || activeTab === "PREFEITO" ? (
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Município</th>
                          ) : null}
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Votos</th>
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">%</th>
                          <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                            <span className="flex items-center justify-end gap-1"><DollarSign size={10} />Custo/Voto</span>
                          </th>
                          <th className="px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(electedData?.items ?? []).map((item, idx) => (
                          <tr
                            key={item.sequencial}
                            className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                            onClick={() => handlePoliticianClick(item.sequencial)}
                          >
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">
                              {(page - 1) * 30 + idx + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-foreground">{item.nameUrna || item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.name}</p>
                            </td>
                            {(activeTab === "VEREADOR" || activeTab === "PREFEITO") && (
                              <td className="px-3 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">
                                {item.municipality}
                              </td>
                            )}
                            <td className="text-right px-3 py-2.5 font-medium text-foreground">
                              {item.votes.toLocaleString("pt-BR")}
                            </td>
                            <td className="text-right px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                              {item.percentage.toFixed(2)}%
                            </td>
                            <td className="text-right px-3 py-2.5 text-muted-foreground hidden lg:table-cell">
                              {item.costPerVote > 0
                                ? `R$ ${item.costPerVote.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                : "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              <ChevronRight size={14} className="text-muted-foreground" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Paginação */}
                    {(electedData?.total ?? 0) > 30 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          {(page - 1) * 30 + 1}–{Math.min(page * 30, electedData?.total ?? 0)} de {electedData?.total?.toLocaleString("pt-BR")}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 text-xs rounded-lg border border-border text-foreground disabled:opacity-40 hover:bg-accent transition-colors"
                          >
                            Anterior
                          </button>
                          <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * 30 >= (electedData?.total ?? 0)}
                            className="px-3 py-1 text-xs rounded-lg border border-border text-foreground disabled:opacity-40 hover:bg-accent transition-colors"
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Histórico 2014-2024 */}
            {hist.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                  <TrendingUp size={15} className="text-primary" /> Histórico de Eleitos PSB — {stateName} (2014–2024)
                </h2>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={histChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                          <XAxis dataKey="year" tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "oklch(0.60 0.01 260)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              background: "oklch(0.16 0.015 260)",
                              border: "1px solid oklch(0.25 0.015 260)",
                              borderRadius: "8px",
                              color: "oklch(0.95 0.01 260)",
                              fontSize: "12px",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px", color: "oklch(0.60 0.01 260)" }} />
                          <Line type="monotone" dataKey="Prefeitos" stroke="oklch(0.60 0.22 27)" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Vereadores" stroke="oklch(0.65 0.18 45)" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Dep. Federais" stroke="oklch(0.55 0.18 200)" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Dep. Estaduais" stroke="oklch(0.65 0.18 130)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Tabela histórico */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 text-muted-foreground font-semibold uppercase tracking-wide">Ano</th>
                            <th className="text-right py-2 text-muted-foreground font-semibold uppercase tracking-wide">Prefeitos</th>
                            <th className="text-right py-2 text-muted-foreground font-semibold uppercase tracking-wide">Vereadores</th>
                            <th className="text-right py-2 text-muted-foreground font-semibold uppercase tracking-wide hidden sm:table-cell">Dep. Fed.</th>
                            <th className="text-right py-2 text-muted-foreground font-semibold uppercase tracking-wide hidden sm:table-cell">Dep. Est.</th>
                            <th className="text-right py-2 text-muted-foreground font-semibold uppercase tracking-wide">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hist.map(h => (
                            <tr key={h.year} className="border-b border-border/50">
                              <td className="py-2 font-bold text-foreground">{h.year}</td>
                              <td className="text-right py-2 text-foreground">{h.mayors}</td>
                              <td className="text-right py-2 text-foreground">{h.councilors.toLocaleString("pt-BR")}</td>
                              <td className="text-right py-2 text-foreground hidden sm:table-cell">{h.federalDeputies}</td>
                              <td className="text-right py-2 text-foreground hidden sm:table-cell">{h.stateDeputies}</td>
                              <td className="text-right py-2 font-bold text-foreground">{h.total.toLocaleString("pt-BR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PSBLayout>
  );
}
