import { NextResponse } from "next/server";
import { adminCookieName, adminSessionToken, isAdminPasswordConfigured } from "@/app/owner-auth";
import { isRecord, jsonResponse, readLimitedJson, RequestError, requireSameOrigin } from "@/app/api/_lib/http";

export async function POST(request: Request): Promise<Response> {
  try {
    requireSameOrigin(request);
    const payload = await readLimitedJson(request, 2048);
    if (!isRecord(payload) || typeof payload.password !== "string") {
      throw new RequestError(400, "Enter the organizer password.");
    }
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!isAdminPasswordConfigured() || payload.password !== configuredPassword) {
      return jsonResponse({ error: "That password was not accepted." }, { status: 401 });
    }
    const token = adminSessionToken();
    if (!token) return jsonResponse({ error: "Admin login is not configured." }, { status: 503 });

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: adminCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, { status: error.status });
    return jsonResponse({ error: "Login is temporarily unavailable." }, { status: 503 });
  }
}
