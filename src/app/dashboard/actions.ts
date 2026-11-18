"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, user } from "@/lib/server";

export async function updateProfile(_status: string, form: FormData) {
  const customer = await user();
  if (!customer) return "Sign in to update your profile.";
  const name = z
    .string()
    .trim()
    .min(1)
    .max(80)
    .safeParse(form.get("display_name"));
  if (!name.success) return "Enter a display name up to 80 characters.";
  const { error } = await (
    await auth()
  )
    .from("profiles")
    .update({ display_name: name.data })
    .eq("id", customer.id);
  if (error) return "Could not update your profile.";
  revalidatePath("/dashboard");
  return "Account settings saved.";
}
