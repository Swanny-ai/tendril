import { describe, expect, it } from "vitest";
import { signInMethods } from "@/lib/sign-in-methods";

describe("signInMethods", () => {
  it("names each provider instead of assuming Google", () => {
    expect(signInMethods(null, [{ provider: "fanvue" }])).toEqual(["Fanvue"]);
    expect(signInMethods(null, [{ provider: "google" }])).toEqual(["Google"]);
  });
  it("lists the password first and each provider once", () => {
    expect(signInMethods("hash", [{ provider: "google" }, { provider: "fanvue" }, { provider: "google" }])).toEqual(["Password", "Google", "Fanvue"]);
  });
  it("is empty with no way to sign in", () => expect(signInMethods(null, [])).toEqual([]));
});
