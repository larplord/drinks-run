import { NextResponse } from "next/server";
import { adminCookieName } from "@/app/owner-auth";

export async function GET(request: Request): Promise<Response> {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({ name: adminCookieName(), value: "", expires: new Date(0), path: "/" });
  return response;
}
