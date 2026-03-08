import { NextRequest, NextResponse } from "next/server";

export function getClientIp(request: Request | NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  if ("ip" in request && typeof request.ip === "string" && request.ip.length > 0) {
    return request.ip;
  }

  return "unknown";
}

export function errorResponse(status: number, message = "Request failed.", code?: string) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(code ? { code } : {}),
    },
    { status }
  );
}

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
