"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, configured } from "@/lib/server";

const credentials = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});
export async function signIn(_state: string, form: FormData) {
  if (!configured()) return "Account services are unavailable in demo mode.";
  const parsed = credentials.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success)
    return "Enter a valid email and a password of at least eight characters.";
  const client = await auth();
  if (form.get("intent") === "register") {
    const result = await client.auth.signUp(parsed.data);
    if (result.error) return "Registration could not be completed.";
    if (result.data.session) redirect("/dashboard");
    return "Check your email for the confirmation link.";
  }
  const result = await client.auth.signInWithPassword(parsed.data);
  if (result.error)
    return "Could not sign in. Check your credentials and confirm your email.";
  redirect("/dashboard");
}
export async function signOut() {
  if (configured()) await (await auth()).auth.signOut();
  redirect("/");
}
