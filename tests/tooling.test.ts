import { describe, expect, it } from "vitest";

import * as spellkit from "../src/index.js";

describe("package tooling", () => {
  it("loads the TypeScript package entry point", () => {
    expect(Object.keys(spellkit)).toEqual([]);
  });
});
