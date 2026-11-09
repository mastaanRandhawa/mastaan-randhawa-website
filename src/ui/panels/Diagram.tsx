import type { DiagramKind } from "@/content/types";

/**
 * Small architecture diagrams for project panels. They illustrate the concepts
 * each project description names (pipeline stages, cache levels, IPC, …) —
 * they are schematic, not claims about undocumented internals.
 */
const box = (x: number, y: number, w: number, h: number, label: string, fill: string, sub?: string) => (
  <g key={label + x + y}>
    <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} fillOpacity={0.14} stroke={fill} strokeWidth={1.6} />
    <text x={x + w / 2} y={y + h / 2 + (sub ? -3 : 4)} textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif" fontSize={12} fontWeight={600} fill="#1f3552">
      {label}
    </text>
    {sub && (
      <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif" fontSize={9.5} fill="#1f3552" fillOpacity={0.6}>
        {sub}
      </text>
    )}
  </g>
);
const arrow = (x1: number, y1: number, x2: number, y2: number, key: string, dashed = false) => (
  <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1f3552" strokeOpacity={0.45} strokeWidth={1.6} markerEnd="url(#arr)" strokeDasharray={dashed ? "4 4" : undefined} />
);

export function Diagram({ kind, color }: { kind: DiagramKind; color: string }) {
  let body: JSX.Element[] = [];
  let caption = "";
  switch (kind) {
    case "pipeline": {
      const st = ["IF", "ID", "EX", "MEM", "WB"];
      const subs = ["fetch", "decode", "execute", "memory", "write-back"];
      body = st.flatMap((s, i) => [box(10 + i * 92, 40, 76, 50, s, color, subs[i]), ...(i < 4 ? [arrow(86 + i * 92, 65, 100 + i * 92, 65, `a${i}`)] : [])]);
      body.push(box(150, 115, 170, 34, "Register file", "#5b6cff"));
      body.push(arrow(235, 115, 155, 92, "r1", true), arrow(235, 115, 420, 92, "r2", true));
      caption = "Classic five-stage RISC-V pipeline with register management and custom SLT-type instructions.";
      break;
    }
    case "cache": {
      ["L1", "L2", "L3"].forEach((l, i) => {
        body.push(box(20 + i * 120, 40 - i * 4, 90 + i * 8, 50 + i * 8, l, color, ["fastest", "larger", "largest"][i]));
        if (i < 2) body.push(arrow(110 + i * 128, 65, 138 + i * 120, 65, `c${i}`));
      });
      body.push(arrow(374, 65, 400, 65, "c3"), box(402, 36, 80, 58, "RAM", "#8a7f99", "backing store"));
      body.push(box(70, 120, 150, 30, "LRU eviction", "#f2735a"), box(250, 120, 150, 30, "LFU eviction", "#e6b64c"));
      caption = "Multi-level lookup: a miss falls through to the next level; LRU and LFU policies decide what to evict.";
      break;
    }
    case "filesystem": {
      body.push(box(190, 10, 110, 34, "dir/", color));
      ["a.c", "b.txt", "src/"].forEach((f, i) => {
        body.push(arrow(245, 44, 90 + i * 150, 64, `f${i}`));
        body.push(box(40 + i * 150, 66, 100, 30, f, i === 2 ? color : "#8a7f99"));
      });
      body.push(box(40, 116, 400, 40, "ls -li  →  inode · mode · links · size · name", "#1f3552"));
      caption = "Walks a directory and prints long-format entries with inode numbers, like Unix ls.";
      break;
    }
    case "threads": {
      ["Thread A", "Thread B", "Thread C"].forEach((t, i) => {
        body.push(box(10, 10 + i * 48, 110, 36, t, "#5b6cff"));
        body.push(arrow(120, 28 + i * 48, 190, 76, `t${i}`));
      });
      body.push(box(192, 52, 110, 48, "mutex", color, "lock / unlock"));
      body.push(arrow(302, 76, 350, 76, "m"), box(352, 46, 130, 60, "Shared data", "#3fb8af", "one writer at a time"));
      caption = "Threads take turns through a mutex so shared data is read and written safely.";
      break;
    }
    case "ipc": {
      body.push(box(10, 50, 120, 56, "Process A", "#5b6cff", "producer"));
      body.push(box(360, 50, 120, 56, "Process B", "#3fb8af", "consumer"));
      body.push(box(175, 20, 140, 36, "POSIX IPC", color, "pipe / queue"));
      body.push(box(175, 100, 140, 36, "Shared state", "#e6b64c", "globals managed"));
      body.push(arrow(130, 70, 175, 40, "i1"), arrow(315, 40, 360, 70, "i2"), arrow(130, 90, 175, 118, "i3", true), arrow(315, 118, 360, 90, "i4", true));
      caption = "Two processes exchanging messages through POSIX IPC mechanisms.";
      break;
    }
    case "web-platform": {
      body.push(box(10, 50, 120, 56, "React + Vite", color, "TypeScript UI"));
      body.push(arrow(130, 78, 180, 78, "w1"), box(182, 50, 120, 56, "REST API", "#5b6cff", "Node.js"));
      body.push(arrow(302, 78, 352, 78, "w2"), box(354, 50, 126, 56, "Data", "#3fb8af", "scores · fixtures"));
      body.push(box(120, 125, 260, 30, "Brackets · standings · accounts", "#1f3552"));
      caption = "Front end talks to a Node.js REST API serving live tournament data.";
      break;
    }
    case "3d-site": {
      body.push(box(10, 50, 120, 56, "Three.js", color, "3D car + wraps"));
      body.push(box(182, 50, 120, 56, "Site UI", "#e6b64c", "Bootstrap · JS"));
      body.push(box(354, 50, 126, 56, "Server", "#3fb8af", "Thymeleaf · Docker"));
      body.push(arrow(130, 78, 180, 78, "d1"), arrow(302, 78, 352, 78, "d2"));
      body.push(box(140, 125, 220, 30, "Lead-capturing quote form", "#f2735a"));
      caption = "Interactive 3D visuals over a server-rendered, containerised site.";
      break;
    }
    case "data-pipeline": {
      ["OSM + GPX", "Clean", "Kalman smooth", "Outputs"].forEach((s, i) => {
        body.push(box(6 + i * 120, 50, 104, 52, s, i === 3 ? "#3fb8af" : color, ["ingest", "Pandas", "filtering", "maps · CSV · PNG"][i]));
        if (i < 3) body.push(arrow(110 + i * 120, 76, 126 + i * 120, 76, `p${i}`));
      });
      caption = "Ingest → clean → smooth → visualise, processed with Pandas.";
      break;
    }
    default: {
      body.push(box(10, 50, 140, 56, "HTML", "#E84D1C", "structure"));
      body.push(box(175, 50, 140, 56, "CSS / Tailwind", color, "responsive design"));
      body.push(box(340, 50, 140, 56, "JavaScript", "#d9a520", "interactions"));
      caption = "Responsive front end: semantic structure, styling, and interaction.";
    }
  }
  return (
    <figure className="rounded-2xl bg-white/70 p-3 ring-1 ring-[#1f3552]/10">
      <svg viewBox="0 0 490 165" className="h-auto w-full" role="img" aria-label={caption}>
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="#1f3552" fillOpacity={0.5} />
          </marker>
        </defs>
        {body}
      </svg>
      <figcaption className="px-1 pt-1 text-[11px] leading-snug text-[#1f3552]/60">{caption}</figcaption>
    </figure>
  );
}
