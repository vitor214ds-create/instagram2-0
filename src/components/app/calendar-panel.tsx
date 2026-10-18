import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Copy, ExternalLink, Plus, Trash2, Pencil, Clock } from "lucide-react";
import { toast } from "sonner";
import { calendarQuery, formatSP, spLocalToIso, type ContentItem } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";

const action = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const control = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
const secondary = "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-muted";

export function CalendarPanel({ projectId, content }: { projectId: string; content: ContentItem[] }) {
  const qc = useQueryClient();
  const { data: entries = [], isLoading, error } = useQuery(calendarQuery(projectId));
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [contentId, setContentId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["calendar", projectId] });

  function startEdit(item: (typeof entries)[number]) {
    setEditingId(item.id);
    setTitle(item.title);
    const d = new Date(item.scheduled_at);
    const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    setDate(fmt.format(d).replace(" ", "T"));
    setContentId(item.content_id ?? "");
    setNotes(item.notes);
  }
  function clear() { setEditingId(null); setTitle(""); setDate(""); setContentId(""); setNotes(""); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!date) { toast.error("Escolha uma data e horário."); return; }
    setSaving(true);
    try {
      const fields = { title: title.trim(), scheduled_at: spLocalToIso(date), content_id: contentId || null, notes };
      const query = editingId
        ? supabase.from("calendar_entries").update(fields).eq("id", editingId).eq("project_id", projectId)
        : supabase.from("calendar_entries").insert({ ...fields, project_id: projectId, status: "planned" });
      const { error } = await query;
      if (error) throw error;
      await refresh();
      toast.success(editingId ? "Publicação reagendada." : "Item adicionado ao calendário.");
      clear();
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  }

  async function setStatus(id: string, status: "planned" | "ready" | "published_manually" | "skipped") {
    if (status === "published_manually" && !window.confirm("Você já publicou manualmente no Instagram?")) return;
    const { error } = await supabase.from("calendar_entries").update({ status }).eq("id", id).eq("project_id", projectId);
    if (error) toast.error(error.message);
    else { await refresh(); toast.success(status === "published_manually" ? "Publicação manual registrada." : "Status salvo."); }
  }

  async function remove(id: string) {
    if (!window.confirm("Remover este item do calendário?")) return;
    const { error } = await supabase.from("calendar_entries").delete().eq("id", id).eq("project_id", projectId);
    if (error) toast.error(error.message);
    else { await refresh(); toast.success("Item removido."); }
  }

  return <div className="grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
    <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-bold"><CalendarDays size={21} className="text-primary" />{editingId ? "Editar agendamento" : "Planejar publicação"}</h3>
      <p className="text-sm text-muted-foreground">Este calendário organiza lembretes para postagem manual, sem publicar no Instagram.</p>
      <label className="block text-sm font-semibold">Título<input className={control + " mt-2"} required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Dica de alimentação" /></label>
      <label className="block text-sm font-semibold">Dia e horário (Brasília)<input className={control + " mt-2"} type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} /></label>
      <label className="block text-sm font-semibold">Conteúdo associado (opcional)<select className={control + " mt-2"} value={contentId} onChange={e => setContentId(e.target.value)}><option value="">Sem conteúdo associado</option>{content.map(c => <option key={c.id} value={c.id}>{c.title || "Sem título"} ({c.type})</option>)}</select></label>
      <label className="block text-sm font-semibold">Observações<textarea className={control + " mt-2 min-h-20"} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações para a publicação" /></label>
      <button disabled={saving} className={action + " w-full"}><Plus size={16} />{saving ? "Salvando…" : editingId ? "Salvar alterações" : "Adicionar ao calendário"}</button>
      {editingId && <button type="button" className={secondary + " w-full justify-center"} onClick={clear}>Cancelar edição</button>}
    </form>
    <section className="min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold">Próximas publicações</h3><p className="mt-1 text-sm text-muted-foreground">{entries.length} itens neste perfil</p></div><Clock className="text-primary" /></div>
      {isLoading && <p className="text-sm text-muted-foreground">Carregando calendário…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {!isLoading && entries.length === 0 && <div className="rounded-xl border border-dashed p-9 text-center text-sm text-muted-foreground">Nada planejado. Use o formulário para criar seu primeiro lembrete.</div>}
      <div className="space-y-3">{entries.map(item => {
        const linked = content.find(c => c.id === item.content_id);
        return <article key={item.id} className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{formatSP(item.scheduled_at)}</p><h4 className="mt-1 font-bold">{item.title}</h4><p className="mt-1 text-xs text-muted-foreground">{linked ? linked.type + " · " + (linked.title || "Conteúdo sem título") : "Sem arte vinculada"} · {item.status === "published_manually" ? "Publicado manualmente" : item.status === "ready" ? "Pronto" : item.status === "skipped" ? "Pulado" : "Planejado"}</p></div><div className="flex gap-1"><button aria-label="Editar evento" className={secondary} onClick={() => startEdit(item)}><Pencil size={14} /></button><button aria-label="Excluir evento" className={secondary} onClick={() => remove(item.id)}><Trash2 size={14} /></button></div></div>
          {item.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{item.notes}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {linked && <button className={secondary} onClick={async () => {try{await navigator.clipboard.writeText([linked.caption,linked.hashtags].filter(Boolean).join("\n\n"));toast.success("Legenda copiada.");}catch {toast.error("Não foi possível copiar.");}}}><Copy size={14}/>Copiar legenda</button>}
            <a className={secondary} href="https://www.instagram.com/" rel="noreferrer" target="_blank"><ExternalLink size={14}/>Abrir Instagram</a>
            {item.status !== "published_manually" && <button className={secondary} onClick={() => setStatus(item.id,"published_manually")}><CheckCircle2 size={14}/>Já publiquei</button>}
            <select aria-label={"Status de " + item.title} className={secondary} value={item.status} onChange={e => setStatus(item.id, e.target.value as "planned" | "ready" | "published_manually" | "skipped")}><option value="planned">Planejado</option><option value="ready">Pronto</option><option value="published_manually">Publicado manualmente</option><option value="skipped">Pulado</option></select>
          </div>
        </article>;
      })}</div>
    </section>
  </div>;
}