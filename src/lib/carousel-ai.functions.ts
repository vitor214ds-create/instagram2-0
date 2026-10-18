import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requestSchema=z.object({projectId:z.string().uuid(),mode:z.enum(["sales","education","attention"]),topic:z.string().min(5).max(500),count:z.number().int().min(3).max(10)});
export const createVisualCarousel=createServerFn({method:"POST"})
.middleware([requireSupabaseAuth])
.inputValidator((input:z.infer<typeof requestSchema>)=>requestSchema.parse(input))
.handler(async ({data,context})=>{
 const {supabase}=context;
 const {data:project}=await supabase.from("projects").select("*").eq("id",data.projectId).single();
 if(!project)throw new Error("Projeto não encontrado.");
 const {data:kit}=await supabase.from("brand_kits").select("*").eq("project_id",data.projectId).maybeSingle();
 const schema=z.object({title:z.string(),caption:z.string(),hashtags:z.string(),slides:z.array(z.object({heading:z.string(),body:z.string(),visualPrompt:z.string(),background:z.string(),composition:z.string()})).min(3).max(10)});
 const {generateStructured}=await import("./ai.server");
 const details=JSON.stringify({topic:data.topic,mode:data.mode,count:data.count,niche:project.niche,audience:project.audience,objective:project.objective,brief:project.brief,brand:kit?.name,palette:kit?.palette});
 const result=await generateStructured(schema,"Você é diretor de arte e copywriter profissional. Escreva em português claro. Sem alegações inventadas, promessas irreais ou depoimentos fictícios. Crie carrosséis visuais com apelo editorial e legibilidade. Mode sales vende com benefícios e CTA; education ensina; attention atrai curiosidade honesta.","Crie exatamente a quantidade de slides pedida, com texto curto, capa atrativa, progressão e CTA final, legenda envolvente e 5 a 8 hashtags. Para cada slide informe um visualPrompt detalhado descrevendo fotografia ou ilustração premium SEM NENHUMA PALAVRA NA IMAGEM, cores de fundo e composição que reserve área livre para tipografia. Dados: "+details);
 if(result.slides.length!==data.count)throw new Error("A IA retornou uma quantidade inesperada de slides. Tente novamente.");
 const {data:item,error}=await supabase.from("content_items").insert({project_id:data.projectId,type:"carousel",title:result.title.slice(0,120),caption:result.caption,hashtags:result.hashtags,status:"draft"}).select("id").single();
 if(error)throw error;
 const {data:slides,error:slideError}=await supabase.from("content_slides").insert(result.slides.map((s,i)=>({project_id:data.projectId,content_id:item.id,position:i,heading:s.heading.slice(0,140),body:s.body.slice(0,300)}))).select("id");
 if(slideError){await supabase.from("content_items").delete().eq("id",item.id);throw slideError;}
 const specs=result.slides.map((s,i)=>({slideId:slides?.[i]?.id,prompt:s.visualPrompt,background:s.background,composition:s.composition}));
 const {error:docError}=await supabase.from("design_documents").insert({project_id:data.projectId,content_id:item.id,width:1080,height:1350,layers:{version:2,mode:data.mode,slides:specs}});
 if(docError){await supabase.from("content_items").delete().eq("id",item.id);throw docError;}
 return {contentId:item.id,slides:result.slides.length};
});
