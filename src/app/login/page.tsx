import Link from "next/link";
import { redirect } from "next/navigation";
import { configured, user } from "@/lib/server";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; confirmation?: string }>;
}) {
  const query = await searchParams;
  const admin = query.next === "admin";
  const account = await user();
  if (account)
    redirect(
      admin && account.app_metadata.role === "admin" ? "/admin" : "/dashboard",
    );
  return (
    <main className="mx-auto mt-16 max-w-md rounded-3xl border bg-white p-8 shadow-soft">
      <Link href="/" className="text-sm text-wine underline">
        Vivah Studio
      </Link>
      <h1 className="serif mt-4 text-4xl">
        {admin ? "Admin sign-in" : "Your studio"}
      </h1>
      {configured() ? (
        <>
          {query.confirmation === "reset" && (
            <p role="status" className="mt-4 text-wine">
              Password updated. Sign in with your new password.
            </p>
          )}
          {query.confirmation === "invalid" && (
            <p role="status" className="mt-4 text-wine">
              That email link has expired or was already used.
            </p>
          )}
          <LoginForm admin={admin} />
          <Link
            href="/login/reset"
            className="mt-4 inline-block text-sm text-wine underline"
          >
            Forgot your password?
          </Link>
        </>
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
