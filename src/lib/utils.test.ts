import { describe, it, expect } from "vitest";
import { instant, safeNext, seatOrder } from "./utils";
describe("cinema local timestamps", () => {
  it("interprets offset-free server times in India rather than browser timezone", () => {
    expect(instant("2026-09-25T18:30:00")).toBe(
      Date.parse("2026-09-25T13:00:00Z"),
    );
  });
  it("preserves explicit offsets", () => {
    expect(instant("2026-09-25T18:30:00+05:30")).toBe(
      Date.parse("2026-09-25T13:00:00Z"),
    );
  });
  it("rejects invalid timestamps", () => expect(instant("bad-date")).toBeNaN());
});
describe("navigation and seats", () => {
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", null])(
    "rejects external next value %s",
    (value) => expect(safeNext(value)).toBe("/movies"),
  );
  it("retains local paths", () =>
    expect(safeNext("/shows/1/seats")).toBe("/shows/1/seats"));
  it("sorts seat 2 before seat 10", () =>
    expect(["A10", "A2", "A1"].sort(seatOrder)).toEqual(["A1", "A2", "A10"]));
});
