import { useMemo } from "react";
import type { World } from "@/world/world";
import type { Anchor, AnchorType } from "@/world/regionKit";
import { worldMaterial } from "../materials/worldMaterial";
import { Balloons, Beacons, Flags, Ponds, Radars, Signs, Waterfalls, Windmills, Windsocks } from "./Anchors";
import { Gears, Turntables, OrbitCars, Pulses, Domes, Wheels, Spinners, Bobbers, Blinkers, Smokes, Fountains } from "./Mechanisms";

/** Static island meshes (one draw call each) + batched animated anchors. */
export function WorldView({ world, shadows }: { world: World; shadows: boolean }) {
  const mat = worldMaterial();
  const byType = useMemo(() => {
    const m = new Map<AnchorType, Anchor[]>();
    for (const r of world.regions) for (const a of r.anchors) m.set(a.type, [...(m.get(a.type) ?? []), a]);
    return m;
  }, [world]);
  const get = (t: AnchorType) => byType.get(t) ?? [];

  return (
    <>
      {world.regions.map((r) => (
        <group key={r.def.id + r.islands[0]?.id}>
          {r.islands.map((isl) => (
            <mesh key={isl.id} geometry={isl.geometry} material={mat} position={isl.position} receiveShadow={shadows} />
          ))}
          {r.world && <mesh geometry={r.world} material={mat} receiveShadow={shadows} />}
        </group>
      ))}
      <Signs anchors={get("sign")} />
      <Flags anchors={get("flag")} />
      <Windsocks anchors={get("windsock")} />
      <Radars anchors={get("radar")} />
      <Radars anchors={get("dish")} dishes />
      <Beacons anchors={get("beacon")} />
      <Windmills anchors={get("windmill")} />
      <Windmills anchors={get("turbine")} turbine />
      <Ponds anchors={get("pond")} />
      <Waterfalls anchors={get("waterfall")} />
      <Balloons anchors={get("balloon")} />
      <Gears anchors={get("gear")} />
      <Turntables anchors={get("turntable")} />
      <OrbitCars anchors={get("orbitCar")} />
      <Pulses anchors={get("pulses")} />
      <Domes anchors={get("dome")} />
      <Wheels anchors={get("wheel")} />
      <Spinners anchors={get("spinner")} />
      <Bobbers anchors={get("bob")} />
      <Blinkers anchors={get("blinkers")} />
      <Smokes anchors={get("smoke")} />
      <Fountains anchors={get("fountain")} />
    </>
  );
}
