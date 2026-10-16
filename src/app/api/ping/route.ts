// Answers on every host that reaches this app. The domains page fetches it through a custom
// domain to confirm the hosting provider actually serves that domain (not just that DNS is set).
export function GET() {
  return Response.json({ app: "tendril" }, { headers: { "Cache-Control": "no-store" } });
}
