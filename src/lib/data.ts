import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type BrandKit = Tables<"brand_kits">;
export type Suggestion = Tables<"name_suggestions">;
export type ContentItem = Tables<"content_items">;
export type Slide = Tables<"content_slides">;
export type Highlight = Tables<"highlights">;
export type CalendarEntry = Tables<"calendar_entries">;
export type Job = Tables<"generation_jobs">;
export type MediaAsset = Tables<"media_assets">;
export type ContentType = "post" | "carousel" | "reel";

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async () =>
      check(await supabase.from("projects").select("*").order("updated_at", { ascending: false })),
  });

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: async () => check(await supabase.from("projects").select("*").eq("id", id).maybeSingle()),
  });

export const brandKitQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["brand_kit", projectId],
    queryFn: async (): Promise<BrandKit | null> => {
      const {data, error}=await supabase.from("brand_kits").select("*").eq("project_id", projectId).maybeSingle();
      if(error) throw new Error(error.message);
      return data as BrandKit | null;
    },
  });

export const suggestionsQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["suggestions", projectId],
    queryFn: async () =>
      check(
        await supabase
          .from("name_suggestions")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
      ),
  });

export const contentQuery = (projectId: string, type?: ContentType) =>
  queryOptions({
    queryKey: ["content", projectId, type ?? "all"],
    queryFn: async () => {
      let q = supabase.from("content_items").select("*, content_slides(*)").eq("project_id", projectId);
      if (type) q = q.eq("type", type);
      return check(await q.order("created_at", { ascending: true }));
    },
  });

export const highlightsQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["highlights", projectId],
    queryFn: async () =>
      check(
        await supabase.from("highlights").select("*").eq("project_id", projectId).order("position"),
      ),
  });

export const calendarQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["calendar", projectId],
    queryFn: async () =>
      check(
        await supabase
          .from("calendar_entries")
          .select("*")
          .eq("project_id", projectId)
          .order("scheduled_at"),
      ),
  });

export const jobsQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["jobs", projectId],
    queryFn: async () =>
      check(
        await supabase
          .from("generation_jobs")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(30),
      ),
  });

export const mediaQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["media", projectId],
    queryFn: async () => {
      const rows = check(
        await supabase
          .from("media_assets")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
      );
      return Promise.all(
        rows.map(async (r) => {
          const { data } = await supabase.storage.from("media").createSignedUrl(r.storage_path, 3600);
          return { ...r, url: data?.signedUrl ?? null };
        }),
      );
    },
  });

export const statsQuery = () =>
  queryOptions({
    queryKey: ["stats"],
    queryFn: async () => {
      const count = async (table: "projects" | "content_items" | "calendar_entries" | "highlights") => {
        const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
        if (error) throw new Error(error.message);
        return count ?? 0;
      };
      const now = new Date().toISOString();
      const upcoming = check(
        await supabase
          .from("calendar_entries")
          .select("*, projects(title)")
          .gte("scheduled_at", now)
          .order("scheduled_at")
          .limit(5),
      );
      const byStatus = check(await supabase.from("content_items").select("status, type"));
      const [projects, content, calendar, highlights] = await Promise.all([
        count("projects"),
        count("content_items"),
        count("calendar_entries"),
        count("highlights"),
      ]);
      return { projects, content, calendar, highlights, upcoming, byStatus };
    },
  });

export const PROJECT_OBJECTIVES = [
  { value: "vender", label: "Vender um produto" },
  { value: "crescer", label: "Crescer seguidores" },
  { value: "autoridade", label: "Construir autoridade" },
  { value: "leads", label: "Captar leads" },
] as const;

export const CONTENT_STATUS: Record<string, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  approved: "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
};

export const CALENDAR_STATUS: Record<string, string> = {
  planned: "Planejado",
  ready: "Pronto p/ publicar",
  published_manually: "Publicado manualmente",
  skipped: "Pulado",
};

export const TZ = "America/Sao_Paulo";
export function formatSP(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, dateStyle: "medium", timeStyle: "short", ...opts }).format(
    new Date(iso),
  );
}
/** Converts a "YYYY-MM-DDTHH:mm" value entered in São Paulo time to a UTC ISO string (Brazil has no DST since 2019). */
export function spLocalToIso(local: string) {
  return new Date(`${local}:00-03:00`).toISOString();
}
