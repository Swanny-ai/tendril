import { NextResponse, type NextRequest } from "next/server";
import { applyCryptoIpn, type IpnBody } from "@/lib/crypto-pay";
import { verifyNowpaymentsSignature } from "@/lib/crypto-sig";

// NOWPayments instant payment notifications (IPN). Signed with the IPN secret; anything unsigned
// or wrongly signed is rejected.
export async function POST(request: NextRequest) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await request.text();
  let body: IpnBody;
  try {
    body = JSON.parse(raw) as IpnBody;
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  if (!verifyNowpaymentsSignature(body, request.headers.get("x-nowpayments-sig"), secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  const result = await applyCryptoIpn(body);
  return NextResponse.json({ ok: true, result });
}
