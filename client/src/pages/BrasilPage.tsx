import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Users, Building2, Star, TrendingUp, Award, Landmark, Vote, ChevronRight, BarChart3
} from "lucide-react";
import * as d3 from "d3";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const STATE_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

const CARGO_CONFIG = [
  { key: "governors", label: "Governadores", icon: Award, bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", route: "GOVERNADOR" },
  { key: "senators", label: "Senadores", icon: Landmark, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", route: "SENADOR" },
  { key: "federalDeputies", label: "Dep. Federais", icon: Vote, bg: "bg-green-50", border: "border-green-200", text: "text-green-700", route: "DEPUTADO FEDERAL" },
  { key: "stateDeputies", label: "Dep. Estaduais", icon: Building2, bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", route: "DEPUTADO ESTADUAL" },
  { key: "mayors", label: "Prefeitos", icon: MapPin, bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", route: "PREFEITO" },
  { key: "councilors", label: "Vereadores", icon: Users, bg: "bg-red-50", border: "border-red-200", text: "text-red-700", route: "VEREADOR" },
];

// ─── COMPONENTE MAPA D3 ───────────────────────────────────────────────────────

interface StateData {
  uf: string; name: string; total: number; mayors: number; councilors: number;
  federalDeputies: number; stateDeputies: number; senators: number; governors: number;
}

interface BrazilMapD3Props {
  rankingData: StateData[];
  onStateClick: (uf: string) => void;
}

function BrazilMapD3({ rankingData, onStateClick }: BrazilMapD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<{ type: string; features: unknown[] } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; uf: string } | null>(null);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson")
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => {
        fetch("https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&divisao=UF")
          .then(r => r.json())
          .then(setGeoData)
          .catch(console.error);
      });
  }, []);

  const totalByUf = useMemo(() => {
    const map: Record<string, number> = {};
    rankingData.forEach(r => { map[r.uf] = r.total; });
    return map;
  }, [rankingData]);

  const maxTotal = useMemo(() => Math.max(...Object.values(totalByUf), 1), [totalByUf]);

  useEffect(() => {
    if (!svgRef.current || !geoData || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth || 560;
    const height = 400;
    svgRef.current.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const projection = d3.geoMercator().fitSize([width, height], geoData as d3.GeoPermissibleObjects);
    const path = d3.geoPath().projection(projection);
    const colorScale = d3.scaleSequential().domain([0, maxTotal]).interpolator(d3.interpolateRgb("#fecdd3", "#be123c"));

    svg.selectAll("path")
      .data(geoData.features)
      .enter().append("path")
      .attr("d", (d: unknown) => path(d as d3.GeoPermissibleObjects) ?? "")
      .attr("fill", (d: unknown) => {
        const props = (d as { properties: Record<string, string> }).properties;
        const sigla = props.sigla ?? props.UF_05 ?? props.SIGLA ?? "";
        const total = totalByUf[sigla] ?? 0;
        return total > 0 ? colorScale(total) : "#f1f5f9";
      })
      .attr("stroke", "#fff").attr("stroke-width", 1.5).attr("cursor", "pointer")
      .on("mouseover", function (event: MouseEvent, d: unknown) {
        const props = (d as { properties: Record<string, string> }).properties;
        const sigla = props.sigla ?? props.UF_05 ?? props.SIGLA ?? "";
        d3.select(this).attr("stroke", "#be123c").attr("stroke-width", 2.5);
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, uf: sigla });
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1.5);
        setTooltip(null);
      })
      .on("click", (_: unknown, d: unknown) => {
        const props = (d as { properties: Record<string, string> }).properties;
        const sigla = props.sigla ?? props.UF_05 ?? props.SIGLA ?? "";
        if (sigla) onStateClick(sigla);
      });

    svg.selectAll("text")
      .data(geoData.features)
      .enter().append("text")
      .attr("transform", (d: unknown) => {
        const c = path.centroid(d as d3.GeoPermissibleObjects);
        return `translate(${c})`;
      })
      .attr("text-anchor", "middle").attr("dy", "0.35em")
      .attr("font-size", "9px").attr("font-weight", "600").attr("pointer-events", "none")
      .attr("fill", (d: unknown) => {
        const props = (d as { properties: Record<string, string> }).properties;
        const sigla = props.sigla ?? props.UF_05 ?? props.SIGLA ?? "";
        return (totalByUf[sigla] ?? 0) > maxTotal * 0.5 ? "#fff" : "#374151";
      })
      .text((d: unknown) => {
        const props = (d as { properties: Record<string, string> }).properties;
        return props.sigla ?? props.UF_05 ?? props.SIGLA ?? "";
      });
  }, [geoData, totalByUf, maxTotal, onStateClick]);

  const tooltipData = tooltip ? rankingData.find(r => r.uf === tooltip.uf) : null;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: 400 }}>
      {!geoData && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-slate-400">Carregando mapa...</p>
          </div>
        </div>
      )}
      <svg ref={svgRef} className="w-full h-full" />
      {tooltip && tooltipData && (
        <div
          className="absolute bg-white border border-slate-200 rounded-xl shadow-xl p-3 pointer-events-none z-20 min-w-[190px]"
          style={{ left: Math.min(tooltip.x + 12, 340), top: Math.max(tooltip.y - 60, 0) }}
        >
          <p className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-1 mb-1">{STATE_NAMES[tooltip.uf] ?? tooltip.uf}</p>
          <div className="space-y-0.5 text-xs text-slate-600">
            {tooltipData.governors > 0 && <p className="flex justify-between"><span>Governadores</span><span className="font-semibold text-purple-700">{tooltipData.governors}</span></p>}
            {tooltipData.senators > 0 && <p className="flex justify-between"><span>Senadores</span><span className="font-semibold text-blue-700">{tooltipData.senators}</span></p>}
            {tooltipData.federalDeputies > 0 && <p className="flex justify-between"><span>Dep. Federais</span><span className="font-semibold text-green-700">{tooltipData.federalDeputies}</span></p>}
            {tooltipData.stateDeputies > 0 && <p className="flex justify-between"><span>Dep. Estaduais</span><span className="font-semibold text-yellow-700">{tooltipData.stateDeputies}</span></p>}
            {tooltipData.mayors > 0 && <p className="flex justify-between"><span>Prefeitos</span><span className="font-semibold text-orange-700">{tooltipData.mayors}</span></p>}
            {tooltipData.councilors > 0 && <p className="flex justify-between"><span>Vereadores</span><span className="font-semibold text-red-700">{tooltipData.councilors}</span></p>}
            <p className="flex justify-between font-bold text-red-700 border-t border-slate-100 pt-1 mt-1"><span>Total</span><span>{tooltipData.total}</span></p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-white/95 rounded-lg p-2 text-xs text-slate-500 border border-slate-100 shadow-sm">
        <p className="font-semibold text-slate-700 mb-1">Eleitos PSB</p>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded" style={{ background: "#fecdd3" }} /><span>Poucos</span>
          <div className="w-4 h-3 rounded ml-1" style={{ background: "#be123c" }} /><span>Muitos</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-4 h-3 rounded border border-slate-200" style={{ background: "#f1f5f9" }} /><span>Sem eleitos</span>
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function BrasilPage() {
  const [, navigate] = useLocation();

  const { data: summaryRaw, isLoading: loadingSummary } = trpc.psb.getNationalSummary.useQuery();
  const { data: rankingRaw, isLoading: loadingRanking } = trpc.psb.getStateRanking.useQuery({ limit: 27 });

  const summary = summaryRaw as {
    mayors: number; councilors: number; federalDeputies: number;
    stateDeputies: number; senators: number; governors: number;
  } | undefined;

  const ranking = (rankingRaw ?? []) as StateData[];

  const totalElected = summary
    ? summary.mayors + summary.councilors + summary.federalDeputies +
      summary.stateDeputies + summary.senators + summary.governors
    : 0;

  const top10 = ranking.slice(0, 10);
  const chartData = top10.map(s => ({
    uf: s.uf,
    "Prefeitos": s.mayors,
    "Vereadores": s.councilors,
    "Dep. Fed.": s.federalDeputies,
    "Dep. Est.": s.stateDeputies,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">40</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">PSB no Brasil</h1>
              <p className="text-sm text-slate-500">Panorama Nacional — Eleições 2022 e 2024</p>
            </div>
          </div>
          {!loadingSummary && (
            <Badge className="bg-red-600 text-white hover:bg-red-700 text-sm px-3 py-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              {totalElected.toLocaleString("pt-BR")} eleitos
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Cards de Cargo — clicáveis */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CARGO_CONFIG.map(({ key, label, icon: Icon, bg, border, text, route }) => {
            const value = summary ? (summary as Record<string, number>)[key] ?? 0 : 0;
            return (
              <button
                key={key}
                onClick={() => navigate(`/cargo/${encodeURIComponent(route)}`)}
                className={`${bg} ${border} border rounded-xl p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer`}
              >
                <Icon className={`w-5 h-5 mb-2 ${text} opacity-70`} />
                {loadingSummary ? (
                  <Skeleton className="h-7 w-12 mb-1" />
                ) : (
                  <p className={`text-2xl font-bold ${text}`}>{value.toLocaleString("pt-BR")}</p>
                )}
                <p className={`text-xs font-medium ${text} opacity-80`}>{label}</p>
                <p className={`text-xs ${text} opacity-50 mt-0.5`}>Ver todos →</p>
              </button>
            );
          })}
        </div>

        {/* Mapa + Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Mapa D3 */}
          <Card className="lg:col-span-3 border-0 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                <MapPin className="w-4 h-4 text-red-600" />
                Distribuição Geográfica
                <span className="text-xs font-normal text-slate-400 normal-case ml-1">— clique em um estado</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingRanking ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <BrazilMapD3 rankingData={ranking} onStateClick={(uf) => navigate(`/estado/${uf}`)} />
              )}
            </CardContent>
          </Card>

          {/* Ranking de estados */}
          <Card className="lg:col-span-2 border-0 shadow-sm bg-white">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                <Star className="w-4 h-4 text-red-600" />
                Ranking por Estado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto" style={{ maxHeight: 440 }}>
                {loadingRanking ? (
                  <div className="p-4 space-y-2">
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-500 font-semibold">#</th>
                        <th className="text-left px-2 py-2 text-slate-500 font-semibold">Estado</th>
                        <th className="text-center px-1 py-2 text-purple-600 font-semibold" title="Governadores">Gov</th>
                        <th className="text-center px-1 py-2 text-blue-600 font-semibold" title="Senadores">Sen</th>
                        <th className="text-center px-1 py-2 text-green-600 font-semibold" title="Dep. Federais">DF</th>
                        <th className="text-center px-1 py-2 text-yellow-600 font-semibold" title="Dep. Estaduais">DE</th>
                        <th className="text-center px-1 py-2 text-orange-600 font-semibold" title="Prefeitos">Pref</th>
                        <th className="text-center px-1 py-2 text-red-600 font-semibold" title="Vereadores">Ver</th>
                        <th className="text-center px-3 py-2 text-red-700 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((state, i) => (
                        <tr
                          key={state.uf}
                          onClick={() => navigate(`/estado/${state.uf}`)}
                          className={`cursor-pointer border-b border-slate-50 hover:bg-red-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                        >
                          <td className="px-3 py-2 text-slate-400 font-medium">{i + 1}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-xs">{state.uf}</span>
                              <span className="text-slate-600 hidden sm:block truncate max-w-[70px]">{state.name}</span>
                            </div>
                          </td>
                          <td className="px-1 py-2 text-center">{state.governors > 0 ? <span className="text-purple-700 font-bold">{state.governors}</span> : <span className="text-slate-200">—</span>}</td>
                          <td className="px-1 py-2 text-center">{state.senators > 0 ? <span className="text-blue-700 font-bold">{state.senators}</span> : <span className="text-slate-200">—</span>}</td>
                          <td className="px-1 py-2 text-center">{state.federalDeputies > 0 ? <span className="text-green-700 font-bold">{state.federalDeputies}</span> : <span className="text-slate-200">—</span>}</td>
                          <td className="px-1 py-2 text-center">{state.stateDeputies > 0 ? <span className="text-yellow-700 font-bold">{state.stateDeputies}</span> : <span className="text-slate-200">—</span>}</td>
                          <td className="px-1 py-2 text-center">{state.mayors > 0 ? <span className="text-orange-700 font-bold">{state.mayors}</span> : <span className="text-slate-200">—</span>}</td>
                          <td className="px-1 py-2 text-center">{state.councilors > 0 ? <span className="text-red-700 font-bold">{state.councilors}</span> : <span className="text-slate-200">—</span>}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="bg-red-600 text-white font-bold text-xs px-2 py-0.5 rounded-full">{state.total}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de distribuição */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
              <BarChart3 className="w-4 h-4 text-red-600" />
              Distribuição de Eleitos por Estado — Top 10
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingRanking ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis dataKey="uf" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: unknown, name: string) => [(value as number).toLocaleString("pt-BR"), name]}
                      />
                      <Bar dataKey="Prefeitos" stackId="a" fill="#f97316" />
                      <Bar dataKey="Vereadores" stackId="a" fill="#dc2626" />
                      <Bar dataKey="Dep. Fed." stackId="a" fill="#16a34a" />
                      <Bar dataKey="Dep. Est." stackId="a" fill="#ca8a04" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-4 justify-center mt-3">
                  {[
                    { color: "#f97316", label: "Prefeitos" },
                    { color: "#dc2626", label: "Vereadores" },
                    { color: "#16a34a", label: "Dep. Federais" },
                    { color: "#ca8a04", label: "Dep. Estaduais" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                      <span className="text-xs text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Acesso rápido por estado */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
              <MapPin className="w-4 h-4 text-red-600" />
              Acesso Rápido por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-14 gap-2">
              {Object.entries(STATE_NAMES).sort(([, a], [, b]) => a.localeCompare(b)).map(([uf]) => {
                const data = ranking.find(r => r.uf === uf);
                const hasElected = data && data.total > 0;
                return (
                  <button
                    key={uf}
                    onClick={() => navigate(`/estado/${uf}`)}
                    className={`rounded-lg border p-2 text-center transition-all hover:shadow-sm hover:-translate-y-0.5 cursor-pointer ${
                      hasElected ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className={`text-xs font-bold ${hasElected ? "text-red-700" : "text-slate-400"}`}>{uf}</p>
                    {data && data.total > 0 && (
                      <p className="text-xs text-red-500 font-semibold">{data.total}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
