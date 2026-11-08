/** Renderer handle for photo-mode capture (kept tiny so UI can import it without pulling in the 3D chunk). */
export const canvasRef: { gl: { domElement: HTMLCanvasElement; render: () => void } | null } = { gl: null };
