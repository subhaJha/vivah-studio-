import { templates } from "./templates";
import { configured, db } from "./server";

export async function getCatalog() {
  if (!configured()) return templates;
  const { data, error } = await db()
    .from("templates")
    .select("id,title,price")
    .eq("active", true);
  if (error) throw error;
  return templates.flatMap((template) => {
    const row = data.find((item) => item.id === template.id);
    return row
      ? [{ ...template, title: row.title, price: row.price / 100 }]
      : [];
  });
}
