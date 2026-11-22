import Link from "next/link";
import { z } from "zod";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { configured, db, user } from "@/lib/server";
import { manage } from "./actions";
import { Chart } from "./chart";

const tabs = [
  "overview",
  "invitations",
  "customers",
  "templates",
  "orders",
  "rsvps",
] as const;
const filters = {
  overview: [],
  orders: ["Paid", "Pending", "Failed"],
  templates: ["Active", "Hidden"],
  customers: ["Active", "Suspended"],
  invitations: ["Published", "Draft"],
  rsvps: ["Accepted", "Declined"],
};
const labels = {
  overview: "Overview",
  orders: "Orders & payments",
  templates: "Templates",
  customers: "Customers",
  invitations: "Invitations",
  rsvps: "Guest RSVPs",
};
const limit = 20;
type Row = {
  id: string;
  name: string;
  status: string;
  detail: string;
  price?: number;
  active?: boolean;
  slug?: string;
  invitation?: string;
};
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value / 100,
  );

export const dynamic = "force-dynamic";

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    page?: string;
    q?: string;
    filter?: string;
    result?: string;
    invitation?: string;
  }>;
}) {
  if (!configured())
    return (
      <main className="mx-auto max-w-3xl px-5 py-14">
        <Link href="/" className="text-sm font-semibold text-wine underline">
          Vivah Studio
        </Link>
        <section className="mt-6 rounded-3xl border bg-white p-8 shadow-soft sm:p-12">
          <p className="font-semibold text-wine">Admin setup</p>
          <h1 className="serif mt-2 text-5xl">Studio administration</h1>
          <p className="mt-5 text-muted">
            Connect Supabase to enable this workspace, then assign the admin
            role to your account.
          </p>
          <ul className="mt-7 grid gap-3 text-sm sm:grid-cols-2">
            {tabs
              .filter((tab) => tab !== "overview")
              .map((tab) => (
                <li key={tab} className="rounded-xl border px-4 py-3">
                  {labels[tab]}
                </li>
              ))}
          </ul>
          <Button asChild className="mt-7">
            <Link href="/dashboard">Return to your studio</Link>
          </Button>
        </section>
      </main>
    );
  const admin = await user();
  if (!admin) redirect("/login?next=admin");
  if (admin?.app_metadata.role !== "admin") notFound();
  const query = await searchParams;
  const view = tabs.find((tab) => tab === query.view) ?? "overview";
  const filter = filters[view].find((status) => status === query.filter) ?? "";
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.page ?? "1", 10) || 1),
  );
  const search = (query.q ?? "").replace(/[%_,()]/g, "").slice(0, 80);
  const dbClient = db();
  const metrics = await dbClient.rpc("studio_admin_overview");
  if (metrics.error) throw metrics.error;
  const overview = metrics.data as {
    customers: number;
    invitations: number;
    published: number;
    orders: number;
    revenue: number;
    templates: { name: string; value: number }[];
    months: { name: string; value: number }[];
  };
  const first = (page - 1) * limit;
  const last = first + limit - 1;
  let rows: Row[] = [];
  let count = 0;
  if (view === "orders") {
    let orders = dbClient
      .from("studio_admin_orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(first, last);
    if (search) orders = orders.ilike("provider_order", "%" + search + "%");
    if (filter) orders = orders.eq("status", filter);
    const result = await orders;
    if (result.error) throw result.error;
    count = result.count ?? 0;
    rows = result.data.map((o) => ({
      id: o.provider_order,
      name: o.provider_order,
      status: o.status,
      detail: money(o.amount) + " · " + o.template,
      invitation: o.invitation,
    }));
  }
  if (view === "templates") {
    let list = dbClient
      .from("templates")
      .select("*", { count: "exact" })
      .order("title")
      .range(first, last);
    if (search) list = list.ilike("title", "%" + search + "%");
    if (filter) list = list.eq("active", filter === "Active");
    const result = await list;
    if (result.error) throw result.error;
    count = result.count ?? 0;
    rows = result.data.map((t) => ({
      id: t.id,
      name: t.title,
      status: t.active ? "Active" : "Hidden",
      detail: money(t.price),
      price: t.price,
      active: t.active,
    }));
  }
  if (view === "customers") {
    let list = dbClient
      .from("studio_admin_customers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(first, last);
    if (search) list = list.ilike("email", "%" + search + "%");
    if (filter) list = list.eq("banned", filter === "Suspended");
    const result = await list;
    if (result.error) throw result.error;
    count = result.count ?? 0;
    rows = result.data.map((p) => ({
      id: p.id,
      name: p.display_name || p.email,
      status: p.banned ? "Suspended" : "Active",
      detail: p.email,
    }));
  }
  if (view === "invitations") {
    let list = dbClient
      .from("studio_admin_invitations")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(first, last);
    if (search) list = list.ilike("name", "%" + search + "%");
    if (filter)
      list =
        filter === "Published"
          ? list.not("slug", "is", null)
          : list.is("slug", null);
    const result = await list;
    if (result.error) throw result.error;
    count = result.count ?? 0;
    rows = result.data.map((i) => ({
      id: i.id,
      name: i.name,
      status: i.slug ? "Published" : "Draft",
      detail: i.template,
      slug: i.slug ?? undefined,
      invitation: i.id,
    }));
  }
  const invitation = z.uuid().safeParse(query.invitation);
  if (view === "rsvps") {
    let list = dbClient
      .from("rsvp_responses")
      .select("id,name,attending,guests,message,invitation", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(first, last);
    if (search) list = list.ilike("name", "%" + search + "%");
    if (filter) list = list.eq("attending", filter === "Accepted");
    if (invitation.success) list = list.eq("invitation", invitation.data);
    const result = await list;
    if (result.error) throw result.error;
    count = result.count ?? 0;
    rows = result.data.map((guest) => ({
      id: String(guest.id),
      name: guest.name,
      status: guest.attending ? "Accepted" : "Declined",
      detail:
        [guest.attending ? guest.guests + " attending" : "", guest.message]
          .filter(Boolean)
          .join(" · ") || "—",
      invitation: guest.invitation,
    }));
  }
  const href = (number: number) =>
    "/admin?" +
    new URLSearchParams({
      view,
      page: String(number),
      q: search,
      filter,
      ...(invitation.success ? { invitation: invitation.data } : {}),
    });
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <Link className="text-sm text-wine underline" href="/dashboard">
        Customer dashboard
      </Link>
      <h1 className="serif mt-2 text-5xl">Studio administration</h1>
      <nav aria-label="Manage studio" className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            asChild
            variant={view === tab ? "default" : "outline"}
          >
            <Link
              href={tab === "overview" ? "/admin" : "/admin?view=" + tab}
              aria-current={view === tab ? "page" : undefined}
            >
              {labels[tab]}
            </Link>
          </Button>
        ))}
      </nav>
      {view === "overview" && (
        <>
          <dl className="my-7 grid grid-cols-2 gap-3 md:grid-cols-5">
            {Object.entries({
              Customers: overview.customers,
              Invitations: overview.invitations,
              Published: overview.published,
              Orders: overview.orders,
              Revenue: money(overview.revenue),
            }).map(([name, value]) => (
              <div className="rounded-2xl border bg-white p-4" key={name}>
                <dt className="text-sm text-muted">{name}</dt>
                <dd className="mt-1 text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="min-w-0 rounded-2xl border bg-white p-5">
              <h2 className="mb-4 serif text-2xl">Captured revenue</h2>
              <Chart label="INR" data={overview.months} />
            </section>
            <section className="min-w-0 rounded-2xl border bg-white p-5">
              <h2 className="mb-4 serif text-2xl">Template use</h2>
              <Chart label="Invitations" data={overview.templates} />
            </section>
          </div>
        </>
      )}
      {view !== "overview" && (
        <section className="mt-8 rounded-2xl border bg-white p-5">
          <h2 className="serif text-3xl">{labels[view]}</h2>
          {view === "orders" && (
            <p className="mt-2 text-sm text-muted">
              Payment status follows verified Razorpay events.
            </p>
          )}
          {view === "rsvps" && invitation.success && (
            <Link
              href="/admin?view=rsvps"
              className="mt-2 inline-block text-sm text-wine underline"
            >
              Show RSVPs for all invitations
            </Link>
          )}
          <form className="my-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="view" value={view} />
            {invitation.success && (
              <input type="hidden" name="invitation" value={invitation.data} />
            )}
            <label className="text-sm">
              Search {labels[view].toLowerCase()}
              <input
                name="q"
                className="field"
                defaultValue={search}
                maxLength={80}
              />
            </label>
            {filters[view].length > 0 && (
              <label className="text-sm">
                Status
                <select name="filter" className="field" defaultValue={filter}>
                  <option value="">All</option>
                  {filters[view].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            )}
            <Button variant="outline">Search</Button>
          </form>
          {query.result && (
            <p role="status" className="mb-3 text-sm">
              {query.result === "saved"
                ? "Change saved."
                : "Could not apply the change."}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="bg-cream">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <th scope="row" className="p-3 font-medium">
                      {row.name}
                    </th>
                    <td className="p-3">
                      <span className="rounded-full bg-cream px-2 py-1">
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3">{row.detail}</td>
                    <td className="p-3">
                      {view === "templates" && (
                        <form
                          action={manage}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="action" value="template" />
                          <label>
                            Title{" "}
                            <input
                              name="title"
                              defaultValue={row.name}
                              required
                              maxLength={90}
                              className="w-36 rounded border p-1"
                            />
                          </label>
                          <label>
                            Paise{" "}
                            <input
                              type="number"
                              name="amount"
                              className="w-24 rounded border p-1"
                              defaultValue={row.price}
                              min={1}
                              max={10000000}
                              required
                            />
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              defaultChecked={row.active}
                              name="active"
                            />{" "}
                            Active
                          </label>
                          <Button size="sm">Save</Button>
                        </form>
                      )}
                      {(view === "invitations" || view === "orders") &&
                        row.invitation && (
                          <Link
                            className="mr-3 inline-block text-wine underline"
                            href={
                              "/admin?view=rsvps&invitation=" + row.invitation
                            }
                          >
                            Guest RSVPs
                          </Link>
                        )}
                      {view === "invitations" && row.slug && (
                        <Link
                          className="inline-block text-wine underline"
                          href={"/invite/" + row.slug}
                          target="_blank"
                        >
                          Open site
                        </Link>
                      )}
                      {view === "rsvps" && (
                        <details>
                          <summary className="cursor-pointer text-wine">
                            Remove response
                          </summary>
                          <form action={manage} className="mt-2 grid gap-2">
                            <input
                              type="hidden"
                              name="action"
                              value="remove-rsvp"
                            />
                            <input type="hidden" name="id" value={row.id} />
                            <label>
                              <input name="confirm" type="checkbox" required />{" "}
                              Permanently remove this response
                            </label>
                            <Button size="sm" variant="outline">
                              Remove
                            </Button>
                          </form>
                        </details>
                      )}
                      {view === "invitations" && row.status === "Published" && (
                        <form action={manage}>
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            type="hidden"
                            name="action"
                            value="unpublish"
                          />
                          <Button variant="outline" size="sm">
                            Unpublish
                          </Button>
                        </form>
                      )}
                      {view === "customers" && row.id !== admin.id && (
                        <form action={manage}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="action" value="customer" />
                          <input
                            type="hidden"
                            name="restore"
                            value={String(row.status === "Suspended")}
                          />
                          <Button variant="outline" size="sm">
                            {row.status === "Suspended" ? "Restore" : "Suspend"}
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p className="p-4">No matching records.</p>}
          <div className="mt-4 flex items-center gap-4">
            {page > 1 && (
              <Link className="underline" href={href(page - 1)}>
                Previous
              </Link>
            )}
            <span className="text-sm">
              Page {page} · {count} records
            </span>
            {page * limit < count && (
              <Link className="underline" href={href(page + 1)}>
                Next
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
