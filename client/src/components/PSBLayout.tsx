import { Link, useLocation } from "wouter";
import { ChevronRight, Home, Map, Users, LogOut, Menu, X, Shield } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PSBLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
}

export default function PSBLayout({ children, breadcrumbs = [], title }: PSBLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user } = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const navItems = [
    { href: "/", label: "Visão Nacional", icon: Map },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg psb-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">40</span>
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-semibold text-sm leading-tight truncate">Perfil PSB</p>
            <p className="text-sidebar-foreground/50 text-xs truncate">Análise Eleitoral</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }
                `}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* PSB Info */}
        <div className="mx-3 mt-2 p-3 rounded-lg bg-sidebar-accent border border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 mb-1 font-medium uppercase tracking-wide">Partido</p>
          <p className="text-sidebar-foreground font-semibold text-sm">Partido Socialista Brasileiro</p>
          <p className="text-sidebar-foreground/50 text-xs mt-0.5">Número: 40</p>
          <a
            href="https://psb40.org.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-1 block"
          >
            psb40.org.br ↗
          </a>
        </div>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border">
          {user ? (
            <div className="flex flex-col gap-2">
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    location === "/admin"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Shield size={13} />
                  Painel Admin
                </Link>
              )}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sidebar-foreground text-xs font-medium truncate">{user.name ?? "Usuário"}</p>
                  <p className="text-sidebar-foreground/50 text-xs truncate">{user.email ?? ""}</p>
                </div>
                <button
                  onClick={() => logout.mutate()}
                  className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
                  title="Sair"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : (
            <a
              href={getLoginUrl()}
              className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            >
              <Users size={14} />
              Entrar
            </a>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm min-w-0 flex-1">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home size={13} />
              <span className="hidden sm:inline">Brasil</span>
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                <ChevronRight size={13} className="text-muted-foreground/50 flex-shrink-0" />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium truncate max-w-[120px] sm:max-w-[200px]">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>

          {/* PSB badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs font-medium">PSB 40</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
