import { describe, expect, it } from "vitest";
import { cleanUrl, extractLinks, mergeLinks, placeOf, shouldRead } from "@/lib/ig-link-history";

describe("cleanUrl", () => {
  it("unwraps Instagram's redirect and drops tracking", () => {
    expect(cleanUrl("https://l.instagram.com/?u=https%3A%2F%2Fwww.maria.me%2Fhere%3Futm_source%3Dig&e=AT0")).toBe("https://maria.me/here");
  });
  it("adds https to a bare domain and trims the end", () => {
    expect(cleanUrl("viewlink.me/maria/")).toBe("https://viewlink.me/maria");
    expect(cleanUrl("https://shop.example.com/a.")).toBe("https://shop.example.com/a");
  });
  it("ignores Meta's own addresses and junk", () => {
    expect(cleanUrl("https://www.instagram.com/maria")).toBeNull();
    expect(cleanUrl("https://scontent.cdninstagram.com/x.jpg")).toBeNull();
    expect(cleanUrl("hello world")).toBeNull();
  });
});

describe("extractLinks", () => {
  it("reads the bio website changes with their dates", () => {
    const json = JSON.stringify({
      profile_profile_change: [
        {
          string_map_data: {
            Changed: { value: "Website" },
            "Previous Value": { value: "old-site.com/me" },
            "New Value": { value: "https://viewlink.me/maria" },
            "Change Date": { timestamp: 1_700_000_000 },
          },
        },
      ],
    });
    const hits = extractLinks("personal_information/personal_information/profile_changes.json", json);
    expect(hits.map((h) => [h.url, h.place, h.ts])).toEqual([
      ["https://old-site.com/me", "profile-before", 1_700_000_000],
      ["https://viewlink.me/maria", "profile-before", 1_700_000_000],
    ]);
  });

  it("only takes full links outside the profile files", () => {
    const json = JSON.stringify([{ title: "new drop at https://shop.example.com/drop and example.org", creation_timestamp: 1_710_000_000 }]);
    const hits = extractLinks("your_instagram_activity/content/posts_1.json", json);
    expect(hits).toEqual([{ url: "https://shop.example.com/drop", place: "posts", ts: 1_710_000_000 }]);
  });

  it("falls back to a plain search in HTML exports", () => {
    expect(extractLinks("personal_information/personal_information.html", '<a href="https://maria.me/x?a=1&amp;b=2">x</a>')).toEqual([
      { url: "https://maria.me/x?a=1&b=2", place: "profile-now", ts: null },
    ]);
  });
});

describe("mergeLinks", () => {
  it("merges repeats, keeps first and last seen, and puts the current bio link first", () => {
    const rows = mergeLinks([
      { url: "https://old.me", place: "profile-before", ts: 100_000_0000 },
      { url: "https://old.me", place: "posts", ts: 1_200_000_000 },
      { url: "https://now.me", place: "profile-now", ts: null },
    ]);
    expect(rows[0].url).toBe("https://now.me");
    expect(rows[1]).toMatchObject({ url: "https://old.me", count: 2, places: ["profile-before", "posts"], firstSeen: 1_000_000_000, lastSeen: 1_200_000_000 });
  });
});

describe("which files are read", () => {
  it("skips messages, media and huge files", () => {
    expect(shouldRead("your_instagram_activity/messages/inbox/a/message_1.json", 10)).toBe(false);
    expect(shouldRead("media/posts/202401/x.jpg", 10)).toBe(false);
    expect(shouldRead("personal_information/personal_information/personal_information.json", 10)).toBe(true);
    expect(placeOf("your_instagram_activity/content/stories.json")).toBe("stories");
  });
});
