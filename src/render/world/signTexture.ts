import { CanvasTexture, SRGBColorSpace } from "three";

export interface SignData {
  lines: string[];
  w: number;
  h: number;
  bg?: string;
  fg?: string;
  accent?: string;
  arrow?: boolean;
  doubleSided?: boolean;
  font?: number;
  style?: "welcome" | "board" | "plain" | "screen" | "banner";
  flip?: boolean;
}

const cache = new Map<string, CanvasTexture>();

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Renders world signage text into a texture using the site's own typefaces. */
export function signTexture(d: SignData): CanvasTexture {
  const key = JSON.stringify(d);
  const hit = cache.get(key);
  if (hit) return hit;
  const ppu = Math.min(96, 1024 / Math.max(d.w, d.h));
  const W = Math.round(d.w * ppu);
  const H = Math.round(d.h * ppu);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const bg = d.bg ?? "#fbf3e2";
  const fg = d.fg ?? "#1f3552";
  const accent = d.accent ?? "#f2735a";
  g.clearRect(0, 0, W, H);

  if (d.arrow) {
    const tip = H * 0.5;
    g.beginPath();
    if (d.flip) {
      g.moveTo(0, H / 2);
      g.lineTo(tip, 0);
      g.lineTo(W, 0);
      g.lineTo(W, H);
      g.lineTo(tip, H);
    } else {
      g.moveTo(0, 0);
      g.lineTo(W - tip, 0);
      g.lineTo(W, H / 2);
      g.lineTo(W - tip, H);
      g.lineTo(0, H);
    }
    g.closePath();
    g.fillStyle = bg;
    g.fill();
    g.lineWidth = H * 0.08;
    g.strokeStyle = "#6b4428";
    g.stroke();
    g.fillStyle = fg;
    g.font = `800 ${Math.round(H * 0.42)}px 'Nunito', sans-serif`;
    g.textBaseline = "middle";
    g.textAlign = "center";
    const cx = d.flip ? (W + tip) / 2 : (W - tip) / 2;
    let text = d.lines[0];
    while (g.measureText(text).width > W - tip - H * 0.3 && text.length > 3) text = text.slice(0, -2) + "…";
    g.fillText(text, cx, H / 2 + H * 0.03);
  } else {
    g.fillStyle = bg;
    roundRect(g, 0, 0, W, H, Math.min(W, H) * 0.08);
    g.fill();
    if (d.style !== "screen") {
      g.fillStyle = accent;
      g.fillRect(0, H - H * 0.06, W, H * 0.06);
    }
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = fg;
    if (d.style === "welcome") {
      g.font = `700 ${Math.round(H * 0.11)}px 'Nunito', sans-serif`;
      g.fillText(d.lines[0], W / 2, H * 0.2);
      g.font = `800 ${Math.round(H * 0.34)}px 'Zain', 'Nunito', sans-serif`;
      g.fillStyle = accent;
      g.fillText(d.lines[1], W / 2, H * 0.5);
      g.fillStyle = fg;
      g.font = `800 ${Math.round(H * 0.1)}px 'Nunito', sans-serif`;
      g.fillText(d.lines[2] ?? "", W / 2, H * 0.78);
    } else if (d.style === "board") {
      g.textAlign = "left";
      g.font = `700 ${Math.round(H * 0.15)}px 'Nunito', sans-serif`;
      g.fillText(d.lines[0], W * 0.08, H * 0.18);
      g.fillStyle = accent;
      g.fillRect(W * 0.08, H * 0.3, W * 0.84, H * 0.025);
      g.fillStyle = fg;
      g.font = `700 ${Math.round(H * 0.105)}px 'Nunito', sans-serif`;
      d.lines.slice(1).forEach((l, i) => g.fillText(`▪ ${l}`, W * 0.08, H * (0.45 + i * 0.16)));
    } else {
      const n = d.lines.length;
      const size = d.font ? (d.font / 100) * H : H / (n * 1.55);
      d.lines.forEach((l, i) => {
        const big = i === 0;
        g.font = `${big ? 800 : 700} ${Math.round(size * (big ? 1 : 0.78))}px 'Nunito', sans-serif`;
        let text = l;
        while (g.measureText(text).width > W * 0.92 && text.length > 3) text = text.slice(0, -2) + "…";
        g.fillText(text, W / 2, (H * (i + 0.5)) / n);
      });
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}
