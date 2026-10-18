import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileImage, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { mediaQuery } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";

const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "video/mp4"]);
const extByMime:Record<string,string> = {"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/svg+xml":"svg","video/mp4":"mp4"};
export function MediaLibrary({projectId}:{projectId:string}){
  const qc=useQueryClient();
  const picker=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false);
  const {data:assets=[],isLoading,error}=useQuery(mediaQuery(projectId));
  async function upload(file:File){
    if(!allowed.has(file.type)){toast.error("Formato não permitido. Use PNG, JPG, WEBP, SVG ou MP4.");return;}
    if(file.size>20*1024*1024){toast.error("O arquivo deve ter no máximo 20 MB.");return;}
    setBusy(true);
    const path=`${projectId}/${crypto.randomUUID()}.${extByMime[file.type]}`;
    try{
      const {error:uploadError}=await supabase.storage.from("media").upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError)throw uploadError;
      const {error:dbError}=await supabase.from("media_assets").insert({project_id:projectId,storage_path:path,kind:file.type.startsWith("video/")?"video":"image",label:file.name});
      if(dbError){await supabase.storage.from("media").remove([path]);throw dbError;}
      await qc.invalidateQueries({queryKey:["media",projectId]});toast.success("Arquivo enviado para biblioteca privada.");
    }catch(e){toast.error((e as Error).message)}finally{setBusy(false);if(picker.current)picker.current.value="";}
  }
  async function remove(id:string,path:string){
    if(!window.confirm("Excluir este arquivo da biblioteca?"))return;
    const {error:storageError}=await supabase.storage.from("media").remove([path]);
    if(storageError){toast.error(storageError.message);return;}
    const {error:dbError}=await supabase.from("media_assets").delete().eq("id",id).eq("project_id",projectId);
    if(dbError)toast.error(dbError.message);else{await qc.invalidateQueries({queryKey:["media",projectId]});toast.success("Arquivo excluído.");}
  }
  return <div className="space-y-6">
    <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-border bg-card p-6">
      <div><h3 className="text-lg font-bold">Seus arquivos de marca</h3><p className="mt-1 text-sm text-muted-foreground">Imagens, logotipos e vídeos do perfil atual. Arquivos privados, limite de 20 MB.</p></div>
      <input className="sr-only" ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4" aria-label="Selecionar arquivo" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f)}}/>
      <button type="button" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" onClick={()=>picker.current?.click()}>{busy?<Loader2 size={17} className="animate-spin"/>:<UploadCloud size={17}/>}Enviar mídia</button>
    </section>
    {isLoading&&<p className="text-sm text-muted-foreground">Carregando arquivos…</p>}
    {error&&<p className="text-sm text-destructive">{(error as Error).message}</p>}
    {!isLoading&&!assets.length&&<div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center"><FileImage className="mx-auto mb-4 size-12 text-primary"/><h3 className="font-semibold">Sua biblioteca está vazia</h3><p className="mt-2 text-sm text-muted-foreground">Envie imagens e vídeos para organizar os materiais do seu perfil.</p></div>}
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">{assets.map(asset=><article key={asset.id} className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid aspect-square place-items-center overflow-hidden bg-muted">{asset.kind==="video"?asset.url?<video className="max-h-full max-w-full" controls src={asset.url}/>:<FileImage/>:asset.url?<img alt={asset.label||"Mídia do projeto"} className="h-full w-full object-contain" loading="lazy" src={asset.url}/>:<FileImage/>}</div>
      <div className="p-4"><p className="truncate text-sm font-semibold" title={asset.label}>{asset.label||"Sem nome"}</p><p className="mt-1 text-xs text-muted-foreground">{asset.kind==="video"?"Vídeo":"Imagem"}</p><div className="mt-4 flex gap-2"><a aria-disabled={!asset.url} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted" href={asset.url??undefined} target="_blank" rel="noreferrer"><Download size={14}/>Abrir</a><button className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-destructive hover:bg-muted" aria-label="Excluir mídia" onClick={()=>remove(asset.id,asset.storage_path)}><Trash2 size={15}/></button></div></div>
    </article>)}</div>
  </div>;
}