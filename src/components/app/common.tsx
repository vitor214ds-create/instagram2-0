import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { FolderPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveProject } from "@/hooks/use-active-project";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/data";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-soft-gradient px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-card shadow-card">
        <Icon className="size-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function BlockedNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export function ProjectPicker() {
  const { projects, current, select } = useActiveProject();
  if (!projects.length) return null;
  return (
    <Select value={current?.id ?? ""} onValueChange={select}>
      <SelectTrigger className="w-[220px] bg-card">
        <SelectValue placeholder="Escolha um perfil" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Renders children with the active project, or a helpful empty state if none exists. */
export function WithProject({ children }: { children: (p: Project) => ReactNode }) {
  const { current, isLoading } = useActiveProject();
  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  if (!current)
    return (
      <EmptyState
        icon={FolderPlus}
        title="Crie seu primeiro perfil"
        description="Tudo no InstaStudio AI é organizado por perfil planejado. Comece com um briefing simples."
        action={
          <Button variant="hero" asChild>
            <Link to="/">Criar perfil</Link>
          </Button>
        }
      />
    );
  return <>{children(current)}</>;
}

export function StatusPill({ tone, children }: { tone: "muted" | "primary" | "success" | "warning"; children: ReactNode }) {
  const map = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", map[tone])}>{children}</span>;
}
