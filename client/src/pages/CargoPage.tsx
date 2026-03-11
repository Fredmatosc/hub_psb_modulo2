import { useState, useMemo } from "react";
import type { ElectedPolitician, ElectedListResult } from "@/types/psb";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Search, Users, TrendingUp, DollarSign, MapPin, ChevronLeft as Prev, ChevronRight as Next } from "lucide-react";

const CARGO_LABELS: Record<string, string> = {
  "PREFEITO": "Prefeitos",
  "VEREADOR": "Vereadores",
  "DEPUTADO FEDERAL": "Deputados Federais",
  "DEPUTADO ESTADUAL": "Deputados Estaduais",
  "SENADOR": "Senadores",
  "GOVERNADOR": "Governadores",
};

const CARGO_YEARS: Record<string, number> = {
  "PREFEITO": 2024,
  "VEREADOR": 2024,
  "DEPUTADO FEDERAL": 2022,
  "DEPUTADO ESTADUAL": 2022,
  "SENADOR": 2022,
  "GOVERNADOR": 2022,
};

const STATE_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

const UF_LIST = Object.entries(STATE_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

function formatCurrency(val: number) {
  if (!val) return "R$ 0";
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}K`;
  return `R$ ${val.toFixed(0)}`;
}

function formatVotes(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return String(val);
}

export default function CargoPage() {
  const params = useParams<{ cargo: string }>();
  const cargoSlug = params.cargo ?? "DEPUTADO FEDERAL";
  const cargo = decodeURIComponent(cargoSlug).toUpperCase();

  const [page, setPage] = useState(1);
  const [ufFilter, setUfFilter] = useState("");
  const [orderBy, setOrderBy] = useState<"votes" | "costPerVote" | "name">("votes");
  const [search, setSearch] = useState("");
  const pageSize = 50;

  const { data, isLoading } = trpc.psb.getNationalElected.useQuery<ElectedListResult>({
    cargo,
    page,
    pageSize,
    uf: ufFilter || undefined,
    orderBy,
  });

  const filtered = useMemo(() => {
    if (!data?.items) return [] as ElectedPolitician[];
    if (!search) return data.items as ElectedPolitician[];
    const s = search.toLowerCase();
    return (data.items as ElectedPolitician[]).filter((p: ElectedPolitician) =>
      p.name.toLowerCase().includes(s) ||
      p.nameUrna.toLowerCase().includes(s) ||
      p.municipality?.toLowerCase().includes(s)
    );
  }, [data?.items, search]);

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const label = CARGO_LABELS[cargo] ?? cargo;
  const ano = CARGO_YEARS[cargo] ?? 2024;
  const isMunicipal = ["PREFEITO", "VEREADOR"].includes(cargo);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/psb">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-600">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/psb" className="hover:text-red-600">Brasil</Link>
            <span>/</span>
            <span className="text-gray-800 font-medium">{label}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Título */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {label} do PSB — Eleições {ano}
          </h1>
          <p className="text-gray-500 mt-1">
            {data ? `${data.total.toLocaleString("pt-BR")} eleitos em todo o Brasil` : "Carregando..."}
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={ufFilter} onValueChange={v => { setUfFilter(v === "TODOS" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os estados</SelectItem>
                  {UF_LIST.map(([uf, name]) => (
                    <SelectItem key={uf} value={uf}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={orderBy} onValueChange={v => setOrderBy(v as typeof orderBy)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="votes">Mais votados</SelectItem>
                  <SelectItem value="costPerVote">Custo por voto</SelectItem>
                  <SelectItem value="name">Nome (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {(filtered as ElectedPolitician[]).map((p: ElectedPolitician, i: number) => (
                <Link key={p.sequencial} href={`/psb/politico/${p.sequencial}`}>
                  <Card className="hover:shadow-md hover:border-red-200 transition-all cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {/* Foto */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={p.photoUrl}
                            alt={p.nameUrna}
                            className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 group-hover:border-red-300 transition-colors"
                            onError={e => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nameUrna)}&background=e11d48&color=fff&size=56`;
                            }}
                          />
                          <span className="absolute -top-1 -left-1 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {(page - 1) * pageSize + i + 1}
                          </span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate group-hover:text-red-700 transition-colors">
                            {p.nameUrna}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className="text-xs px-1.5 py-0 border-red-200 text-red-700">
                              {p.uf}
                            </Badge>
                            {isMunicipal && p.municipality && (
                              <span className="text-xs text-gray-500 truncate">{p.municipality}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-blue-500" />
                              {formatVotes(p.votes)} votos
                            </span>
                            {p.expense > 0 && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-green-500" />
                                {formatCurrency(p.expense)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Prev className="w-4 h-4" />
                  Anterior
                </Button>
                <span className="text-sm text-gray-600">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                  <Next className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
