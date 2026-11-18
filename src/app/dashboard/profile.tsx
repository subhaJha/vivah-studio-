"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateProfile } from "./actions";

export function Profile({ name, email }: { name: string; email?: string }) {
  const [notice, action, busy] = useActionState(updateProfile, "");
  return (
    <form action={action} className="mt-4 grid max-w-sm gap-3">
      <p className="text-sm">Signed in as {email}</p>
      <label>
        Display name
        <input
          name="display_name"
          className="field"
          defaultValue={name}
          maxLength={80}
          required
        />
      </label>
      <Button variant="outline" disabled={busy}>
        Update profile
      </Button>
      <p role="status">{notice}</p>
    </form>
  );
}
