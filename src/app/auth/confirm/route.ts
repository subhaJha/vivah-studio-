import { redirect } from "next/navigation";
import { auth, configured } from "@/lib/server";

export async function GET(req: Request) {
  const token_hash = new URL(req.url).searchParams.get("token_hash");
  if (token_hash && configured()) {
    const result = await (
      await auth()
    ).auth.verifyOtp({ type: "email", token_hash });
    if (!result.error) redirect("/dashboard");
  }
  redirect("/login");
}
