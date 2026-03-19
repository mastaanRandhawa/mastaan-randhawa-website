declare module "poly-decomp" {
  const decomp: {
    decomp: (polygon: number[][]) => number[][][];
    quickDecomp: (polygon: number[][], result?: number[][][], reflexVertices?: number[][], steinerPoints?: number[][], delta?: number, maxlevel?: number, level?: number) => number[][][];
    isSimple: (path: number[][]) => boolean;
    removeCollinearPoints: (polygon: number[][], thresholdAngle?: number) => void;
    makeCCW: (polygon: number[][]) => boolean;
  };
  export default decomp;
}
