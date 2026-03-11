import { useParams, Link } from "wouter";
import type { ElectedPolitician } from "@/types/psb";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, MapPin, TrendingUp, DollarSign, Building2, Info } from "lucide-react";
import { AffiliationBadge } from "@/components/AffiliationBadge";

const STATE_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

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

export default function MunicipioPage() {
  const params = useParams<{ uf: string; municipio: string }>();
  const uf = (params.uf ?? "").toUpperCase();
  const municipio = decodeURIComponent(params.municipio ?? "");
  const stateName = STATE_NAMES[uf] ?? uf;

  const { data: elected, isLoading } = trpc.psb.getMunicipalityElected.useQuery<ElectedPolitician[]>(
    { uf, municipio },
    { enabled: !!uf && !!municipio }
  );

  const { data: directory } = trpc.psb.getStateDirectory.useQuery(
    { uf },
    { enabled: !!uf }
  );

  const mayors = (elected as ElectedPolitician[] | undefined)?.filter((e: ElectedPolitician) => e.cargo === "PREFEITO") ?? [];
  const councilors = (elected as ElectedPolitician[] | undefined)?.filter((e: ElectedPolitician) => e.cargo === "VEREADOR") ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/psb/${uf}`}>
            <Button variant="ghost" size="sm" className="gap-1 text-gray-600">
              <ChevronLeft className="w-4 h-4" />
              {stateName}
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/psb" className="hover:text-red-600">Brasil</Link>
            <span>/</span>
            <Link href={`/psb/${uf}`} className="hover:text-red-600">{stateName}</Link>
            <span>/</span>
            <span className="text-gray-800 font-medium">{municipio}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Título */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">{municipio}</h1>
            <Badge className="bg-red-600 text-white">{uf}</Badge>
          </div>
          <p className="text-gray-500">PSB em {municipio} — Eleições 2024</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Prefeitos</p>
              <p className="text-3xl font-bold text-gray-900">{mayors.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Vereadores</p>
              <p className="text-3xl font-bold text-gray-900">{councilors.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Total de Eleitos</p>
              <p className="text-3xl font-bold text-gray-900">{(elected?.length ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Diretório Municipal */}
        <Card className="mb-6 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-600" />
              Diretório Municipal do PSB — {municipio}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Dados do diretório municipal não disponíveis</p>
                <p className="mt-1">
                  Para informações sobre o diretório municipal de {municipio}, entre em contato com o
                  Diretório Estadual do PSB {stateName}:
                  {directory?.phone && <> <strong>{directory.phone}</strong></>}
                  {directory?.email && <> — <strong>{directory.email}</strong></>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prefeitos */}
        {mayors.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-red-600" />
                Prefeito{mayors.length > 1 ? "s" : ""} — {municipio}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(mayors as ElectedPolitician[]).map((p: ElectedPolitician) => (
                  <Link key={p.sequencial} href={`/psb/politico/${p.sequencial}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer group">
                      <img
                        src={p.photoUrl}
                        alt={p.nameUrna}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 group-hover:border-red-300 transition-colors"
                        onError={e => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nameUrna)}&background=e11d48&color=fff&size=56`;
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
                          {p.nameUrna}
                        </p>
                        <p className="text-sm text-gray-500">{p.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-blue-500" />
                            {formatVotes(p.votes)} votos ({p.percentage.toFixed(1)}%)
                          </span>
                          {p.expense > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-green-500" />
                              {formatCurrency(p.expense)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-red-600 text-white">Eleito</Badge>
                        <AffiliationBadge sequencial={p.sequencial} originalParty="PSB" size="sm" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vereadores */}
        {councilors.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                Vereadores — {municipio} ({councilors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(councilors as ElectedPolitician[]).map((p: ElectedPolitician, i: number) => (
                  <Link key={p.sequencial} href={`/psb/politico/${p.sequencial}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all cursor-pointer group">
                      <div className="relative flex-shrink-0">
                        <img
                          src={p.photoUrl}
                          alt={p.nameUrna}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-orange-300 transition-colors"
                          onError={e => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nameUrna)}&background=f97316&color=fff&size=40`;
                          }}
                        />
                        <span className="absolute -top-1 -left-1 bg-orange-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate group-hover:text-orange-700 transition-colors text-sm">
                          {p.nameUrna}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatVotes(p.votes)} votos
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado vazio */}
        {!isLoading && (!elected || (elected as ElectedPolitician[]).length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum eleito PSB encontrado em {municipio}</p>
              <p className="text-gray-400 text-sm mt-1">nas eleições municipais de 2024</p>
              <Link href={`/psb/${uf}`}>
                <Button variant="outline" className="mt-4">
                  Ver todos os municípios de {stateName}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
