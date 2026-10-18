import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const request=z.object({projectId:z.string().uuid(),contentId:z.string().uuid(),slideId:z.string().uuid(),prompt:z.string().min(10).max(1300)});
export const generateCarouselImage=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
.inputValidator((input:z.infer<typeof request>)=>request.parse(input))
.handler(async ({data,context})=>{
 const {supabase}=context;
 const {data:slide}=await supabase.from("content_slides").select("id").eq("project_id",data.projectId).eq("content_id",data.contentId).eq("id",data.slideId).maybeSingle();
 if(!slide)throw new Error("Slide indisponível ou sem permissão.");
 const {generateCarouselImagePng}=await import("./ai.server");
 const image=await generateCarouselImagePng("Fotografia editorial de altíssima qualidade, vertical, composição profissional para Instagram. "+data.prompt+". Nenhum texto, letras ou marcas d'água. Reserve área limpa para sobrepor tipografia depois.");
 const jpeg=image.mediaType==="image/jpeg";
 const path=data.projectId+"/carousel/"+data.contentId+"/"+data.slideId+"-"+crypto.randomUUID()+(jpeg?".jpg":".png");
 const {error}=await supabase.storage.from("media").upload(path,image.bytes,{contentType:jpeg?"image/jpeg":"image/png",upsert:false});
 if(error)throw new Error("Não foi possível armazenar a imagem: "+error.message);
 const {error:dbError}=await supabase.from("media_assets").insert({project_id:data.projectId,storage_path:path,kind:"image",label:"Imagem IA carrossel"});
 if(dbError){await supabase.storage.from("media").remove([path]);throw new Error(dbError.message);}
 return {path};
});
