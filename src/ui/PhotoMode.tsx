import { motion } from "framer-motion";
import { Camera, X } from "lucide-react";
import { useState } from "react";
import { useGame } from "@/game/store";
import { canvasRef } from "@/render/captureRef";
import { BRAND } from "@/config/brand";
import { audio } from "@/game/audio";

export function PhotoMode() {
  const setPhoto = useGame((s) => s.setPhoto);
  const unlock = useGame((s) => s.unlock);
  const [flash, setFlash] = useState(false);

  const capture = () => {
    const gl = canvasRef.gl;
    if (!gl) return;
    gl.render();
    gl.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${BRAND.title.toLowerCase()}-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
    audio.play("click");
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    unlock("shutterbug");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-30">
      {flash && <div className="absolute inset-0 bg-white/80" />}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#1f3552]/70 p-2 pl-5 text-white ring-1 ring-white/20 backdrop-blur-md">
        <span className="font-mono text-xs text-white/80">Photo mode · drag to orbit · scroll to zoom</span>
        <button onClick={capture} className="inline-flex items-center gap-2 rounded-full bg-[#f2735a] px-4 py-2 font-mono text-xs font-semibold hover:bg-[#e8624a]">
          <Camera size={14} /> Capture
        </button>
        <button onClick={() => setPhoto(false)} aria-label="Exit photo mode" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10">
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
