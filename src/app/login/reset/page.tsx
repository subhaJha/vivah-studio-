import Link from "next/link";
import { configured, user } from "@/lib/server";
import { RecoveryForm } from "./form";

export const dynamic = "force-dynamic";

export default async function Reset() {
  const account = await user();
  return (
    <main className="mx-auto mt-12 max-w-md rounded-3xl border bg-white p-8 shadow-soft">
      <Link href="/login" className="text-sm text-wine underline">
        Back to sign-in
      </Link>
      <h1 className="serif mt-4 text-4xl">Reset your password</h1>
      {configured() ? (
        <RecoveryForm signedIn={Boolean(account)} />
      ) : (
        <p className="mt-4">
          Password reset becomes available when account services are connected.
        </p>
      )}
    </main>
  );
}
