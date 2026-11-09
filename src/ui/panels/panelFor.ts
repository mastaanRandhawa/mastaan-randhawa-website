import type { Destination } from "@/world/defs";
import type { PanelState } from "@/game/store";

export function panelFor(d: Destination): PanelState {
  return { kind: d.kind, id: d.contentId };
}
