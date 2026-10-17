import { describe, expect, it } from "vitest";
import { VERSION } from "../../src/index.js";

describe("paket girişi", () => {
  it("sürüm sabitini dışa açar", () => {
    expect(VERSION).toBe("0.0.0");
  });
});
