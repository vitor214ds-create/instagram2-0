// Renders an editable post (vector text over brand colors) into a real PNG file.
export async function exportPostPng(opts: {
  title: string;
  subtitle?: string;
  handle?: string;
  palette: string[];
  headingFont: string;
  bodyFont: string;
  filename: string;
  width?: number;
  height?: number;
}) {
  const W = opts.width ?? 1080;
  const H = opts.height ?? 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const [a = "#6D28D9", b = "#DB2777", light = "#FFFFFF"] = opts.palette;
  try {
    await Promise.all([
      document.fonts.load(`700 80px "${opts.headingFont}"`),
      document.fonts.load(`400 40px "${opts.bodyFont}"`),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const wrap = (text: string, font: string, maxW: number) => {
    ctx.font = font;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };
  ctx.fillStyle = light;
  const hf = `700 88px "${opts.headingFont}", sans-serif`;
  const lines = wrap(opts.title, hf, W - 180).slice(0, 7);
  let y = H / 2 - (lines.length * 104) / 2 + 60;
  ctx.font = hf;
  for (const l of lines) {
    ctx.fillText(l, 90, y);
    y += 104;
  }
  if (opts.subtitle) {
    const bf = `400 38px "${opts.bodyFont}", sans-serif`;
    ctx.globalAlpha = 0.85;
    for (const l of wrap(opts.subtitle, bf, W - 180).slice(0, 3)) {
      ctx.font = bf;
      y += 10;
      ctx.fillText(l, 90, y);
      y += 48;
    }
    ctx.globalAlpha = 1;
  }
  if (opts.handle) {
    ctx.font = `600 34px "${opts.bodyFont}", sans-serif`;
    ctx.fillText(`@${opts.handle}`, 90, H - 90);
  }
  const blob: Blob = await new Promise((res) => c.toBlob((bl) => res(bl!), "image/png"));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = opts.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
