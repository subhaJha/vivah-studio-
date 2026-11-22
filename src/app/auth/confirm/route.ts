import { redirect } from "next/navigation";
import { auth, configured } from "@/lib/server";

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams;
  const token_hash = query.get("token_hash");
  const recovery = query.get("type") === "recovery";
  if (token_hash && configured()) {
    const result = await (
      await auth()
    ).auth.verifyOtp({ type: recovery ? "recovery" : "email", token_hash });
    if (!result.error) redirect(recovery ? "/login/reset" : "/dashboard");
  }
  redirect("/login?confirmation=invalid");
}
