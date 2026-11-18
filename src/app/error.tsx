"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg p-10">
      <h1 className="serif text-4xl">We couldn’t load this page</h1>
      <p className="my-5">Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
