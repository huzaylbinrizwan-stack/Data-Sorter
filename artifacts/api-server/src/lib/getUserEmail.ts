import { clerkClient } from "@clerk/express";

const cache = new Map<string, { email: string; ts: number }>();
const TTL = 5 * 60 * 1000;

export async function getUserEmail(userId: string): Promise<string> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.ts < TTL) return hit.email;
  try {
    const user = await (clerkClient as any).users.getUser(userId);
    const email = (
      user.emailAddresses?.find((e: any) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? ""
    ).toLowerCase().trim();
    cache.set(userId, { email, ts: Date.now() });
    return email;
  } catch {
    return "";
  }
}
