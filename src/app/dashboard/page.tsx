import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { draftSchema, dateLabel } from "@/lib/invitation";
import { configured, db, user } from "@/lib/server";
import { templates } from "@/lib/templates";
import { signOut } from "../login/actions";
import { Profile } from "./profile";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  if (!configured())
    return (
      <main className="mx-auto max-w-xl p-10">
        <Link href="/">Vivah Studio</Link>
        <h1 className="serif my-5 text-4xl">Your invitations</h1>
        <p>Demo mode. Account dashboards require Supabase.</p>
        <Button asChild className="mt-5">
          <Link href="/editor">Open the demo editor</Link>
        </Button>
      </main>
    );
  const customer = await user();
  if (!customer) redirect("/login");
  const database = db();
  const [list, profile] = await Promise.all([
    database
      .from("invitations")
      .select(
        "id,draft,publications(slug),invitation_analytics(views),rsvp_responses(id,name,attending,guests,message),orders(provider_order,amount,created_at,payments(status))",
      )
      .eq("owner", customer.id)
      .order("updated_at", { ascending: false }),
    database
      .from("profiles")
      .select("display_name")
      .eq("id", customer.id)
      .single(),
  ]);
  if (list.error || profile.error)
    throw new Error("Could not load your workspace.");
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link className="text-sm text-wine underline" href="/">
            Vivah Studio
          </Link>
          <h1 className="serif mt-2 text-4xl">
            Welcome
            {profile.data.display_name ? ", " + profile.data.display_name : ""}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/templates">Create invitation</Link>
          </Button>
          {customer.app_metadata.role === "admin" && (
            <Button asChild variant="outline">
              <Link href="/admin">Admin</Link>
            </Button>
          )}
          <form action={signOut}>
            <Button variant="outline">Sign out</Button>
          </form>
        </div>
      </header>
      <h2 className="serif mt-10 text-2xl">My invitations</h2>
      {!list.data.length && (
        <p className="mt-5 rounded-2xl border border-dashed p-8">
          Your studio is empty. Choose a template to start your first
          invitation.
        </p>
      )}
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.data.map((item) => {
          const draft = draftSchema.parse(item.draft);
          const art = templates.find((t) => t.id === draft.template)!;
          const slug = (
            Array.isArray(item.publications)
              ? item.publications[0]
              : item.publications
          )?.slug;
          const views = item.invitation_analytics.reduce(
            (sum, row) => sum + Number(row.views),
            0,
          );
          const yes = item.rsvp_responses.filter((r) => r.attending);
          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border bg-white shadow-soft"
            >
              <div
                className="grid min-h-40 place-content-center p-6 text-center"
                style={{ background: art.theme, color: art.accent }}
              >
                <span aria-hidden className="text-3xl">
                  {art.flower}
                </span>
                <h3 className="serif mt-2 text-2xl">
                  {draft.bride || "Bride"} &amp; {draft.groom || "Groom"}
                </h3>
              </div>
              <div className="grid gap-3 p-5">
                <p className="text-sm font-semibold text-wine">
                  {slug ? "Published" : "Draft"} · {art.title}
                </p>
                <p className="text-sm text-muted">
                  {dateLabel(draft.date) || "Wedding date pending"}
                </p>
                <p className="text-sm">
                  {views} views · {item.rsvp_responses.length} replies ·{" "}
                  {yes.reduce((sum, r) => sum + r.guests, 0)} attending guests
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={"/editor?id=" + item.id}>
                      Edit &amp; publish
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={
                        slug
                          ? "/invite/" + slug
                          : "/editor?id=" + item.id + "#preview"
                      }
                    >
                      Preview
                    </Link>
                  </Button>
                </div>
                {!!item.rsvp_responses.length && (
                  <details>
                    <summary className="cursor-pointer">
                      Guest responses
                    </summary>
                    <ul className="mt-2 grid gap-2 text-sm">
                      {item.rsvp_responses.map((r) => (
                        <li key={r.id} className="rounded-lg border p-2">
                          {r.name} ·{" "}
                          {r.attending ? `${r.guests} attending` : "Declined"}
                          {r.message && <p>{r.message}</p>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {!!item.orders.length && (
                  <details>
                    <summary className="cursor-pointer">Order history</summary>
                    <ul className="mt-2 grid gap-2 text-sm">
                      {item.orders.map((o) => (
                        <li key={o.provider_order}>
                          {dateLabel(o.created_at.slice(0, 10))} · ₹
                          {o.amount / 100} ·{" "}
                          {o.payments.some((p) => p.status === "captured")
                            ? "Paid"
                            : o.payments.some((p) => p.status === "failed")
                              ? "Failed"
                              : "Pending"}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <section className="mt-10 rounded-2xl border bg-white p-6">
        <h2 className="serif text-2xl">Account settings</h2>
        <Profile name={profile.data.display_name} email={customer.email} />
      </section>
    </main>
  );
}
