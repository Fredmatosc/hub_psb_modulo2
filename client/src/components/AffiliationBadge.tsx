/**
 * AffiliationBadge — Exibe o status de filiação partidária de um político
 * 
 * Três estados possíveis:
 * - "psb_original": Eleito pelo PSB e permanece no PSB (verde, discreto — padrão)
 * - "joined_psb": Eleito por outro partido, hoje no PSB (azul — migrou para o PSB)
 * - "left_psb": Eleito pelo PSB, hoje em outro partido (vermelho — saiu do PSB)
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { UserCheck, UserMinus, UserPlus, Loader2 } from "lucide-react";

export type AffiliationStatus = "psb_original" | "joined_psb" | "left_psb";

interface AffiliationBadgeProps {
  sequencial: string;
  originalParty?: string; // Partido na época da eleição (do banco externo)
  size?: "sm" | "md";
  showLabel?: boolean;
}

/**
 * Badge que busca automaticamente o status de filiação via tRPC
 */
export function AffiliationBadge({ sequencial, originalParty, size = "sm", showLabel = true }: AffiliationBadgeProps) {
  const { data: override, isLoading } = trpc.psb.getAffiliationOverride.useQuery(
    { sequencial },
    { staleTime: 1000 * 60 * 60 } // 1h de cache
  );

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  // Sem override: eleito pelo PSB e permanece (padrão)
  if (!override) {
    if (originalParty && originalParty !== 'PSB') {
      // Eleito por outro partido, sem override = não está no PSB atualmente
      // (não deveria aparecer na listagem, mas mostramos o partido original)
      return null;
    }
    // Eleito pelo PSB e permanece
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`
                border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400
                ${size === "sm" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs px-2 py-0.5"}
                gap-1 font-medium
              `}
            >
              <UserCheck className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {showLabel && "PSB"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Eleito pelo PSB — permanece no partido</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Entrou no PSB (eleito por outro partido, hoje no PSB)
  if (override.status === "joined_psb") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`
                border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400
                ${size === "sm" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs px-2 py-0.5"}
                gap-1 font-medium
              `}
            >
              <UserPlus className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {showLabel && (size === "sm" ? "Migrou→PSB" : "Migrou para o PSB")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Eleito pelo {override.originalParty} — hoje filiado ao PSB
              {override.changeDate && ` (desde ${override.changeDate})`}
            </p>
            {override.notes && <p className="text-xs text-muted-foreground mt-1">{override.notes}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Saiu do PSB (eleito pelo PSB, hoje em outro partido)
  if (override.status === "left_psb") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`
                border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400
                ${size === "sm" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs px-2 py-0.5"}
                gap-1 font-medium
              `}
            >
              <UserMinus className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {showLabel && (size === "sm" ? `→${override.currentParty}` : `Migrou para ${override.currentParty}`)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Eleito pelo PSB — hoje filiado ao {override.currentPartyName ?? override.currentParty}
              {override.changeDate && ` (desde ${override.changeDate})`}
            </p>
            {override.notes && <p className="text-xs text-muted-foreground mt-1">{override.notes}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}

/**
 * Versão estática do badge (sem query tRPC, recebe os dados diretamente)
 * Útil quando os dados de filiação já foram carregados em batch
 */
interface StaticAffiliationBadgeProps {
  status: AffiliationStatus;
  originalParty?: string;
  currentParty?: string;
  currentPartyName?: string;
  changeDate?: string | null;
  notes?: string | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function StaticAffiliationBadge({
  status,
  originalParty,
  currentParty,
  currentPartyName,
  changeDate,
  notes,
  size = "sm",
  showLabel = true,
}: StaticAffiliationBadgeProps) {
  if (status === "psb_original") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`
                border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400
                ${size === "sm" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs px-2 py-0.5"}
                gap-1 font-medium cursor-default
              `}
            >
              <UserCheck className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {showLabel && "PSB"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Eleito pelo PSB — permanece no partido</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "joined_psb") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`
                border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400
                ${size === "sm" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs px-2 py-0.5"}
                gap-1 font-medium cursor-default
              `}
            >
              <UserPlus className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {showLabel && (size === "sm" ? "Migrou→PSB" : "Migrou para o PSB")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Eleito pelo {originalParty} — hoje filiado ao PSB
              {changeDate && ` (desde ${changeDate})`}
            </p>
            {notes && <p className="text-xs text-muted-foreground mt-1">{notes}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "left_psb") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`
                border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400
                ${size === "sm" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs px-2 py-0.5"}
                gap-1 font-medium cursor-default
              `}
            >
              <UserMinus className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {showLabel && (size === "sm" ? `→${currentParty}` : `Migrou para ${currentParty}`)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Eleito pelo PSB — hoje filiado ao {currentPartyName ?? currentParty}
              {changeDate && ` (desde ${changeDate})`}
            </p>
            {notes && <p className="text-xs text-muted-foreground mt-1">{notes}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
