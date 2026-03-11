import { useState } from "react";

interface StateData {
  uf: string;
  name: string;
  total: number;
  mayors: number;
  councilors: number;
}

interface BrazilMapProps {
  stateData: StateData[];
  onStateClick: (uf: string) => void;
  maxValue?: number;
}

// Coordenadas aproximadas dos centróides dos estados para labels
const STATE_CENTROIDS: Record<string, { x: number; y: number }> = {
  AC: { x: 105, y: 310 }, AL: { x: 570, y: 295 }, AM: { x: 165, y: 220 },
  AP: { x: 390, y: 115 }, BA: { x: 510, y: 310 }, CE: { x: 555, y: 220 },
  DF: { x: 420, y: 345 }, ES: { x: 535, y: 380 }, GO: { x: 415, y: 345 },
  MA: { x: 460, y: 215 }, MG: { x: 470, y: 370 }, MS: { x: 360, y: 390 },
  MT: { x: 295, y: 305 }, PA: { x: 340, y: 200 }, PB: { x: 580, y: 250 },
  PE: { x: 555, y: 265 }, PI: { x: 510, y: 250 }, PR: { x: 400, y: 430 },
  RJ: { x: 515, y: 400 }, RN: { x: 580, y: 235 }, RO: { x: 210, y: 305 },
  RR: { x: 225, y: 130 }, RS: { x: 375, y: 480 }, SC: { x: 415, y: 455 },
  SE: { x: 565, y: 295 }, SP: { x: 440, y: 405 }, TO: { x: 415, y: 275 },
};

// Paths SVG simplificados dos estados brasileiros (viewBox 0 0 700 560)
const STATE_PATHS: Record<string, string> = {
  AC: "M60,280 L160,275 L175,320 L120,340 L60,330 Z",
  AL: "M555,270 L590,265 L595,300 L560,305 Z",
  AM: "M90,140 L280,130 L295,180 L260,260 L180,270 L100,250 L80,200 Z",
  AP: "M355,90 L415,85 L425,145 L375,150 L350,120 Z",
  BA: "M440,255 L590,240 L610,350 L545,420 L450,410 L420,360 L430,290 Z",
  CE: "M510,195 L590,190 L600,240 L530,255 L505,235 Z",
  DF: "M405,330 L430,330 L432,350 L407,352 Z",
  ES: "M510,355 L560,350 L565,400 L515,405 Z",
  GO: "M360,295 L460,285 L465,375 L365,380 Z",
  MA: "M420,175 L510,165 L520,230 L455,245 L420,225 Z",
  MG: "M390,320 L545,310 L555,415 L395,420 Z",
  MS: "M295,355 L395,345 L400,430 L300,435 Z",
  MT: "M215,245 L365,235 L370,370 L220,375 Z",
  PA: "M270,140 L430,130 L445,200 L410,250 L310,260 L265,220 Z",
  PB: "M545,240 L600,235 L605,265 L550,270 Z",
  PE: "M500,250 L600,245 L605,275 L505,280 Z",
  PI: "M460,200 L530,195 L535,265 L465,270 Z",
  PR: "M340,400 L460,390 L465,455 L345,460 Z",
  RJ: "M475,380 L545,375 L550,415 L480,420 Z",
  RN: "M555,210 L605,205 L610,240 L560,245 Z",
  RO: "M165,265 L265,255 L270,345 L170,350 Z",
  RR: "M175,90 L285,85 L290,165 L180,170 Z",
  RS: "M330,440 L450,430 L455,510 L335,515 Z",
  SC: "M360,420 L465,410 L470,455 L365,460 Z",
  SE: "M545,275 L585,270 L590,305 L550,310 Z",
  SP: "M380,370 L480,360 L485,435 L385,440 Z",
  TO: "M375,225 L460,215 L465,300 L380,305 Z",
};

