export type CarouselTemplate = "aurora" | "noir" | "paper" | "sunset" | "editorial";
export type CarouselFormat = "portrait" | "square";
export type SlideDraft = { id?: string; heading: string; body: string; imagePath?: string; imageUrl?: string; visualPrompt?: string };

export const TEMPLATES: { id: CarouselTemplate; name: string; description: string }[] = [
  { id: "aurora", name: "Aurora", description: "Gradientes e luz suave" },
  { id: "noir", name: "Noir", description: "Impacto e contraste" },
  { id: "paper", name: "Editorial", description: "Claro e sofisticado" },
  { id: "sunset", name: "Vibrante", description: "Energia e movimento" },
  { id: "editorial", name: "Minimal", description: "Tipografia protagonista" },
];

export const DEFAULT_SLIDES: SlideDraft[] = [
  { heading: "Sua ideia começa aqui", body: "Apresente a mensagem principal do seu carrossel." },
  { heading: "Por que isso importa?", body: "Descreva o problema ou a necessidade do seu público." },
  { heading: "O que você precisa saber", body: "Compartilhe a informação mais importante." },
  { heading: "Coloque em prática", body: "Ofereça um próximo passo claro e útil." },
  { heading: "Gostou desse conteúdo?", body: "Salve este post e compartilhe com alguém que vai gostar." },
];

const safe = (color: string | undefined, fallback: string) =>
  color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;

export function templateColors(template: CarouselTemplate, palette: string[]) {
  const primary = safe(palette[0], "#7255f3");
  const secondary = safe(palette[1], "#d45bae");
  if (template === "noir") return { background: "#111124", accent: primary, secondary, ink: "#ffffff", subdued: "#c8c4e4" };
  if (template === "paper") return { background: "#f8f5ee", accent: primary, secondary, ink: "#242035", subdued: "#675f70" };
  if (template === "sunset") return { background: "#ef4a70", accent: "#f6e05e", secondary: "#fe985c", ink: "#ffffff", subdued: "#fff1f0" };
  if (template === "editorial") return { background: "#f1f1f7", accent: primary, secondary, ink: "#141324", subdued: "#5c5870" };
  return { background: "#201245", accent: primary, secondary, ink: "#ffffff", subdued: "#e9e0ff" };
}

