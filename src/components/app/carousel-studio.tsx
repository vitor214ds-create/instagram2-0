import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Copy, Download, Plus, Save, Sparkles, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ContentItem, Slide } from "@/lib/data";
import { DEFAULT_SLIDES, TEMPLATES, downloadBlob, slidePng, templateColors, zipPngs, type CarouselFormat, type CarouselTemplate, type SlideDraft } from "@/lib/carousel-design";

type Item = ContentItem & {content_slides?: Slide[]};
const button="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50";
const primary="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const field="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function Visual({slide,index,total,template,palette,handle,format}:{slide:SlideDraft;index:number;total:number;template:CarouselTemplate;palette:string[];handle:string;format:CarouselFormat}){
 const c=templateColors(template,palette);
 const bg=template==="aurora"?"linear-gradient(145deg,"+c.background+","+c.accent+","+c.secondary+")":template==="sunset"?"linear-gradient(140deg,"+c.background+","+c.secondary+")":c.background;
 return <div className={"relative flex w-full flex-col overflow-hidden rounded-2xl p-[9%] shadow-2xl "+(format==="portrait"?"aspect-[4/5]":"aspect-square")} style={{background:bg,color:c.ink}}>
   <div className="absolute -right-[24%] -top-[18%] h-[62%] w-[85%] rounded-full opacity-20" style={{background:c.accent}}/>
   <div className="relative z-10 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[.18em]"><span>{index===0?"Abertura":index===total-1?"Próximo passo":"Ideia "+(index+1)}</span><span>{index+1} / {total}</span></div>
   <div className="relative z-10 my-auto py-8"><div className="mb-5 h-1.5 w-16 rounded-full" style={{background:c.accent}}/><h3 className="break-words text-[clamp(18px,3vw,38px)] font-black leading-tight">{slide.heading||"Seu título aqui"}</h3><p className="mt-5 whitespace-pre-wrap break-words text-[clamp(10px,1.5vw,18px)] leading-relaxed" style={{color:c.subdued}}>{slide.body||"Escreva o conteúdo deste slide."}</p></div>
   <div className="relative z-10 flex justify-between gap-2 border-t border-current/20 pt-3 text-[10px] font-bold"><span>{handle?"@"+handle.replace(/^@/,""):"INSTASTUDIO AI"}</span><span>DESLIZE →</span></div>
 </div>;
}
export function CarouselStudio({projectId,items,palette,handle}:{projectId:string;items:Item[];palette:string[];handle:string}){
 const qc=useQueryClient();
 const [editing,setEditing]=useState(false);
 const [id,setId]=useState<string|null>(null);
 const [title,setTitle]=useState("");
 const [caption,setCaption]=useState("");
 const [hashtags,setHashtags]=useState("");
 const [slides,setSlides]=useState<SlideDraft[]>(DEFAULT_SLIDES.map(s=>({...s})));
 const [active,setActive]=useState(0);
 const [template,setTemplate]=useState<CarouselTemplate>("aurora");
 const [format,setFormat]=useState<CarouselFormat>("portrait");
 const [busy,setBusy]=useState(false);
 const [exporting,setExporting]=useState(false);
 const slide=slides[active]??slides[0]!;
 const reset=()=>{setId(null);setTitle("");setCaption("");setHashtags("");setSlides(DEFAULT_SLIDES.map(s=>({...s})));setActive(0);setEditing(true);};
 const open=(item:Item)=>{setId(item.id);setTitle(item.title);setCaption(item.caption);setHashtags(item.hashtags);const existing=[...(item.content_slides??[])].sort((a,b)=>a.position-b.position);setSlides(existing.length?existing.map(s=>({id:s.id,heading:s.heading,body:s.body})):[{heading:item.title,body:""},...DEFAULT_SLIDES.slice(1,3)]);setActive(0);setEditing(true);};
 const refresh=()=>qc.invalidateQueries({queryKey:["content",projectId]});
 const change=(key:"heading"|"body",value:string)=>setSlides(old=>old.map((s,i)=>i===active?{...s,[key]:value}:s));
 const add=()=>{if(slides.length>=10)return;setSlides(old=>[...old,{heading:"Novo slide",body:"Adicione aqui o conteúdo."}]);setActive(slides.length);};
 const remove=()=>{if(slides.length<=3)return;setSlides(old=>old.filter((_,i)=>i!==active));setActive(Math.max(0,active-1));};
 const move=(direction:number)=>{const next=active+direction;if(next<0||next>=slides.length)return;setSlides(old=>{const result=[...old];[result[active],result[next]]=[result[next]!,result[active]!];return result;});setActive(next);};
 async function save(){
  if(!title.trim()||slides.some(s=>!s.heading.trim())){toast.error("Informe o título do carrossel e de todos os slides.");return;}
  setBusy(true);
  try{
   const parent=id?await supabase.from("content_items").update({title:title.trim(),caption,hashtags}).eq("id",id).eq("project_id",projectId).select("id").single():await supabase.from("content_items").insert({project_id:projectId,title:title.trim(),caption,hashtags,type:"carousel",status:"draft"}).select("id").single();
   if(parent.error)throw parent.error;
   const contentId=parent.data.id;
   const rows=slides.map((s,i)=>({...(s.id?{id:s.id}:{}),content_id:contentId,project_id:projectId,heading:s.heading.trim(),body:s.body,position:i}));
   const saved=await supabase.from("content_slides").upsert(rows,{onConflict:"id"});
   if(saved.error)throw saved.error;
   if(id){const {data:prior,error:readErr}=await supabase.from("content_slides").select("id").eq("content_id",id).eq("project_id",projectId);if(readErr)throw readErr;const keep=new Set(slides.map(s=>s.id).filter(Boolean));const gone=(prior??[]).map(s=>s.id).filter(s=>!keep.has(s));if(gone.length){const deleted=await supabase.from("content_slides").delete().eq("project_id",projectId).eq("content_id",contentId).in("id",gone);if(deleted.error)throw deleted.error;}}
   await refresh();toast.success("Carrossel salvo.");setEditing(false);
  }catch(e){toast.error(e instanceof Error?e.message:"Falha ao salvar.");}finally{setBusy(false);}
 }
 async function exportOne(){
  try{const blob=await slidePng(slide,{index:active,total:slides.length,template,palette,handle,format});downloadBlob(blob,"carrossel-slide-"+(active+1)+".png");toast.success("PNG exportado.");}catch(e){toast.error(e instanceof Error?e.message:"Falha ao exportar.");}
 }
 async function exportZip(){
  setExporting(true);try{const files=[];for(let i=0;i<slides.length;i++)files.push({name:"slide-"+String(i+1).padStart(2,"0")+".png",blob:await slidePng(slides[i]!,{index:i,total:slides.length,template,palette,handle,format})});downloadBlob(await zipPngs(files),"carrossel-instastudio.zip");toast.success("Carrossel exportado.");}catch(e){toast.error(e instanceof Error?e.message:"Falha na exportação.");}finally{setExporting(false);}
 }
 async function deleteItem(item:Item){if(!confirm("Excluir carrossel e seus slides?"))return;const {error}=await supabase.from("content_items").delete().eq("id",item.id).eq("project_id",projectId);if(error)toast.error(error.message);else{await refresh();toast.success("Carrossel excluído.");}}
 if(!editing)return <div className="space-y-6">
   <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1741] via-[#4e2d89] to-[#b94e9f] p-8 text-white shadow-xl md:p-12"><div className="flex flex-wrap items-center justify-between gap-5"><div><span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold"><Sparkles size={12} className="mr-1 inline"/>ESTÚDIO CRIATIVO</span><h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">Carrosséis que impressionam.</h2><p className="mt-3 max-w-xl text-sm text-violet-100">Templates premium, slides editáveis, prévia ao vivo e exportação completa.</p></div><button onClick={reset} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#332067]"><Plus size={16} className="mr-2 inline"/>Criar carrossel</button></div></div>
   {!items.length&&<div className="rounded-2xl border border-dashed bg-card p-14 text-center"><h3 className="text-xl font-bold">Seu primeiro carrossel começa aqui</h3><p className="mt-2 text-sm text-muted-foreground">Crie entre 3 e 10 slides com uma identidade consistente.</p><button onClick={reset} className={primary+" mt-5"}><Plus size={16}/>Criar agora</button></div>}
   <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(item=><div className="rounded-2xl border bg-card p-3 shadow-sm" key={item.id}><Visual slide={{heading:item.content_slides?.[0]?.heading||item.title,body:item.content_slides?.[0]?.body||""}} index={0} total={item.content_slides?.length||1} template="aurora" palette={palette} handle={handle} format="portrait"/><div className="p-3"><h3 className="line-clamp-1 font-bold">{item.title}</h3><p className="mb-4 mt-1 text-xs text-muted-foreground">{item.content_slides?.length||0} slides</p><div className="flex gap-2"><button className={primary+" flex-1"} onClick={()=>open(item)}>Editar <ArrowRight size={15}/></button><button className={button+" text-destructive"} aria-label="Excluir carrossel" onClick={()=>deleteItem(item)}><Trash2 size={15}/></button></div></div></div>)}</div>
 </div>;
 return <div className="space-y-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><button className={button} onClick={()=>setEditing(false)}><ArrowLeft size={15}/>Voltar</button><div className="flex flex-wrap gap-2"><button className={button} onClick={exportOne}><Download size={15}/>Baixar slide</button><button className={button} onClick={exportZip} disabled={exporting}><Download size={15}/>{exporting?"Exportando…":"Baixar ZIP"}</button><button className={primary} onClick={save} disabled={busy}><Save size={15}/>{busy?"Salvando…":"Salvar carrossel"}</button></div></div>
   <div className="grid gap-5 xl:grid-cols-[minmax(210px,.9fr)_minmax(300px,1.4fr)_minmax(210px,.9fr)]">
    <section className="space-y-5 rounded-2xl border bg-card p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">01 · Conteúdo</p><h3 className="mt-2 text-xl font-bold">Sua narrativa</h3></div><label className="block text-sm font-semibold">Título do carrossel<input className={field} value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label><label className="block text-sm font-semibold">Título do slide<input className={field} value={slide.heading} onChange={e=>change("heading",e.target.value)} maxLength={170}/></label><label className="block text-sm font-semibold">Texto<textarea className={field} rows={5} value={slide.body} onChange={e=>change("body",e.target.value)} maxLength={700}/></label><label className="block text-sm font-semibold">Legenda<textarea className={field} rows={4} value={caption} onChange={e=>setCaption(e.target.value)}/></label><label className="block text-sm font-semibold">Hashtags<input className={field} value={hashtags} onChange={e=>setHashtags(e.target.value)}/></label><button className={button+" w-full"} onClick={async()=>{try{await navigator.clipboard.writeText([caption,hashtags].filter(Boolean).join("\n\n"));toast.success("Legenda copiada.");}catch{toast.error("Não foi possível copiar.");}}}><Copy size={15}/>Copiar legenda</button></section>
    <section className="min-w-0 rounded-2xl border bg-[#eae8f4] p-5 dark:bg-[#282538]"><div className="mb-5 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest text-[#5b5470] dark:text-violet-100">02 · Prévia ao vivo</span><select value={format} onChange={e=>setFormat(e.target.value as CarouselFormat)} aria-label="Proporção" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#272037]"><option value="portrait">4:5 · Retrato</option><option value="square">1:1 · Quadrado</option></select></div><div className="mx-auto max-w-[470px]"><Visual slide={slide} index={active} total={slides.length} template={template} palette={palette} handle={handle} format={format}/></div><div className="mt-5 flex items-center justify-between gap-3"><button className={button} disabled={active===0} onClick={()=>setActive(v=>v-1)}><ArrowLeft size={15}/>Anterior</button><span className="text-sm font-bold">{active+1} de {slides.length}</span><button className={button} disabled={active===slides.length-1} onClick={()=>setActive(v=>v+1)}>Próximo<ArrowRight size={15}/></button></div><div className="mt-4 flex gap-2 overflow-x-auto pb-2">{slides.map((s,i)=><button key={i} onClick={()=>setActive(i)} className={(active===i?"border-primary":"border-transparent")+" w-20 shrink-0 rounded-lg border-2 p-1 text-left"}><div className="flex aspect-[4/5] items-center rounded-md p-2 text-[9px] font-bold" style={{background:templateColors(template,palette).background,color:templateColors(template,palette).ink}}><span className="line-clamp-3">{s.heading}</span></div></button>)}</div></section>
    <section className="space-y-5 rounded-2xl border bg-card p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">03 · Identidade</p><h3 className="mt-2 text-xl font-bold">Direção de arte</h3></div><div className="grid grid-cols-2 gap-2">{TEMPLATES.map(t=><button key={t.id} className={(template===t.id?"border-primary ring-2 ring-primary/15":"border-border")+" rounded-xl border p-2 text-left"} onClick={()=>setTemplate(t.id)}><div className="mb-2 h-14 rounded-lg" style={{background:templateColors(t.id,palette).background}}/><span className="text-xs font-bold">{t.name}</span><p className="text-[10px] text-muted-foreground">{t.description}</p></button>)}</div><div className="border-t pt-4"><div className="mb-3 flex justify-between"><b className="text-sm">Slides</b><span className="text-xs text-primary">{slides.length}/10</span></div><div className="max-h-72 space-y-2 overflow-auto">{slides.map((s,i)=><button key={i} onClick={()=>setActive(i)} className={(active===i?"border-primary bg-primary/5":"border-border")+" flex w-full items-center gap-2 rounded-lg border p-3 text-left"}><span className="grid size-6 shrink-0 place-items-center rounded bg-muted text-xs font-bold">{i+1}</span><span className="line-clamp-1 min-w-0 flex-1 text-xs font-semibold">{s.heading}</span>{active===i&&<Check size={14} className="text-primary"/>}</button>)}</div><button className={button+" mt-3 w-full"} onClick={add} disabled={slides.length>=10}><Plus size={15}/>Adicionar slide</button><div className="mt-2 grid grid-cols-3 gap-2"><button className={button} aria-label="Mover antes" disabled={active===0} onClick={()=>move(-1)}><ChevronUp size={16}/></button><button className={button} aria-label="Mover depois" disabled={active===slides.length-1} onClick={()=>move(1)}><ChevronDown size={16}/></button><button className={button+" text-destructive"} aria-label="Excluir slide" disabled={slides.length<=3} onClick={remove}><Trash2 size={16}/></button></div></div></section>
   </div>
 </div>;
}
