import { describe, expect, it } from "vitest";
import { LINK_BASE_HEADER, linkOpensHere } from "@/lib/link-paths";

const APP = "viewlink.me";
const req = (host: string, base?: string) => new Headers({ host, ...(base ? { [LINK_BASE_HEADER]: base } : {}) });

describe("linkOpensHere", () => {
  const onDomain = { slug: "here", atRoot: false, domainHost: "other.me" };
  const noDomain = { slug: "here", atRoot: false, domainHost: null };
  const root = { slug: "root-abc", atRoot: true, domainHost: "maria.me" };

  it("opens on the link's own domain", () => {
    expect(linkOpensHere(onDomain, req("other.me", "/here"), APP)).toBe(true);
    expect(linkOpensHere(onDomain, req("OTHER.me:443", "/here"), APP)).toBe(true);
  });

  it("stays closed on any other custom domain, even one the same creator owns", () => {
    expect(linkOpensHere(onDomain, req("maria.me", "/here"), APP)).toBe(false);
    expect(linkOpensHere(noDomain, req("maria.me", "/here"), APP)).toBe(false);
    expect(linkOpensHere(noDomain, req("maria.me"), APP)).toBe(false);
  });

  it("opens a Root link at the home page and its steps, not at its slug", () => {
    expect(linkOpensHere(root, req("maria.me", "/"), APP)).toBe(true);
    expect(linkOpensHere(root, req("maria.me"), APP)).toBe(true);
    expect(linkOpensHere(root, req("maria.me", "/root-abc"), APP)).toBe(false);
  });

  it("keeps every link working on the ViewLink domain", () => {
    expect(linkOpensHere(noDomain, req(APP, "/here"), APP)).toBe(true);
    expect(linkOpensHere(onDomain, req(APP, "/here"), APP)).toBe(true);
  });
});
