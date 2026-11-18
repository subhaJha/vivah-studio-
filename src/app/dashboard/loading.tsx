export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl p-8" aria-busy="true">
      <h1 className="serif text-3xl">Loading your invitations</h1>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((n) => (
          <div
            key={n}
            className="h-48 animate-pulse rounded-2xl bg-[#e9ded4]"
          />
        ))}
      </div>
    </main>
  );
}
