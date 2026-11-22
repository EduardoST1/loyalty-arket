import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionId } from "@/lib/customer-session";

export async function GET(request: NextRequest) {
  const id = getCustomerSessionId(request);
  return id ? NextResponse.json({ id }) : NextResponse.json({}, { status: 401 });
}
