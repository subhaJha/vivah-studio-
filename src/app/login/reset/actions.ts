"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, configured, user } from "@/lib/server";

export async function resetPassword(_: string, form: FormData) {
  if (!configured()) return "Account services are unavailable.";
  if (form.get("intent") === "email") {
    const email = z.email().safeParse(form.get("email"));
    if (!email.success) return "Enter a valid email address.";
    await (await auth()).auth.resetPasswordForEmail(email.data);
    return "If there’s an account for that email, a reset link will arrive shortly.";
  }
  if (!(await user()))
    return "Open the recovery link in your email before setting a password.";
  const password = z.string().min(8).max(128).safeParse(form.get("password"));
  if (!password.success || form.get("confirm") !== password.data)
    return "Use 8 to 128 characters and enter the same password twice.";
  const client = await auth();
  const { error } = await client.auth.updateUser({ password: password.data });
  if (error)
    return "Could not update the password. Try a different password or request another recovery link.";
  await client.auth.signOut({ scope: "global" });
  redirect("/login?confirmation=reset");
}
