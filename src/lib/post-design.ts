export type PostMode = "sales" | "designer" | "attention";
export type PostFormat = "portrait" | "square" | "story";
export type PostLayer = {
  id: string;
  type: "text" | "shape";
  value: string;
  x: number; y: number; width: number; height: number;
  fontSize: number; weight: number; color: string; fill: string;
  align: "left" | "center" | "right";
  radius: number; hidden: boolean;
};
export type PostDesign = {
  version: 1;
  mode: PostMode;
  format: PostFormat;
  background: string;
  accent: string;
  layers: PostLayer[];
};
export const MODES: { id: PostMode; title: string; subtitle: string; description: string; color: string; chip: string }[] = [
  { id: "sales", title: "Posts de Venda", subtitle: "Transforme interesse em ação", description: "Ofertas, benefícios e chamadas para ação com hierarquia comercial.", color: "#25144a", chip: "Conversão" },
  { id: "designer", title: "Editor Premium", subtitle: "Crie como um designer", description: "Composição editorial, camadas editáveis, cores e controle visual.", color: "#e9e4f6", chip: "Design livre" },
  { id: "attention", title: "Alta Atenção", subtitle: "Faça o público parar o scroll", description: "Ganchos, contraste e mensagens que despertam curiosidade sem clickbait enganoso.", color: "#f14968", chip: "Engajamento" },
];
export const FORMATS: Record<PostFormat,{width:number;height:number;label:string}> = {
  portrait: {width:1080,height:1350,label:"Feed 4:5"},
  square: {width:1080,height:1080,label:"Quadrado 1:1"},
  story: {width:1080,height:1920,label:"Story 9:16"},
};
const createLayer = (id:string,type:PostLayer["type"],value:string,x:number,y:number,width:number,height:number,fontSize:number,weight:number,color:string,fill="#ffffff",align:PostLayer["align"]="left",radius=26):PostLayer => ({id,type,value,x,y,width,height,fontSize,weight,color,fill,align,radius,hidden:false});
const validColor = (v:string | undefined,fallback:string) => v && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
export function createPostDesign(mode:PostMode, palette:string[], handle=""):PostDesign {
  const primary=validColor(palette[0],"#7755ef"), secondary=validColor(palette[1],"#e75baf");
  if(mode==="sales") return {version:1,mode,format:"portrait",background:"#20133f",accent:secondary,layers:[
    createLayer("tag","text","UMA NOVIDADE PARA VOCÊ",10,12,80,9,29,800,"#f0b6e5"),
    createLayer("headline","text","PARE DE PERDER TEMPO COM SOLUÇÕES COMPLICADAS",10,26,82,30,78,900,"#ffffff"),
    createLayer("body","text","Descubra uma maneira mais simples de dar o próximo passo.",10,58,80,15,39,500,"#ddd5f4"),
    createLayer("cta-bg","shape","",10,78,72,10,1,400,"#ffffff",primary,"left",23),
    createLayer("cta","text","CONHEÇA A SOLUÇÃO →",14,79.3,64,8,34,800,"#ffffff"),
    createLayer("handle","text",handle?"@"+handle.replace(/^@/,""):"SUA MARCA",10,92,80,5,23,600,"#c7b9e9"),
  ]};
  if(mode==="attention")return {version:1,mode,format:"portrait",background:"#f24c68",accent:"#f9e57c",layers:[
    createLayer("tag","text","ATENÇÃO A ESTE DETALHE",9,12,82,8,29,800,"#ffffff"),
    createLayer("headline","text","VOCÊ PODE ESTAR IGNORANDO ALGO IMPORTANTE",9,25,84,37,89,900,"#ffffff"),
    createLayer("highlight","shape","",9,69,80,1.5,1,400,"#ffffff","#f9e57c","left",10),
    createLayer("body","text","Entenda o que muda e descubra um próximo passo útil.",9,74,80,14,38,700,"#ffffff"),
    createLayer("handle","text",handle?"@"+handle.replace(/^@/,""):"COMPARTILHE ESSA IDEIA",9,94,82,5,22,700,"#ffffff"),
  ]};
  return {version:1,mode,format:"portrait",background:"#eeeaf5",accent:primary,layers:[
    createLayer("label","text","ESTÚDIO CRIATIVO  /  EDIÇÃO 01",11,12,82,7,28,800,"#6e6085"),
    createLayer("decoration","shape","",11,24,18,1.3,1,400,primary,primary,"left",9),
    createLayer("headline","text","UMA IDEIA FORTE MERECE UM DESIGN À ALTURA.",11,34,82,30,79,900,"#25203d"),
    createLayer("body","text","Transforme uma mensagem simples em uma composição memorável.",11,71,76,14,39,500,"#625c72"),
    createLayer("handle","text",handle?"@"+handle.replace(/^@/,""):"INSTASTUDIO AI",11,92,75,6,26,800,primary),
  ]};
}
export function isPostDesign(value:unknown):value is PostDesign {
  if(!value || typeof value!=="object")return false;
  const v=value as Partial<PostDesign>;
  return v.version===1 && (v.mode==="sales"||v.mode==="designer"||v.mode==="attention") &&
    (v.format==="portrait"||v.format==="square"||v.format==="story") &&
    typeof v.background==="string"&&typeof v.accent==="string"&&Array.isArray(v.layers)&&
    v.layers.every((layer:unknown)=>{
      if(!layer||typeof layer!=="object")return false;
      const l=layer as Partial<PostLayer>;
      const numeric=["x","y","width","height","fontSize","weight","radius"] as const;
      return typeof l.id==="string"&&(l.type==="text"||l.type==="shape")&&typeof l.value==="string"&&
      numeric.every(key=>typeof l[key]==="number"&&Number.isFinite(l[key])) &&
      typeof l.color==="string"&&typeof l.fill==="string"&&(l.align==="left"||l.align==="center"||l.align==="right")&&typeof l.hidden==="boolean";
    });
}
export function normalizeDesign(value:unknown,mode:PostMode,palette:string[],handle:string):PostDesign {
  return isPostDesign(value) ? value : createPostDesign(mode,palette,handle);
}
export function layerAtPoint(design:PostDesign,x:number,y:number):string | null {
  for(const layer of [...design.layers].reverse()){
    if(!layer.hidden&&x>=layer.x&&y>=layer.y&&x<=layer.x+layer.width&&y<=layer.y+layer.height)return layer.id;
  }
  return null;
}
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));
}
function fitText(ctx:CanvasRenderingContext2D,value:string,width:number,fontSize:number,weight:number):{size:number;lines:string[]} {
  const linesOf=(size:number)=>{
    ctx.font=String(weight)+" "+size+"px Inter, Arial, sans-serif";
    const lines:string[]=[];
    for(const paragraph of (value||"").split(/\n/)){
      let current="";
      for(const word of paragraph.split(/\s+/).filter(Boolean)){
        const attempt=current?current+" "+word:word;
        if(current&&ctx.measureText(attempt).width>width){lines.push(current);current=word;}
        else current=attempt;
      }
      if(current)lines.push(current);
    }
    return lines;
  };
  const size=Math.max(12,Math.min(160,fontSize));
  return {size,lines:linesOf(size)};
}
export function paintPost(ctx:CanvasRenderingContext2D,design:PostDesign,selected?:string|null){
 const {width:W,height:H}=FORMATS[design.format];
 ctx.clearRect(0,0,W,H);
 const gradient=ctx.createLinearGradient(0,0,W,H);
 gradient.addColorStop(0,design.background);
 gradient.addColorStop(1,design.mode==="sales"?"#3c2359":design.mode==="attention"?"#d52555":design.background);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
 if(design.mode==="sales"){
   ctx.fillStyle=design.accent;ctx.globalAlpha=.1;ctx.beginPath();ctx.arc(W*.9,H*.17,W*.42,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
   ctx.fillStyle=design.accent;ctx.fillRect(0,0,12,H);
 } else if(design.mode==="attention"){
   ctx.globalAlpha=.18;ctx.fillStyle=design.accent;ctx.beginPath();ctx.arc(W*.99,H*.92,W*.55,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
   ctx.fillStyle=design.accent;ctx.fillRect(0,0,W,18);
 }else{
   ctx.fillStyle=design.accent;ctx.fillRect(W*.11,H*.09,W*.12,8);
   ctx.strokeStyle="#c7c0d3";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.11,H*.89);ctx.lineTo(W*.89,H*.89);ctx.stroke();
 }
 for(const layer of design.layers){
   if(layer.hidden)continue;
   const x=W*layer.x/100,y=H*layer.y/100,w=W*layer.width/100,h=H*layer.height/100;
   ctx.save();
   if(layer.type==="shape"){
     ctx.fillStyle=layer.fill;rounded(ctx,x,y,w,h,layer.radius);ctx.fill();
   } else {
     ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
     ctx.textBaseline="top";ctx.fillStyle=layer.color;
     const parsed=fitText(ctx,layer.value,w-4,layer.fontSize,layer.weight);
     const lineHeight=parsed.size*1.18;
     let current=0;
     for(const line of parsed.lines){
       if(current+lineHeight>h+4)break;
       ctx.font=String(layer.weight)+" "+parsed.size+"px Inter, Arial, sans-serif";
       ctx.textAlign=layer.align;
       ctx.fillText(line,layer.align==="center"?x+w/2:layer.align==="right"?x+w-2:x+2,y+current,w-4);
       current+=lineHeight;
     }
   }
   ctx.restore();
   if(selected===layer.id){ctx.save();ctx.strokeStyle="#24d0ff";ctx.lineWidth=3;ctx.setLineDash([12,8]);ctx.strokeRect(x,y,w,h);ctx.restore();}
 }
}
export async function exportPostDesign(design:PostDesign):Promise<Blob>{
 const {width,height}=FORMATS[design.format];
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível preparar o editor.");
 paintPost(ctx,design);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Erro na exportação do PNG.")),"image/png"));
}
