import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ error: "Use existing affiliate_links table (read-only here)." }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Use existing affiliate_links table (read-only here)." }, { status: 405 });
}
