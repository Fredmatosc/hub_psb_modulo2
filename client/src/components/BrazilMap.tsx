import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const GEOJSON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663409609671/fLifwRuGWeM9kwv26nFo5c/brazil-states_be79c783.geojson";

interface StateData {
  uf: string;
  name: string;
  total: number;
  mayors: number;
  councilors: number;
  federalDeputies?: number;
  stateDeputies?: number;
}

interface BrazilMapProps {
  stateData: StateData[];
  onStateClick: (uf: string) => void;
  maxValue?: number;
}

export default function BrazilMap({ stateData, onStateClick }: BrazilMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; uf: string; name: string; total: number; mayors: number; councilors: number;
  } | null>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(r => r.json())
      .then(setGeoData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!geoData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 520;
    const height = Math.round(width * 0.82);

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg.selectAll("*").remove();

    const projection = d3.geoMercator()
      .center([-54, -15])
      .scale(width * 0.95)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const maxTotal = Math.max(...stateData.map(s => s.total), 1);
    const colorScale = d3.scaleSequential()
      .domain([0, maxTotal])
      .interpolator(d3.interpolateRgb("#fee2e2", "#b91c1c"));

    const dataMap = new Map(stateData.map(s => [s.uf, s]));

    const g = svg.append("g");

    // Sombra suave nos estados
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "state-shadow");
    filter.append("feDropShadow")
      .attr("dx", "0").attr("dy", "1")
      .attr("stdDeviation", "2")
      .attr("flood-opacity", "0.15");

    g.selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", path as any)
      .attr("fill", (d: any) => {
        const total = dataMap.get(d.properties.sigla)?.total ?? 0;
        return total > 0 ? colorScale(total) : "#f1f5f9";
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .attr("filter", "url(#state-shadow)")
      .style("cursor", "pointer")
      .style("transition", "filter 0.15s")
      .on("mouseenter", function (event: MouseEvent, d: any) {
        const uf = d.properties.sigla;
        const info = dataMap.get(uf);
        const rect = container.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          uf,
          name: d.properties.name,
          total: info?.total ?? 0,
          mayors: info?.mayors ?? 0,
          councilors: info?.councilors ?? 0,
        });
        d3.select(this)
          .attr("stroke", "#991b1b")
          .attr("stroke-width", 2.5)
          .style("filter", "brightness(0.88) drop-shadow(0 2px 6px rgba(0,0,0,0.2))");
      })
      .on("mousemove", function (event: MouseEvent) {
        const rect = container.getBoundingClientRect();
        setTooltip(prev => prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
      })
      .on("mouseleave", function () {
        setTooltip(null);
        d3.select(this)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("filter", "url(#state-shadow)");
      })
      .on("click", (_: any, d: any) => {
        onStateClick(d.properties.sigla);
      });

    // Labels dos estados
    g.selectAll("text")
      .data(geoData.features)
      .enter()
      .append("text")
      .attr("transform", (d: any) => {
        const c = path.centroid(d as any);
        return c ? `translate(${c})` : "";
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", (d: any) => {
        const big = ["AM", "PA", "MT", "MG", "BA", "GO", "MS", "TO", "MA", "PI", "RS", "SP"];
        return big.includes(d.properties.sigla) ? "11px" : "9px";
      })
      .attr("font-weight", "700")
      .attr("font-family", "Space Grotesk, Inter, sans-serif")
      .attr("fill", (d: any) => {
        const total = dataMap.get(d.properties.sigla)?.total ?? 0;
        return total > maxTotal * 0.45 ? "#ffffff" : "#374151";
      })
      .attr("pointer-events", "none")
      .text((d: any) => d.properties.sigla);

  }, [geoData, stateData]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full" />

      {/* Tooltip HTML (mais bonito que SVG) */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm min-w-[160px]"
          style={{
            left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth ?? 400) - 180),
            top: Math.max(tooltip.y - 80, 8),
          }}
        >
          <div className="font-bold text-gray-900 text-base">{tooltip.name}</div>
          <div className="text-xs text-gray-400 mb-1">{tooltip.uf}</div>
          {tooltip.total > 0 ? (
            <>
              <div className="text-red-700 font-semibold text-base">{tooltip.total.toLocaleString("pt-BR")} eleitos</div>
              <div className="text-gray-500 text-xs mt-0.5">
                {tooltip.mayors} prefeitos · {tooltip.councilors.toLocaleString("pt-BR")} vereadores
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-xs">Sem eleitos PSB registrados</div>
          )}
          <div className="text-gray-400 text-xs mt-1 border-t border-gray-100 pt-1">Clique para ver detalhes →</div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex items-center gap-2 mt-3 justify-center">
        <span className="text-xs text-gray-400">Menos eleitos</span>
        <div className="flex gap-0.5">
          {["#fee2e2", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c"].map((c, i) => (
            <div key={i} className="w-5 h-3 rounded-sm" style={{ background: c }} />
          ))}
        </div>
        <span className="text-xs text-gray-400">Mais eleitos</span>
      </div>
    </div>
  );
}
