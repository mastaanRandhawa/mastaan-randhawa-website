// @vitest-environment node
import { describe, expect, it } from "vitest";
import { KEY_BINDINGS, CONTROL_HELP } from "./controls";

describe("key bindings", () => {
  it("never binds one key to two actions", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const [action, codes] of Object.entries(KEY_BINDINGS)) {
      for (const code of codes) {
        if (seen.has(code)) clashes.push(`${code}: ${seen.get(code)} & ${action}`);
        seen.set(code, action);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("lists each key only once in the controls help", () => {
    const keys = CONTROL_HELP.flatMap((c) => c.keys);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