function getColor(value: number, max: number): string {
  if (value === 0) return "oklch(0.20 0.01 260)";
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.2) return "oklch(0.35 0.08 27)";
  if (ratio < 0.4) return "oklch(0.42 0.13 27)";
  if (ratio < 0.6) return "oklch(0.50 0.18 27)";
  if (ratio < 0.8) return "oklch(0.55 0.22 27)";
  return "oklch(0.62 0.24 27)";
}

export default function BrazilMap({ stateData, onStateClick, maxValue }: BrazilMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; uf: string } | null>(null);

  const dataMap = new Map(stateData.map(s => [s.uf, s]));
  const max = maxValue ?? Math.max(...stateData.map(s => s.total), 1);

  const handleMouseMove = (e: React.MouseEvent<SVGElement>, uf: string) => {
    const rect = e.currentTarget.closest("svg")!.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      uf,
    });
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 700 560"
        className="w-full h-auto"
        style={{ maxHeight: "480px" }}
      >
        {/* Background */}
        <rect width="700" height="560" fill="transparent" />

        {/* States */}
        {Object.entries(STATE_PATHS).map(([uf, path]) => {
          const data = dataMap.get(uf);
          const total = data?.total ?? 0;
          const color = getColor(total, max);
          const isHovered = hovered === uf;

          return (
            <g key={uf}>
              <path
                d={path}
                fill={color}
                stroke={isHovered ? "oklch(0.75 0.22 27)" : "oklch(0.30 0.01 260)"}
                strokeWidth={isHovered ? 2 : 0.8}
                style={{
                  cursor: "pointer",
                  transition: "fill 0.2s, stroke 0.2s",
                  filter: isHovered ? "brightness(1.3)" : "none",
                }}
                onClick={() => onStateClick(uf)}
                onMouseEnter={() => setHovered(uf)}
                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                onMouseMove={(e) => handleMouseMove(e, uf)}
              />
              {/* State label */}
              {STATE_CENTROIDS[uf] && (
                <text
                  x={STATE_CENTROIDS[uf].x}
                  y={STATE_CENTROIDS[uf].y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={total > 0 ? "white" : "oklch(0.50 0.01 260)"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {uf}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && hovered && (
          <g>
            <rect
              x={Math.min(tooltip.x + 10, 560)}
              y={Math.max(tooltip.y - 50, 5)}
              width={130}
              height={54}
              rx={6}
              fill="oklch(0.14 0.015 260)"
              stroke="oklch(0.30 0.01 260)"
              strokeWidth={1}
            />
            <text
              x={Math.min(tooltip.x + 75, 625)}
              y={Math.max(tooltip.y - 32, 23)}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="white"
            >
              {dataMap.get(hovered)?.name ?? hovered}
            </text>
            <text
              x={Math.min(tooltip.x + 75, 625)}
              y={Math.max(tooltip.y - 16, 39)}
              textAnchor="middle"
              fontSize="9"
              fill="oklch(0.65 0.01 260)"
            >
              {dataMap.get(hovered)?.mayors ?? 0} prefeitos · {dataMap.get(hovered)?.councilors ?? 0} vereadores
            </text>
            <text
              x={Math.min(tooltip.x + 75, 625)}
              y={Math.max(tooltip.y - 3, 52)}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="oklch(0.70 0.22 27)"
            >
              {(dataMap.get(hovered)?.total ?? 0).toLocaleString("pt-BR")} eleitos
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 justify-center">
        <span className="text-xs text-muted-foreground">Menos eleitos</span>
        {["oklch(0.20 0.01 260)", "oklch(0.35 0.08 27)", "oklch(0.42 0.13 27)", "oklch(0.50 0.18 27)", "oklch(0.55 0.22 27)", "oklch(0.62 0.24 27)"].map((c, i) => (
          <div key={i} className="w-5 h-3 rounded-sm" style={{ background: c }} />
        ))}
        <span className="text-xs text-muted-foreground">Mais eleitos</span>
      </div>
    </div>
  );
}
