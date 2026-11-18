"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, user } from "@/lib/server";

export async function manage(form: FormData) {
  const admin = await user();
  if (admin?.app_metadata.role !== "admin") redirect("/login");
  const action = form.get("action");
  const identifier = form.get("id");
  const database = db();
  if (action === "template") {
    const input = z
      .object({
        id: z.string().max(80),
        amount: z.coerce.number().int().min(1).max(10000000),
        active: z.boolean(),
      })
      .safeParse({
        id: identifier,
        amount: form.get("amount"),
        active: form.get("active") === "on",
      });
    if (!input.success) redirect("/admin?view=templates&result=invalid");
    const { error } = await database
      .from("templates")
      .update({ price: input.data.amount, active: input.data.active })
      .eq("id", input.data.id);
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
  redirect("/admin?result=invalid");
}
