import { describe, expect, it } from "vitest";
import { parseMailFrom } from "@/lib/mail-address";

describe("parseMailFrom", () => {
  it("reads name and address", () => {
    expect(parseMailFrom("Tendril <hello@example.com>", "X")).toEqual({ name: "Tendril", email: "hello@example.com" });
    expect(parseMailFrom('"My App" <me@gmail.com>', "X")).toEqual({ name: "My App", email: "me@gmail.com" });
  });
  it("accepts a bare address", () => {
    expect(parseMailFrom("me@gmail.com", "Tendril")).toEqual({ name: "Tendril", email: "me@gmail.com" });
  });
  it("rejects junk", () => {
    expect(parseMailFrom("", "X")).toBeNull();
    expect(parseMailFrom("not an email", "X")).toBeNull();
    expect(parseMailFrom(undefined, "X")).toBeNull();
  });
});
