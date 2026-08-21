import { describe, expect, it } from "vitest";

import { MINIMUM_NODE_MAJOR, unsupportedNode } from "../src/node-support.js";

describe("node support", () => {
  it("explains what is needed and what is running", () => {
    const message = unsupportedNode("18.19.0");

    expect(message).toContain(`Node ${MINIMUM_NODE_MAJOR} or later`);
    expect(message).toContain("18.19.0");
  });

  it("accepts the minimum and anything above it", () => {
    expect(unsupportedNode("20.0.0")).toBeUndefined();
    expect(unsupportedNode("v24.3.0")).toBeUndefined();
    // Two-digit majors must not be compared as strings — "9" > "20" is where
    // this kind of check usually breaks.
    expect(unsupportedNode("9.0.0")).toBeDefined();
    expect(unsupportedNode("100.0.0")).toBeUndefined();
  });

  it("stays out of the way when the version is unrecognisable", () => {
    // Blocking here would fail a user over our own parsing, not over a real
    // incompatibility.
    expect(unsupportedNode("")).toBeUndefined();
    expect(unsupportedNode("nightly")).toBeUndefined();
  });
});
