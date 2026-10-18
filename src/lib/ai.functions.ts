import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const GENERATION_KINDS = ["names", "highlights", "posts", "carousels", "reels"] as const;
export type GenerationKind = (typeof GENERATION_KINDS)[number];

export const KIND_LABEL: Record<GenerationKind, string> = {
  names: "20 nomes + 5 bios",
  highlights: "8 destaques com roteiro",
  posts: "9 posts iniciais",
  carousels: "3 carrosséis (3–10 slides)",
  reels: "5 roteiros de Reels",
};

export const aiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ text: Boolean(process.env["LOVABLE_API_KEY"]), image: false, meta: false }));

const RULES = `Você é estrategista de conteúdo para Instagram no Brasil. Escreva em português do Brasil.
Regras obrigatórias: não invente métricas, depoimentos, resultados ou números de clientes. Em saúde/nutrição/fitness nunca prometa emagrecimento garantido, cura ou resultados específicos; recomende acompanhamento profissional quando pertinente. Em finanças não prometa ganhos. Não afirme que um @ está disponível. Use o CTA informado quando fizer sentido.`;

export const generateForProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; kind: GenerationKind }) =>
    z.object({ projectId: z.string().uuid(), kind: z.enum(GENERATION_KINDS) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    if (error || !project) throw new Error("Projeto não encontrado.");
    const { data: kit } = await supabase.from("brand_kits").select("*").eq("project_id", project.id).maybeSingle();

    const { data: job, error: jobErr } = await supabase
      .from("generation_jobs")
      .insert({ project_id: project.id, kind: data.kind, status: "running" })
      .select()
      .single();
    if (jobErr) throw new Error(jobErr.message);

    const finish = (status: "succeeded" | "failed" | "blocked", err?: string) =>
      supabase
        .from("generation_jobs")
        .update({ status, error: err ?? null, finished_at: new Date().toISOString() })
        .eq("id", job.id);

    const brief = `Projeto: ${project.title}
Briefing: ${project.brief}
Nicho: ${project.niche}
Produto/serviço: ${project.product}
Objetivo: ${project.objective}
Público: ${project.audience}
Tom de voz: ${project.tone || kit?.voice || "não definido"}
Nome da marca: ${kit?.name || "ainda não definido"}
Slogan: ${kit?.slogan || "-"}
CTA/link: ${kit?.cta || project.cta_link || "-"}`;

    try {
      const { generateStructured, AiError } = await import("./ai.server");
      void AiError;
      let inserted = 0;
      if (data.kind === "names") {
        const schema = z.object({
          names: z.array(z.object({ name: z.string(), handle: z.string() })),
          bios: z.array(
            z.object({ category: z.enum(["vendas", "autoridade", "crescimento", "relacionamento", "leads"]), text: z.string() }),
          ),
        });
        const out = await generateStructured(
          schema,
          RULES,
          `${brief}\n\nGere exatamente 20 nomes de perfil variados (curtos, memoráveis, estilos diferentes) com sugestão de @ (sem o @, apenas letras minúsculas, números, ponto ou underline, até 30 caracteres). Gere exatamente 5 bios de até 150 caracteres, uma para cada categoria: vendas, autoridade, crescimento, relacionamento, leads.`,
        );
        if (out.names.length < 10 || out.bios.length < 5) throw new Error("A IA retornou menos itens que o esperado.");
        const rows = [
          ...out.names.slice(0, 20).map((n) => ({
            project_id: project.id,
            kind: "name",
            value: n.name.trim(),
            handle: n.handle.replace(/[^a-z0-9._]/gi, "").toLowerCase().slice(0, 30),
          })),
          ...out.bios.slice(0, 5).map((b) => ({ project_id: project.id, kind: "bio", category: b.category, value: b.text.slice(0, 150) })),
        ];
        const r = await supabase.from("name_suggestions").insert(rows);
        if (r.error) throw new Error(r.error.message);
        inserted = rows.length;
      } else if (data.kind === "highlights") {
        const schema = z.object({
          items: z.array(z.object({ title: z.string(), icon: z.string(), script: z.string() })),
        });
        const out = await generateStructured(
          schema,
          RULES,
          `${brief}\n\nGere exatamente 8 destaques do Instagram. title: até 15 caracteres. icon: um nome de ícone Lucide simples em inglês minúsculo (ex.: star, heart, book-open, gift, message-circle, help-circle, sparkles, user). script: roteiro de 3 a 5 stories para o destaque, um por linha.`,
        );
        const { count } = await supabase.from("highlights").select("id", { count: "exact", head: true }).eq("project_id", project.id);
        const rows = out.items.slice(0, 8).map((h, i) => ({
          project_id: project.id,
          title: h.title.slice(0, 15),
          icon: h.icon,
          script: h.script,
          position: (count ?? 0) + i,
        }));
        const r = await supabase.from("highlights").insert(rows);
        if (r.error) throw new Error(r.error.message);
        inserted = rows.length;
      } else {
        const type = data.kind === "posts" ? "post" : data.kind === "carousels" ? "carousel" : "reel";
        const n = type === "post" ? 9 : type === "carousel" ? 3 : 5;
        const schema = z.object({
          items: z.array(
            z.object({
              title: z.string(),
              caption: z.string(),
              hashtags: z.string(),
              script: z.string(),
              slides: z.array(z.object({ heading: z.string(), body: z.string() })),
            }),
          ),
        });
        const extra =
          type === "post"
            ? "title: frase de impacto curta para a arte (até 60 caracteres). script: deixe vazio. slides: lista vazia."
            : type === "carousel"
              ? "title: título da capa. slides: entre 3 e 10 slides com heading curto e body de até 200 caracteres. script: vazio."
              : "title: gancho da capa do Reel. script: roteiro com cenas numeradas, falas e texto na tela, 15–45 segundos. slides: lista vazia.";
        const out = await generateStructured(
          schema,
          RULES,
          `${brief}\n\nGere exatamente ${n} itens do tipo ${type}. ${extra} caption: legenda completa com CTA. hashtags: 5 a 10 hashtags separadas por espaço.`,
        );
        const { data: maxRow } = await supabase
          .from("content_items")
          .select("feed_position")
          .eq("project_id", project.id)
          .order("feed_position", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        let pos = (maxRow?.feed_position ?? -1) + 1;
        for (const item of out.items.slice(0, n)) {
          const { data: ci, error: e1 } = await supabase
            .from("content_items")
            .insert({
              project_id: project.id,
              type,
              title: item.title,
              caption: item.caption,
              hashtags: item.hashtags,
              script: type === "reel" ? item.script : "",
              feed_position: pos++,
            })
            .select()
            .single();
          if (e1) throw new Error(e1.message);
          if (type === "carousel") {
            const slides = item.slides.slice(0, 10).map((s, i) => ({
              content_id: ci.id,
              project_id: project.id,
              position: i,
              heading: s.heading,
              body: s.body,
            }));
            if (slides.length) {
              const r = await supabase.from("content_slides").insert(slides);
              if (r.error) throw new Error(r.error.message);
            }
          }
          inserted++;
        }
      }
      await finish("succeeded");
      return { ok: true as const, inserted };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha desconhecida";
      const status = (e as { status?: number }).status;
      await finish(status === 401 || status === 402 || status === 403 ? "blocked" : "failed", msg);
      return { ok: false as const, error: msg };
    }
  });
