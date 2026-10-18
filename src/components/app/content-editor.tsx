import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportPostPng } from "@/lib/export-png";
import type { ContentItem } from "@/lib/data";

const field = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const outlined = "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted";

export function ContentEditor({projectId,kind,content,palette,handle,headingFont,bodyFont}:{
  projectId:string;
  kind:"post"|"carousel"|"reel";
  content:ContentItem[];
  palette:string[];
  handle:string;
  headingFont:string;
  bodyFont:string;
}){
  const qc=useQueryClient();
  const [id,setId]=useState<string|null>(null);
  const [title,setTitle]=useState("");
  const [caption,setCaption]=useState("");
  const [hashtags,setHashtags]=useState("");
  const [script,setScript]=useState("");
  const [busy,setBusy]=useState(false);
  const [open,setOpen]=useState(false);
  const items=content.filter(c=>c.type===kind);
  const refresh=()=>qc.invalidateQueries({queryKey:["content",projectId]});
  function edit(item:ContentItem){setId(item.id);setTitle(item.title);setCaption(item.caption);setHashtags(item.hashtags);setScript(item.script);setOpen(true);}
  function reset(){setId(null);setTitle("");setCaption("");setHashtags("");setScript("");setOpen(false);}
  async function save(e:FormEvent){e.preventDefault();setBusy(true);try{
    const values={title:title.trim(),caption,hashtags,script};
    const result=id?await supabase.from("content_items").update(values).eq("id",id).eq("project_id",projectId):await supabase.from("content_items").insert({...values,project_id:projectId,type:kind,status:"draft"});
    if(result.error)throw result.error;await refresh();toast.success(id?"Conteúdo atualizado.":"Rascunho criado.");reset();
  }catch(e){toast.error((e as Error).message)}finally{setBusy(false)}}
  async function remove(item:ContentItem){
    if(!window.confirm("Excluir este conteúdo e os slides associados?"))return;
    const {error}=await supabase.from("content_items").delete().eq("id",item.id).eq("project_id",projectId);
    if(error)toast.error(error.message);else{await refresh();toast.success("Conteúdo excluído.");}
  }
  async function download(item:ContentItem){try{
    await exportPostPng({title:item.title,handle,palette,headingFont,bodyFont,filename:`${kind}-${item.id}.png`,width:1080,height:kind==="reel"?1920:1350});toast.success("PNG exportado.");
  }catch(e){toast.error((e as Error).message)}}
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{items.length} {items.length===1?"conteúdo salvo":"conteúdos salvos"} neste projeto</p><button className={primary} onClick={()=>{reset();setOpen(true)}}><Plus size={16}/>Criar manualmente</button></div>
    {open&&<div className="grid gap-6 rounded-2xl border border-primary/20 bg-card p-6 shadow-sm xl:grid-cols-2">
      <form onSubmit={save} className="space-y-4">
        <div><h3 className="text-xl font-extrabold">{id?"Editar conteúdo":"Criar rascunho"}</h3><p className="mt-1 text-sm text-muted-foreground">Texto editável e salvo no banco. Sem necessidade de créditos de IA.</p></div>
        <label className="block text-sm font-semibold">Título<input required maxLength={160} className={field+" mt-2"} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Escreva o título da arte"/></label>
        <label className="block text-sm font-semibold">Legenda<textarea className={field+" mt-2 min-h-28"} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Escreva a legenda"/></label>
        <label className="block text-sm font-semibold">Hashtags<input className={field+" mt-2"} value={hashtags} onChange={e=>setHashtags(e.target.value)} placeholder="#conteudo #marketing"/></label>
        {kind==="reel"&&<label className="block text-sm font-semibold">Roteiro<textarea className={field+" mt-2 min-h-28"} value={script} onChange={e=>setScript(e.target.value)} placeholder="Gancho, cenas e narração"/></label>}
        {kind==="carousel"&&<p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">A criação manual de slides individuais ficará disponível no editor de carrosséis. Este formulário salva a capa e a legenda.</p>}
        <div className="flex flex-wrap gap-2"><button disabled={busy} className={primary}>{busy?"Salvando…":"Salvar rascunho"}</button><button type="button" className={outlined} onClick={reset}>Cancelar</button></div>
      </form>
      <div className="flex items-center justify-center"><div className="flex aspect-[4/5] w-full max-w-xs items-center justify-center rounded-xl p-9 text-center text-2xl font-black text-white shadow-lg" style={{background:`linear-gradient(140deg,${palette[0]||"#6D28D9"},${palette[1]||"#DB2777"})`}}>{title||"A prévia do seu conteúdo aparecerá aqui"}</div></div>
    </div>}
    {!items.length&&<div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Nenhum conteúdo nesta categoria. Crie seu primeiro rascunho ou gere ideias com IA.</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(item=><article className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm" key={item.id}>
      <div className="mb-4 flex aspect-[4/5] items-center justify-center rounded-xl p-7 text-center text-xl font-bold text-white" style={{background:`linear-gradient(140deg,${palette[0]||"#6D28D9"},${palette[1]||"#DB2777"})`}}>{item.title}</div>
      <p className="text-sm font-bold">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.caption||"Sem legenda"}</p>
      <div className="mt-4 grid grid-cols-2 gap-2"><button className={outlined} onClick={()=>edit(item)}><Pencil size={14}/>Editar</button><button className={outlined} onClick={()=>download(item)}><Download size={14}/>PNG</button><button className={outlined} onClick={async()=>{try{await navigator.clipboard.writeText([item.caption,item.hashtags].filter(Boolean).join("\n\n"));toast.success("Legenda copiada.")}catch{toast.error("Não foi possível copiar")}}}><Copy size={14}/>Copiar</button><button className={outlined+" text-destructive"} onClick={()=>remove(item)}><Trash2 size={14}/>Excluir</button></div>
    </article>)}</div>
  </div>
}