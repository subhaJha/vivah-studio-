import Link from "next/link";
import { redirect } from "next/navigation";
import { configured, user } from "@/lib/server";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default async function Login() {
  if (await user()) redirect("/dashboard");
  return (
    <main className="mx-auto mt-16 max-w-md rounded-3xl border bg-white p-8 shadow-soft">
      <Link href="/" className="text-sm text-wine underline">
        Vivah Studio
      </Link>
      <h1 className="serif mt-4 text-4xl">Your studio</h1>
      {configured() ? (
        <LoginForm />
      ) : (
        <p className="mt-4">
          Demo mode. Account services are unavailable.{" "}
          <Link className="underline" href="/editor">
            Try the editor
          </Link>
          .
        </p>
      )}
    </main>
  );
}
