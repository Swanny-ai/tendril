import { describe, expect, it } from "vitest";
import { embedSource, timeLeft } from "@/lib/blocks";

describe("embedSource", () => {
  it("turns YouTube links into privacy-friendly players", () => {
    for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10"]) {
      expect(embedSource(u)?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
  });
  it("supports Spotify tracks and playlists", () => {
    expect(embedSource("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x")).toMatchObject({ provider: "spotify", src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC" });
    expect(embedSource("https://open.spotify.com/intl-fr/playlist/37i9dQZF1DXcBWIGoYBM5M")?.src).toBe("https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M");
  });
  it("rejects anything else", () => {
    expect(embedSource("https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(embedSource("javascript:alert(1)")).toBeNull();
    expect(embedSource("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(embedSource(null)).toBeNull();
  });
});

describe("timeLeft", () => {
  const now = Date.parse("2026-10-16T12:00:00Z");
  it("counts down", () => {
    expect(timeLeft("2026-10-17T13:02:03Z", now)).toEqual({ days: 1, hours: 1, minutes: 2, seconds: 3, done: false });
  });
  it("stops at zero", () => {
    expect(timeLeft("2026-10-01T00:00:00Z", now)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
    expect(timeLeft(undefined, now).done).toBe(true);
  });
});