export function formatDimensions(format: CarouselFormat) {
  return format === "square" ? { width: 1080, height: 1080 } : { width: 1080, height: 1350 };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrappedLines(ctx: CanvasRenderingContext2D, input: string, width: number): string[] {
  const words = input.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) { line = word; continue; }
    if (ctx.measureText(line + " " + word).width > width) {
      lines.push(line);
      line = word;
    } else line += " " + word;
  }
  if (line) lines.push(line);
  return lines;
}
function fittedText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number, maxSize: number, minSize: number, fontFamily: string) {
  let size = maxSize;
  let lines: string[] = [];
  for (; size >= minSize; size -= 2) {
    ctx.font = "800 " + size + "px " + fontFamily;
    lines = wrappedLines(ctx, text, maxWidth);
    if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= maxWidth)) break;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1] ?? "";
    while (last.length && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return { size: Math.max(minSize, size), lines };
}
export function paintCarouselSlide(ctx: CanvasRenderingContext2D, slide: SlideDraft, options: {
  index: number; total: number; template: CarouselTemplate; palette: string[];
  handle: string; format: CarouselFormat; image?: HTMLImageElement;
}) {
  const { width: W, height: H } = formatDimensions(options.format);
  const colors = templateColors(options.template, options.palette);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, W, H);

  if (options.template === "aurora" || options.template === "sunset") {
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, colors.background);
    gradient.addColorStop(0.52, colors.accent);
    gradient.addColorStop(1, colors.secondary);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(W * .92, H * .13, W * .34, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .13;
    ctx.beginPath(); ctx.arc(W * .02, H * .94, W * .48, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (options.template === "noir") {
    ctx.fillStyle = colors.accent; ctx.fillRect(0, 0, 18, H);
    ctx.globalAlpha = .15;
    ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.arc(W * .9, H * .82, W * .42, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (options.template === "paper") {
    ctx.fillStyle = "#ebe4d8";
    roundedRect(ctx, 66, 74, W - 132, H - 148, 34); ctx.fill();
    ctx.fillStyle = colors.accent; ctx.fillRect(108, 116, 115, 10);
  } else {
    ctx.fillStyle = colors.accent; ctx.fillRect(80, 90, 104, 13);
    ctx.strokeStyle = "#ccccdf"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(80, H - 165); ctx.lineTo(W - 80, H - 165); ctx.stroke();
  }

  if (options.image) {
    const img = options.image;
    const x = W * 0.48, y = H * 0.26, w = W * 0.47, h = H * 0.48;
    ctx.save();
    ctx.beginPath();ctx.roundRect(x,y,w,h,40);ctx.clip();
    const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
    const iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;
    ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore();
    ctx.fillStyle=colors.background;
    ctx.globalAlpha=0.82;ctx.fillRect(0,0,W*0.57,H);ctx.globalAlpha=1;
  }
  const margin = options.template === "paper" ? 142 : 105;
  const maxWidth = W - margin * 2;
  const top = options.format === "portrait" ? 235 : 172;
  ctx.fillStyle = colors.ink;
  ctx.font = "700 30px Inter, Arial, sans-serif";
  ctx.globalAlpha = .85;
  ctx.fillText(options.index === 0 ? "ABERTURA" : options.index === options.total - 1 ? "PRÓXIMO PASSO" : "IDEIA " + String(options.index + 1).padStart(2, "0"), margin, top);
  ctx.globalAlpha = 1;

  const heading = fittedText(ctx, slide.heading || "Escreva um título", maxWidth, 5, options.format === "portrait" ? 88 : 75, 42, "Inter, Arial, sans-serif");
  const headingHeight = heading.size * 1.18;
  const bodyStart = top + 66 + heading.lines.length * headingHeight + 37;
  ctx.font = "800 " + heading.size + "px Inter, Arial, sans-serif";
  heading.lines.forEach((line, i) => ctx.fillText(line, margin, top + 69 + i * headingHeight));
  ctx.fillStyle = colors.subdued;
  const bodyFont = options.format === "portrait" ? 43 : 37;
  const bodyText = fittedText(ctx, slide.body, maxWidth, options.format === "portrait" ? 7 : 5, bodyFont, 27, "Inter, Arial, sans-serif");
  ctx.font = "500 " + bodyText.size + "px Inter, Arial, sans-serif";
  const maxY = H - 170;
  bodyText.lines.forEach((line, i) => {
    const y = bodyStart + i * bodyText.size * 1.42;
    if (y < maxY) ctx.fillText(line, margin, y);
  });

  ctx.fillStyle = colors.ink;
  ctx.globalAlpha = .75;
  ctx.font = "600 28px Inter, Arial, sans-serif";
  const footerY = H - 98;
  ctx.fillText(options.handle ? "@" + options.handle.replace(/^@/, "").slice(0, 30) : "INSTASTUDIO AI", margin, footerY);
  const counter = String(options.index + 1).padStart(2, "0") + " / " + String(options.total).padStart(2, "0");
  ctx.fillText(counter, W - margin - ctx.measureText(counter).width, footerY);
  ctx.globalAlpha = 1;
}
export async function slidePng(slide: SlideDraft, options: Parameters<typeof paintCarouselSlide>[2]): Promise<Blob> {
  const { width, height } = formatDimensions(options.format);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("O navegador não conseguiu preparar o editor de imagem.");
  let image:HTMLImageElement|undefined;
  if(slide.imageUrl){image=new Image();image.crossOrigin="anonymous";await new Promise<void>((resolve,reject)=>{image!.onload=()=>resolve();image!.onerror=()=>reject(new Error("A imagem não está disponível para exportação."));image!.src=slide.imageUrl!;});}
  paintCarouselSlide(ctx,slide,{...options,...(image?{image}:{})});
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Erro ao criar PNG.")), "image/png"));
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link);
  link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function crc32(data: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] ?? 0;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
function write16(view: DataView, pos: number, value: number) { view.setUint16(pos, value, true); }
function write32(view: DataView, pos: number, value: number) { view.setUint32(pos, value >>> 0, true); }

/** Valid ZIP using the STORE method: no compression and no external dependency. */
export async function zipPngs(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const checksum = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const v = new DataView(local.buffer);
    write32(v, 0, 0x04034b50); write16(v, 4, 20); write16(v, 6, 0x0800);
    write16(v, 8, 0); write32(v, 14, checksum);
    write32(v, 18, data.length); write32(v, 22, data.length);
    write16(v, 26, name.length); local.set(name, 30);
    parts.push(local, data);

    const dir = new Uint8Array(46 + name.length), dv = new DataView(dir.buffer);
    write32(dv, 0, 0x02014b50); write16(dv, 4, 20); write16(dv, 6, 20);
    write16(dv, 8, 0x0800); write32(dv, 16, checksum);
    write32(dv, 20, data.length); write32(dv, 24, data.length);
    write16(dv, 28, name.length); write32(dv, 42, offset); dir.set(name, 46);
    central.push(dir);
    offset += local.length + data.length;
  }
  const centralLength = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  write32(ev, 0, 0x06054b50);
  write16(ev, 8, files.length); write16(ev, 10, files.length);
  write32(ev, 12, centralLength); write32(ev, 16, offset);
  const combined = [...parts, ...central, end];
  const byteLength = combined.reduce((sum, part) => sum + part.byteLength, 0);
  const buffer = new ArrayBuffer(byteLength);
  const output = new Uint8Array(buffer);
  let position = 0;
  for (const part of combined) { output.set(part, position); position += part.byteLength; }
  return new Blob([buffer], { type: "application/zip" });
}
