import { motion } from "framer-motion";
import { useState } from "react";
import { useGame } from "@/game/store";
import { canvasRef } from "@/render/captureRef";
import { BRAND } from "@/config/brand";
import { audio } from "@/game/audio";

/** Camera-app style controls: shutter button + Done. */
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
    setTimeout(() => setFlash(false), 160);
    unlock("shutterbug");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-sf pointer-events-none fixed inset-0 z-30">
      {flash && <div className="absolute inset-0 bg-white/80" />}
      <div className="mat-dark absolute left-1/2 top-4 -translate-x-1/2 rounded-full px-4 py-1.5 text-[13px] font-medium text-white/85">Drag to orbit · Scroll to zoom</div>
      <div className="pointer-events-auto absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-6">
        <span className="w-16" />
        <button onClick={capture} aria-label="Capture photo" className="grid h-[72px] w-[72px] place-items-center rounded-full border-[4px] border-white/95 shadow-[0_6px_24px_rgba(0,0,0,0.35)] transition active:scale-95">
          <span className="h-[56px] w-[56px] rounded-full bg-white transition hover:bg-white/90" />
        </button>
        <button onClick={() => setPhoto(false)} className="mat-dark w-16 rounded-full py-2 text-[15px] font-semibold text-white">
          Done
        </button>
      </div>
    </motion.div>
  );
}
