import { NextResponse } from "next/server";

// Crypto payments are no longer offered: plans are paid by card only. (Payments already started
// still finish through /api/crypto/ipn, so nobody loses time they paid for.)
export function POST() {
  return NextResponse.json({ error: "Plans are paid by card only." }, { status: 410 });
}
