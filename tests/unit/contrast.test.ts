import { describe, test, expect } from "vitest";
import { contrastRatio, meetsWCAGAA, meetsWCAGAAA, parseHex } from "../../src/lib/contrast";

describe("parseHex", () => {
  test("parses 6-digit hex", () => {
    expect(parseHex("#ffffff")).toEqual([255, 255, 255]);
    expect(parseHex("#000000")).toEqual([0, 0, 0]);
    expect(parseHex("#ff0000")).toEqual([255, 0, 0]);
  });

  test("parses 3-digit hex", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("#000")).toEqual([0, 0, 0]);
  });

  test("returns null for invalid hex", () => {
    expect(parseHex("notahex")).toBeNull();
    expect(parseHex("#gg0000")).toBeNull();
  });
});

describe("contrastRatio", () => {
  test("black on white = 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  test("white on white = 1:1", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 0);
  });

  test("is symmetric", () => {
    const r1 = contrastRatio("#1a73e8", "#ffffff");
    const r2 = contrastRatio("#ffffff", "#1a73e8");
    expect(r1).toBeCloseTo(r2, 5);
  });
});

describe("meetsWCAGAA", () => {
  test("black on white passes (21:1 > 4.5:1)", () => {
    expect(meetsWCAGAA("#000000", "#ffffff")).toBe(true);
  });

  test("light gray on white fails", () => {
    expect(meetsWCAGAA("#cccccc", "#ffffff")).toBe(false);
  });
});

describe("meetsWCAGAAA", () => {
  test("black on white passes (21:1 > 7:1)", () => {
    expect(meetsWCAGAAA("#000000", "#ffffff")).toBe(true);
  });
});
