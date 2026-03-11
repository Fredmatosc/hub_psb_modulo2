import { useState } from "react";
import { trpc } from "@/lib/trpc";
import PSBLayout from "@/components/PSBLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Shield, Edit2, Save, X, Plus, Trash2, Loader2,
  Building2, Users, ChevronDown, ChevronUp, Search,
  CheckCircle, AlertTriangle, Info
} from "lucide-react";
import { toast } from "sonner";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type StateDir = {
  id: number; uf: string; stateName: string;
  presidentName?: string | null; presidentSequencial?: string | null;
  address?: string | null; city?: string | null; phone?: string | null;
  email?: string | null; website?: string | null;
  facebook?: string | null; instagram?: string | null; notes?: string | null;
};

type AffiliationOverride = {
  id: number; sequencial: string; candidateName?: string | null;
  uf?: string | null; originalParty?: string | null; currentParty?: string | null;
  currentPartyName?: string | null; changeDate?: string | null;
  notes?: string | null; verified?: boolean | null; status: string;
};

// ─── Componente de edição de diretório estadual ──────────────────────────────

function StateDirectoryRow({ dir, onSave }: { dir: StateDir; onSave: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...dir });
  const updateMutation = trpc.admin.updateStateDirectory.useMutation({
    onSuccess: () => {
      toast.success("Diretório atualizado com sucesso.");
      setEditing(false);
      onSave();
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  function handleSave() {
    updateMutation.mutate({
      uf: form.uf,
      presidentName: form.presidentName ?? undefined,
      presidentSequencial: form.presidentSequencial ?? undefined,
      address: form.address ?? undefined,
      city: form.city ?? undefined,
      phone: form.phone ?? undefined,
      email: form.email ?? undefined,
      website: form.website ?? undefined,
      facebook: form.facebook ?? undefined,
      instagram: form.instagram ?? undefined,
      notes: form.notes ?? undefined,
    });
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-card cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setEditing(!editing)}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-primary text-sm w-8">{dir.uf}</span>
          <span className="text-sm font-medium text-foreground">{dir.stateName}</span>
          {dir.presidentName && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Pres.: {dir.presidentName}
            </span>
          )}
          {!dir.presidentName && (
            <span className="text-xs text-orange-500 flex items-center gap-1">
              <AlertTriangle size={11} /> Sem presidente cadastrado
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </div>

      {/* Formulário de edição */}
      {editing && (
        <div className="p-4 border-t border-border bg-muted/10 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome do Presidente</label>
              <input
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.presidentName ?? ""}
                onChange={e => setForm(f => ({ ...f, presidentName: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sequencial do Presidente (TSE)</label>
              <input
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.presidentSequencial ?? ""}
                onChange={e => setForm(f => ({ ...f, presidentSequencial: e.target.value }))}
                placeholder="Ex: 280000614572"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Endereço</label>
              <input
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.address ?? ""}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Rua, número, bairro"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cidade</label>
              <input
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.city ?? ""}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Cidade"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
              <input
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.phone ?? ""}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(00) 0000-0000"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">E-mail</label>
              <input
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.email ?? ""}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@psb.org.br"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Website</label>
              <input
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.website ?? ""}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Instagram</label>
              <input
                className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                value={form.instagram ?? ""}
                onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                placeholder="@psbuf"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
            <textarea
              className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              value={form.notes ?? ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observações internas..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setEditing(false); setForm({ ...dir }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors text-foreground"
            >
              <X size={14} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Formulário de nova filiação ─────────────────────────────────────────────

function AffiliationForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    sequencial: "", candidateName: "", uf: "",
    originalParty: "PSB", currentParty: "", currentPartyName: "",
    changeDate: "", notes: "", verified: false,
  });
  const upsertMutation = trpc.admin.upsertAffiliationOverride.useMutation({
    onSuccess: () => {
      toast.success("Filiação registrada com sucesso.");
      onSave();
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  function handleSubmit() {
    if (!form.sequencial || !form.candidateName || !form.uf || !form.currentParty) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    upsertMutation.mutate(form);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Plus size={14} className="text-primary" /> Nova Mudança de Filiação
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Sequencial TSE *</label>
          <input
            className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={form.sequencial}
            onChange={e => setForm(f => ({ ...f, sequencial: e.target.value }))}
            placeholder="Ex: 280000614572"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nome do Candidato *</label>
          <input
            className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={form.candidateName}
            onChange={e => setForm(f => ({ ...f, candidateName: e.target.value }))}
            placeholder="Nome completo"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">UF *</label>
          <input
            className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase"
            value={form.uf}
            onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
            placeholder="SP"
            maxLength={2}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Partido Original *</label>
          <input
            className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={form.originalParty}
            onChange={e => setForm(f => ({ ...f, originalParty: e.target.value.toUpperCase() }))}
            placeholder="PSB"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Partido Atual *</label>
          <input
            className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={form.currentParty}
            onChange={e => setForm(f => ({ ...f, currentParty: e.target.value.toUpperCase() }))}
            placeholder="Ex: PT, PL, MDB..."
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Data da Mudança</label>
          <input
            type="date"
            className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={form.changeDate}
            onChange={e => setForm(f => ({ ...f, changeDate: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
        <textarea
          className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={2}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Fonte, contexto, links..."
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="verified"
          checked={form.verified}
          onChange={e => setForm(f => ({ ...f, verified: e.target.checked }))}
          className="rounded border-border"
        />
        <label htmlFor="verified" className="text-xs text-muted-foreground">Informação verificada</label>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors text-foreground"
        >
          <X size={14} /> Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={upsertMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {upsertMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

type TabId = "directories" | "affiliations";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("directories");
  const [searchDir, setSearchDir] = useState("");
  const [showAffiliationForm, setShowAffiliationForm] = useState(false);
  const { data: stateDirectories, isLoading: loadingDirs, refetch: refetchDirs } =
    trpc.admin.listStateDirectories.useQuery();

  const { data: affiliationsData, isLoading: loadingAff, refetch: refetchAff } =
    trpc.admin.listAffiliationOverrides.useQuery({ page: 1, pageSize: 100 });

  const deleteMutation = trpc.admin.deleteAffiliationOverride.useMutation({
    onSuccess: () => {
      toast.success("Registro removido.");
      refetchAff();
    },
    onError: (e) => toast.error(`Erro ao remover: ${e.message}`),
  });

  // Verifica se o usuário é admin
  if (authLoading) {
    return (
      <PSBLayout breadcrumbs={[{ label: "Admin" }]}>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      </PSBLayout>
    );
  }

  if (!user) {
    return (
      <PSBLayout breadcrumbs={[{ label: "Admin" }]}>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Shield size={40} className="text-muted-foreground" />
          <p className="text-muted-foreground">Faça login para acessar o painel administrativo.</p>
        </div>
      </PSBLayout>
    );
  }

  if (user.role !== "admin") {
    return (
      <PSBLayout breadcrumbs={[{ label: "Admin" }]}>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Shield size={40} className="text-red-500" />
          <p className="text-foreground font-medium">Acesso restrito</p>
          <p className="text-muted-foreground text-sm">Você não tem permissão para acessar esta área.</p>
        </div>
      </PSBLayout>
    );
  }

  const filteredDirs = (stateDirectories as StateDir[] | undefined ?? []).filter(d =>
    !searchDir ||
    d.uf.toLowerCase().includes(searchDir.toLowerCase()) ||
    d.stateName.toLowerCase().includes(searchDir.toLowerCase()) ||
    (d.presidentName ?? "").toLowerCase().includes(searchDir.toLowerCase())
  );

  const affiliations = (affiliationsData as { items: AffiliationOverride[]; total: number } | undefined)?.items ?? [];

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "directories", label: "Diretórios Estaduais", icon: Building2 },
    { id: "affiliations", label: "Mudanças de Filiação", icon: Users },
  ];

  return (
    <PSBLayout breadcrumbs={[{ label: "Painel Administrativo" }]}>
      <div className="p-4 lg:p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Painel Administrativo
            </h1>
            <p className="text-xs text-muted-foreground">Gestão de dados do Hub PSB</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Diretórios Estaduais */}
        {activeTab === "directories" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Buscar estado..."
                  value={searchDir}
                  onChange={e => setSearchDir(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {filteredDirs.length} de {(stateDirectories as StateDir[] | undefined ?? []).length} estados
              </span>
            </div>

            {loadingDirs ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDirs.map(dir => (
                  <StateDirectoryRow key={dir.uf} dir={dir} onSave={() => refetchDirs()} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Mudanças de Filiação */}
        {activeTab === "affiliations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Registre políticos eleitos pelo PSB que mudaram de partido, ou que entraram no PSB após eleição por outro partido.
                </p>
              </div>
              {!showAffiliationForm && (
                <button
                  onClick={() => setShowAffiliationForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Plus size={14} /> Adicionar
                </button>
              )}
            </div>

            {showAffiliationForm && (
              <AffiliationForm
                onSave={() => { setShowAffiliationForm(false); refetchAff(); }}
                onCancel={() => setShowAffiliationForm(false)}
              />
            )}

            {loadingAff ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : affiliations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Users size={32} />
                <p className="text-sm">Nenhuma mudança de filiação registrada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {affiliations.map(aff => (
                  <div key={aff.id} className="flex items-start justify-between gap-3 bg-card border border-border rounded-lg p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">{aff.candidateName}</span>
                        <span className="text-xs text-muted-foreground">{aff.uf}</span>
                        {aff.status === "left_psb" ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 border border-orange-300">
                            ⚠️ Saiu do PSB → {aff.currentParty}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">
                            ✅ Entrou no PSB (era {aff.originalParty})
                          </span>
                        )}
                        {aff.verified && (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <CheckCircle size={11} /> Verificado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Seq: {aff.sequencial}</span>
                        {aff.changeDate && <span>Data: {aff.changeDate}</span>}
                        {aff.notes && <span className="truncate max-w-xs">{aff.notes}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Remover registro de ${aff.candidateName}?`)) {
                          deleteMutation.mutate({ id: aff.id });
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PSBLayout>
  );
}
