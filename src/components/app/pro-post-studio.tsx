import { useEffect,useRef,useState } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { ArrowLeft,Check,Copy,Download,Eye,EyeOff,Layers,Plus,Save,Trash2,WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ContentItem } from "@/lib/data";
import { MODES,FORMATS,createPostDesign,exportPostDesign,isPostDesign,paintPost,layerAtPoint,type PostMode,type PostDesign,type PostLayer,type PostFormat } from "@/lib/post-design";
import { downloadBlob } from "@/lib/carousel-design";

const field="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
const action="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const secondary="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50";
type DesignRow={content_id:string|null;layers:unknown;id:string};
function ArtPreview({design,selected,onSelect,onMove}:{design:PostDesign;selected:string|null;onSelect:(id:string|null)=>void;onMove:(id:string,dx:number,dy:number)=>void}){
 const ref=useRef<HTMLCanvasElement>(null);
 const drag=useRef<{id:string;x:number;y:number}|null>(null);
 useEffect(()=>{
  const c=ref.current;if(!c)return;const ctx=c.getContext("2d");if(ctx)paintPost(ctx,design,selected);
 },[design,selected]);
 const coords=(e:React.PointerEvent<HTMLCanvasElement>)=>{const rect=e.currentTarget.getBoundingClientRect();return {x:(e.clientX-rect.left)/rect.width*100,y:(e.clientY-rect.top)/rect.height*100};};
 return <canvas ref={ref} aria-label="Prévia visual editável do post" role="img" width={FORMATS[design.format].width} height={FORMATS[design.format].height} className="w-full touch-none rounded-xl shadow-2xl" style={{aspectRatio:FORMATS[design.format].width+"/"+FORMATS[design.format].height}} onPointerDown={e=>{const p=coords(e);const id=layerAtPoint(design,p.x,p.y);onSelect(id);if(id){drag.current={id,x:p.x,y:p.y};e.currentTarget.setPointerCapture(e.pointerId);}}} onPointerMove={e=>{if(!drag.current)return;const p=coords(e),old=drag.current;onMove(old.id,p.x-old.x,p.y-old.y);drag.current={...old,x:p.x,y:p.y};}} onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>drag.current=null}/>;
}
export function ProPostStudio({projectId,posts,palette,handle}:{projectId:string;posts:ContentItem[];palette:string[];handle:string}){
 const qc=useQueryClient();
 const [mode,setMode]=useState<PostMode|null>(null);
 const [design,setDesign]=useState<PostDesign|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [postId,setPostId]=useState<string|null>(null);
 const [title,setTitle]=useState("");
 const [caption,setCaption]=useState("");
 const [hashtags,setHashtags]=useState("");
 const [busy,setBusy]=useState(false);
 const [exporting,setExporting]=useState(false);
 const [dirty,setDirty]=useState(false);
 const {data:docs=[]}=useQuery({queryKey:["post-designs",projectId],queryFn:async()=>{
  const {data,error}=await supabase.from("design_documents").select("id,content_id,layers").eq("project_id",projectId).not("content_id","is",null);
  if(error)throw error;return data as DesignRow[];
 }});
 const refresh=()=>Promise.all([qc.invalidateQueries({queryKey:["content",projectId]}),qc.invalidateQueries({queryKey:["post-designs",projectId]})]);
 const fresh=(m:PostMode)=>{setMode(m);setDesign(createPostDesign(m,palette,handle));setPostId(null);setTitle("");setCaption("");setHashtags("");setSelected(null);setDirty(false);};
 const openPost=(item:ContentItem)=>{
  const stored=docs.find(x=>x.content_id===item.id);
  const loaded=stored&&isPostDesign(stored.layers)?stored.layers:createPostDesign("designer",palette,handle);
  setMode(loaded.mode);setDesign(loaded);setPostId(item.id);setTitle(item.title);setCaption(item.caption);setHashtags(item.hashtags);setSelected(null);setDirty(false);
 };
 const mutate=(modify:(d:PostDesign)=>PostDesign)=>{setDesign(previous=>previous?modify(previous):previous);setDirty(true);};
 const layer=design?.layers.find(l=>l.id===selected);
 const updateLayer=(updates:Partial<PostLayer>)=>mutate(d=>({...d,layers:d.layers.map(l=>l.id===selected?{...l,...updates}:l)}));
 const addLayer=(kind:"text"|"shape")=>{
  if(!design)return;
  const id=crypto.randomUUID();const item:PostLayer={id,type:kind,value:kind==="text"?"Novo texto":"",x:15,y:42,width:70,height:kind==="text"?16:8,fontSize:40,weight:700,color:"#ffffff",fill:design.accent,align:"left",radius:16,hidden:false};
  mutate(d=>({...d,layers:[...d.layers,item]}));setSelected(id);
 };
 const deleteLayer=()=>{if(!selected)return;mutate(d=>({...d,layers:d.layers.filter(l=>l.id!==selected)}));setSelected(null);};
 const reset=()=>{if(dirty&&!window.confirm("Descartar alterações não salvas?"))return;setMode(null);setDesign(null);setPostId(null);};
 async function save(){
  if(!design||!title.trim()){toast.error("Informe o nome do post.");return;}
  setBusy(true);
  try{
   const result=postId?await supabase.from("content_items").update({title:title.trim(),caption,hashtags}).eq("id",postId).eq("project_id",projectId).select("id").single():await supabase.from("content_items").insert({project_id:projectId,type:"post",status:"draft",title:title.trim(),caption,hashtags}).select("id").single();
   if(result.error)throw result.error;
   const id=result.data.id;
   const existing=docs.find(x=>x.content_id===id);
   const row={project_id:projectId,content_id:id,width:FORMATS[design.format].width,height:FORMATS[design.format].height,layers:JSON.parse(JSON.stringify(design))};
   const document=existing?await supabase.from("design_documents").update(row).eq("id",existing.id).eq("project_id",projectId):await supabase.from("design_documents").insert(row);
   if(document.error)throw document.error;
   setPostId(id);setDirty(false);await refresh();toast.success("Post e camadas salvos.");
  }catch(e){toast.error(e instanceof Error?e.message:"Falha ao salvar post.");}finally{setBusy(false);}
 }
 async function exportPng(){if(!design)return;setExporting(true);try{const blob=await exportPostDesign(design);downloadBlob(blob,"instastudio-"+(postId||"novo")+".png");toast.success("PNG exportado.");}catch(e){toast.error(e instanceof Error?e.message:"Falha ao exportar.");}finally{setExporting(false);}}
 async function removeItem(item:ContentItem){if(!window.confirm("Excluir post e suas camadas?"))return;const {error}=await supabase.from("content_items").delete().eq("id",item.id).eq("project_id",projectId);if(error)toast.error(error.message);else{await refresh();toast.success("Post excluído.");}}
 return <div className="space-y-6">
 {!design ? <>
  <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b1243] via-[#5631a3] to-[#cc578b] px-7 py-10 text-white md:px-10"><div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider"><WandSparkles size={15}/> Estúdio profissional</div><h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight md:text-4xl">Que tipo de post você quer criar?</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80">Escolha uma das três experiências. Cada opção abre um editor de imagem com cores, textos e camadas personalizáveis.</p></div>
  <div className="grid gap-5 md:grid-cols-3">{MODES.map(m=><button key={m.id} onClick={()=>fresh(m.id)} className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"><div className="relative flex aspect-[5/4] flex-col justify-between overflow-hidden p-7" style={{background:m.color,color:m.id==="designer"?"#26203d":"white"}}><div className="absolute -right-12 -top-14 size-48 rounded-full bg-purple-300/20"/><span className="relative z-10 self-start rounded-full border border-current/25 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">{m.chip}</span><span className="relative z-10 max-w-[85%] text-2xl font-black leading-tight">{m.subtitle}</span><span className="relative z-10 font-bold opacity-70">↗</span></div><div className="p-6"><h3 className="text-xl font-bold">{m.title}</h3><p className="mt-2 min-h-16 text-sm leading-relaxed text-muted-foreground">{m.description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Criar nesse estilo <ArrowLeft size={16} className="rotate-180"/></span></div></button>)}</div>
  <div><h3 className="mb-4 text-xl font-bold">Seus posts salvos</h3>{!posts.length&&<div className="rounded-2xl border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">Nenhum post ainda. Escolha um estilo acima para começar.</div>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{posts.map(post=><div className="rounded-2xl border border-border bg-card p-4" key={post.id}><h4 className="line-clamp-2 font-bold">{post.title}</h4><p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{post.caption||"Sem legenda"}</p><div className="mt-5 flex gap-2"><button className={action+" flex-1"} onClick={()=>openPost(post)}>Abrir editor</button><button aria-label="Excluir post" className={secondary+" text-destructive"} onClick={()=>removeItem(post)}><Trash2 size={16}/></button></div></div>)}</div></div>
 </> : <>
  <div className="flex flex-wrap items-center justify-between gap-3"><button className={secondary} onClick={reset}><ArrowLeft size={16}/>Voltar {dirty?"• Não salvo":""}</button><div className="flex flex-wrap gap-2"><button className={secondary} onClick={exportPng} disabled={exporting}><Download size={16}/>{exporting?"Exportando":"Baixar PNG"}</button><button className={action} onClick={save} disabled={busy}><Save size={16}/>{busy?"Salvando":"Salvar post"}</button></div></div>
  <div className="grid gap-5 xl:grid-cols-[minmax(225px,.85fr)_minmax(280px,1.35fr)_minmax(225px,.85fr)]">
  <section className="space-y-4 rounded-2xl border border-border bg-card p-5"><span className="text-xs font-bold uppercase tracking-widest text-primary">Conteúdo</span><h3 className="text-xl font-bold">{MODES.find(m=>m.id===mode)?.title}</h3><label className="block text-sm font-semibold">Nome do post<input className={field} value={title} maxLength={120} onChange={e=>{setTitle(e.target.value);setDirty(true)}} placeholder="Ex.: Oferta especial"/></label><label className="block text-sm font-semibold">Legenda<textarea className={field} rows={4} value={caption} onChange={e=>{setCaption(e.target.value);setDirty(true)}}/></label><label className="block text-sm font-semibold">Hashtags<input className={field} value={hashtags} onChange={e=>{setHashtags(e.target.value);setDirty(true)}}/></label><button className={secondary+" w-full"} onClick={async()=>{try{await navigator.clipboard.writeText([caption,hashtags].filter(Boolean).join("\n\n"));toast.success("Legenda copiada.");}catch{toast.error("Não foi possível copiar.");}}}><Copy size={16}/>Copiar legenda</button><hr className="border-border"/><div className="text-sm font-bold">Formato da arte</div><select className={field} aria-label="Formato do post" value={design.format} onChange={e=>mutate(d=>({...d,format:e.target.value as PostFormat}))}>{Object.entries(FORMATS).map(([key,f])=><option key={key} value={key}>{f.label}</option>)}</select><div className="text-sm font-bold">Cores de fundo e destaque</div><div className="grid grid-cols-2 gap-3">{(["background","accent"] as const).map(key=><label key={key} className="rounded-lg border p-2 text-xs capitalize">{key==="background"?"Fundo":"Destaque"}<input aria-label={key} className="mt-2 h-12 w-full" type="color" value={design[key]} onChange={e=>mutate(d=>({...d,[key]:e.target.value}))}/></label>)}</div><button className={secondary+" w-full"} onClick={()=>{if(confirm("Reiniciar composição desse estilo?")){setDesign(createPostDesign(design.mode,palette,handle));setSelected(null);setDirty(true);}}}>Reiniciar composição</button></section>
  <section className="min-w-0 rounded-2xl bg-[#eae8f3] p-5 dark:bg-[#29253a]"><div className="mb-5 flex flex-wrap items-center justify-between"><h3 className="text-xs font-black uppercase tracking-widest text-[#5e5871] dark:text-white">Prévia ao vivo · Arraste elementos</h3><span className="text-xs font-bold text-[#5e5871] dark:text-white">{FORMATS[design.format].width} × {FORMATS[design.format].height}</span></div><div className="mx-auto max-w-[500px]"><ArtPreview design={design} selected={selected} onSelect={setSelected} onMove={(id,dx,dy)=>mutate(d=>({...d,layers:d.layers.map(l=>l.id===id?{...l,x:Math.min(100-l.width,Math.max(0,l.x+dx)),y:Math.min(100-l.height,Math.max(0,l.y+dy))}:l)}))}/></div><p className="mt-4 text-center text-xs text-[#5e5871] dark:text-white/80">Toque para selecionar uma camada e arraste para reposicionar. Edite as propriedades ao lado.</p></section>
  <section className="space-y-4 rounded-2xl border border-border bg-card p-5"><span className="text-xs font-bold uppercase tracking-widest text-primary">Elementos</span><div className="flex gap-2"><button className={secondary+" flex-1"} onClick={()=>addLayer("text")}><Plus size={14}/>Texto</button><button className={secondary+" flex-1"} onClick={()=>addLayer("shape")}><Plus size={14}/>Forma</button></div><div className="max-h-52 space-y-2 overflow-auto">{[...design.layers].reverse().map(l=><div key={l.id} className={"flex items-center gap-2 rounded-lg border px-2 py-2 "+(selected===l.id?"border-primary bg-primary/5":"border-border")}><button className="min-w-0 flex-1 truncate text-left text-xs font-semibold" onClick={()=>setSelected(l.id)}>{l.type==="shape"?"▰ Forma":l.value||"Texto"}</button><button aria-label={l.hidden?"Mostrar camada":"Ocultar camada"} onClick={()=>mutate(d=>({...d,layers:d.layers.map(x=>x.id===l.id?{...x,hidden:!x.hidden}:x)}))}>{l.hidden?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>)}</div><hr className="border-border"/>{layer?<><h4 className="text-sm font-bold">Editar camada</h4>{layer.type==="text"&&<label className="block text-xs font-semibold">Texto<textarea className={field} rows={3} value={layer.value} onChange={e=>updateLayer({value:e.target.value})}/></label>}<div className="grid grid-cols-2 gap-3">{(["x","y","width","height"] as const).map(key=><label key={key} className="text-xs font-semibold">{key==="x"?"Posição X":key==="y"?"Posição Y":key==="width"?"Largura":"Altura"} (%)<input className={field} type="number" min={0} max={100} value={Math.round(layer[key]*10)/10} onChange={e=>updateLayer({[key]:Number(e.target.value)})}/></label>)}</div>{layer.type==="text"&&<><label className="block text-xs font-semibold">Tamanho da fonte<input type="range" className="mt-2 w-full" min={14} max={145} value={layer.fontSize} onChange={e=>updateLayer({fontSize:Number(e.target.value)})}/><span>{layer.fontSize}px</span></label><select aria-label="Peso da fonte" className={field} value={layer.weight} onChange={e=>updateLayer({weight:Number(e.target.value)})}><option value={400}>Normal</option><option value={600}>Seminegrito</option><option value={700}>Negrito</option><option value={900}>Extra negrito</option></select><select aria-label="Alinhamento" className={field} value={layer.align} onChange={e=>updateLayer({align:e.target.value as PostLayer["align"]})}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></>}<label className="block text-xs font-semibold">{layer.type==="text"?"Cor do texto":"Cor da forma"}<input className="mt-2 h-10 w-full" type="color" value={layer.type==="text"?layer.color:layer.fill} onChange={e=>updateLayer(layer.type==="text"?{color:e.target.value}:{fill:e.target.value})}/></label><button className={secondary+" w-full text-destructive"} onClick={deleteLayer}><Trash2 size={14}/>Excluir camada</button></>:<p className="rounded-xl bg-muted p-4 text-xs text-muted-foreground">Selecione uma camada na lista ou toque na imagem para editar.</p>}<p className="text-xs text-muted-foreground"><Layers size={13} className="mr-1 inline"/> Todos os elementos são editáveis. Salve para manter as alterações.</p></section>
  </div>
 </>}
 </div>;
}
