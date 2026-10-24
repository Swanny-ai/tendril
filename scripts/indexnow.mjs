// Tells IndexNow search engines (Bing, which also powers Edge, DuckDuckGo, Yahoo and Ecosia; Yandex;
// Seznam; Naver) about every URL in the live sitemap, so they crawl them soon.
// Usage: node scripts/indexnow.mjs [https://viewlink.me]
// The key file public/<KEY>.txt proves the site owns the key.
const KEY = "72c8695107dcd67e3ee478be5214490c";
const site = (process.argv[2] ?? "https://viewlink.me").replace(/\/$/, "");
const xml = await (await fetch(`${site}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) throw new Error(`No URLs found in ${site}/sitemap.xml`);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(site).host, key: KEY, keyLocation: `${site}/${KEY}.txt`, urlList: urls.slice(0, 10_000) }),
});
console.log(`IndexNow: sent ${urls.length} URLs → HTTP ${res.status} ${res.statusText}`);
