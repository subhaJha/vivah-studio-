"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "./actions";

export function LoginForm({ admin = false }: { admin?: boolean }) {
  const [notice, action, pending] = useActionState(signIn, "");
  return (
    <form action={action} className="mt-6 grid gap-4">
      {admin && <input type="hidden" name="next" value="admin" />}
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
      <label>
        Password
        <input
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      <div className="flex gap-3">
        <Button disabled={pending} name="intent" value="login">
          Sign in
        </Button>
        {!admin && (
          <Button
            disabled={pending}
            name="intent"
            value="register"
            variant="outline"
          >
            Register
          </Button>
        )}
      </div>
      <p role="status">{notice}</p>
    </form>
  );
}
