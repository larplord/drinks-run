import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_COOKIE = "drinks_run_admin";
const SESSION_MESSAGE = "Drinks Run organizer session v1";

export type OwnerUser = {
  displayName: string;
  email: string;
};

export type OwnerApiAccess =
  | { allowed: true; user: OwnerUser }
  | { allowed: false; reason: "unauthenticated" | "forbidden" };

export function adminCookieName(): string {
  return ADMIN_COOKIE;
}

export function adminSessionToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update(SESSION_MESSAGE).digest("hex");
}

export function isAdminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function isValidAdminSession(value: string | undefined): boolean {
  const expected = adminSessionToken();
  if (!expected || !value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export async function requireOwner(returnTo = "/admin"): Promise<OwnerUser> {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isValidAdminSession(session)) {
    redirect(`/admin/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return { displayName: "Organizer", email: "Private organizer" };
}

export async function getOwnerApiAccess(): Promise<OwnerApiAccess> {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAdminPasswordConfigured()) {
    return { allowed: false, reason: "forbidden" };
  }
  if (!isValidAdminSession(session)) {
    return { allowed: false, reason: "unauthenticated" };
  }
  return {
    allowed: true,
    user: { displayName: "Organizer", email: "Private organizer" },
  };
}
