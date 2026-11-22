"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { resetPassword } from "./actions";

export function RecoveryForm({ signedIn }: { signedIn: boolean }) {
  const [notice, action, pending] = useActionState(resetPassword, "");
  return (
    <form action={action} className="mt-6 grid gap-4">
      <input
        type="hidden"
        name="intent"
        value={signedIn ? "password" : "email"}
      />
      {signedIn ? (
        <>
          <label>
            New password
            <input
              className="field"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              className="field"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
        </>
      ) : (
        <label>
          Email
          <input
            className="field"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </label>
      )}
      <Button disabled={pending}>
        {pending
          ? "Working…"
          : signedIn
            ? "Update password"
            : "Email recovery link"}
      </Button>
      <p role="status" className="text-sm text-muted">
        {notice}
      </p>
    </form>
  );
}
