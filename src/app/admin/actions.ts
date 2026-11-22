"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, user } from "@/lib/server";

export async function manage(form: FormData) {
  const admin = await user();
  if (admin?.app_metadata.role !== "admin") redirect("/login?next=admin");
  const action = form.get("action");
  const identifier = form.get("id");
  const database = db();
  if (action === "template") {
    const input = z
      .object({
        id: z.string().max(80),
        title: z.string().trim().min(1).max(90),
        amount: z.coerce.number().int().min(1).max(10000000),
        active: z.boolean(),
      })
      .safeParse({
        id: identifier,
        title: form.get("title"),
        amount: form.get("amount"),
        active: form.get("active") === "on",
      });
    if (!input.success) redirect("/admin?view=templates&result=invalid");
    const { error } = await database
      .from("templates")
      .update({
        title: input.data.title,
        price: input.data.amount,
        active: input.data.active,
      })
      .eq("id", input.data.id);
    revalidatePath("/");
    revalidatePath("/templates");
    redirect("/admin?view=templates&result=" + (error ? "error" : "saved"));
  }
  if (action === "unpublish" && z.uuid().safeParse(identifier).success) {
    const { error } = await database
      .from("publications")
      .delete()
      .eq("invitation", identifier);
    redirect("/admin?view=invitations&result=" + (error ? "error" : "saved"));
  }
  if (
    action === "customer" &&
    z.uuid().safeParse(identifier).success &&
    identifier !== admin.id
  ) {
    const { error } = await database.auth.admin.updateUserById(
      String(identifier),
      { ban_duration: form.get("restore") === "true" ? "none" : "876000h" },
    );
    redirect("/admin?view=customers&result=" + (error ? "error" : "saved"));
  }
  if (
    action === "remove-rsvp" &&
    typeof identifier === "string" &&
    /^\d{1,18}$/.test(identifier) &&
    form.get("confirm") === "on"
  ) {
    const { data, error } = await database
      .from("rsvp_responses")
      .delete()
      .eq("id", identifier)
      .select("id")
      .maybeSingle();
    redirect(
      "/admin?view=rsvps&result=" + (error || !data ? "error" : "saved"),
    );
  }
  redirect("/admin?result=invalid");
}
