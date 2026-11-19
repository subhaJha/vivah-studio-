"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Heart,
  Menu,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Template } from "@/lib/templates";
const navigation = [
  { label: "Home", href: "/" },
  { label: "Templates", href: "/templates" },
  { label: "Dashboard", href: "/dashboard" },
];
function money(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={"rounded-2xl border border-[#ece4dd] bg-white " + className}
    >
      {children}
    </div>
  );
}
function TemplateArt({
  template,
  compact = false,
  name = "Ananya & Arjun",
}: {
  template: Template;
  compact?: boolean;
  name?: string;
}) {
  const light = ["ivory-dreams", "blush-bloom"].includes(template.id);
  return (
    <div
      className={
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center " +
        (compact ? "min-h-[230px]" : "min-h-[390px]")
      }
      style={{ background: template.theme, color: template.accent }}
    >
      <div
        className="absolute inset-3 rounded-[90px_90px_12px_12px] border opacity-60"
        style={{ borderColor: template.accent }}
      />
      <div
        className="absolute inset-5 rounded-[80px_80px_8px_8px] border opacity-30"
        style={{ borderColor: template.accent }}
      />
      <div className="absolute left-3 top-4 text-5xl opacity-40">
        {template.flower}
      </div>
      <div className="absolute right-3 bottom-4 text-5xl opacity-40">
        {template.flower}
      </div>
      <div className="relative z-10 px-7">
        <div
          className={
            "text-[10px] tracking-[.34em] uppercase " +
            (light ? "text-[#886d52]" : "")
          }
        >
          Together with our families
        </div>
        <div
          className={"serif mt-6 " + (compact ? "text-3xl" : "text-5xl")}
          style={{ lineHeight: 1.2 }}
        >
          {name.split(" & ")[0]}
          <br />
          <span className="text-2xl italic">&</span>
          <br />
          {name.split(" & ")[1] || "Arjun"}
        </div>
        <div
          className="mx-auto my-5 h-px w-16"
          style={{ background: template.accent }}
        />
        <div className="text-[10px] tracking-[.25em] uppercase">
          request your presence
        </div>
        <div className="mt-3 text-xs">14 February 2027</div>
      </div>
    </div>
  );
}
function Tag({
  children,
  kind = "neutral",
}: {
  children: React.ReactNode;
  kind?: "neutral" | "green" | "gold";
}) {
  return (
    <span
      className={
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium " +
        (kind === "green"
          ? "bg-[#e9f5ee] text-[#29734a]"
          : kind === "gold"
            ? "bg-[#fff3e2] text-[#9b672f]"
            : "bg-[#f5f0ec] text-[#786b63]")
      }
    >
      {children}
    </span>
  );
}
function Header({ current }: { current: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#eee5df] bg-[#fbf8f4]/95 backdrop-blur">
      <div className="relative mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-9">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wine text-[#f8d9ae]">
            <Heart size={19} fill="currentColor" />
          </span>
          <span className="serif text-2xl font-bold tracking-tight">
            vivah<span className="text-wine">studio.</span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {navigation.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={current === href ? "page" : undefined}
              className={
                current === href
                  ? "text-sm font-bold text-wine"
                  : "text-sm text-[#6e625e] hover:text-wine"
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">My account</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/templates">
              Create invitation <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
        <details key={current} className="md:hidden">
          <summary
            aria-label="Toggle navigation"
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg [&::-webkit-details-marker]:hidden"
          >
            <Menu aria-hidden />
          </summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-full flex flex-col gap-1 border-t bg-white px-5 py-3 shadow-soft"
          >
            {navigation.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={current === href ? "page" : undefined}
                className="rounded-lg px-3 py-3 hover:bg-cream"
              >
                {label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
function Home({ catalog }: { catalog: Template[] }) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#f2e3d9] blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-9 lg:py-24">
          <div className="relative z-10 hero-copy">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e7d6c8] bg-white px-4 py-2 text-xs font-semibold tracking-wide text-wine">
              <Sparkles size={14} /> WEDDING INVITATIONS, REIMAGINED
            </span>
            <h1 className="serif mt-7 max-w-xl text-5xl leading-[1.12] tracking-tight sm:text-6xl lg:text-[72px]">
              Your Love Story Deserves a{" "}
              <em className="font-normal text-wine">Beautiful Beginning</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#796e68]">
              Create a wedding invitation as unforgettable as your big day.
              Stunning designs, cinematic animations, and a link worth sharing.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/templates">
                  Create Your Invitation <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/templates">
                  <Eye size={17} /> Explore Templates
                </Link>
              </Button>
            </div>
            <div className="mt-11 flex flex-wrap gap-7 text-sm text-[#6f645e]">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-[#50836b]" /> No coding
                needed
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-[#50836b]" /> Ready in
                minutes
              </span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[540px]">
            <div className="absolute -left-4 top-20 h-52 w-52 rounded-full bg-[#e9c7b3] blur-3xl" />
            <div className="relative mx-auto aspect-[.93] max-w-[430px] overflow-hidden rounded-t-[48%] rounded-b-[22px] border-[7px] border-white bg-white shadow-[0_28px_80px_#5b2e2b25]">
              <Image
                src="/bengali-wedding.webp"
                alt="Bengali bride and groom smiling together in traditional wedding attire"
                fill
                preload
                sizes="(max-width: 500px) 90vw, 430px"
                className="object-cover"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-3 rounded-t-[48%] rounded-b-[15px] border border-[#f4d5a8]/80"
              />
            </div>
            <Link
              href="/preview/royal-bengali"
              className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#ecddd2] bg-white px-5 py-3 text-sm font-semibold text-wine shadow-soft"
            >
              <Eye size={16} /> Preview Royal Bengali
            </Link>
          </div>
        </div>
      </section>
      <section className="border-y border-[#eee5dd] bg-white py-9">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-7 px-5 text-center text-sm text-muted md:justify-between">
          <span>Thoughtfully designed for every celebration</span>
          <span className="serif text-xl text-wine">✿ Bengali</span>
          <span className="serif text-xl text-wine">✧ Traditional</span>
          <span className="serif text-xl text-wine">❀ Modern</span>
          <span className="serif text-xl text-wine">✦ Royal</span>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-9">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-gold">
              CURATED WITH LOVE
            </div>
            <h2 className="serif text-4xl">Find your perfect beginning</h2>
            <p className="mt-3 text-muted">
              Handcrafted templates for your once-in-a-lifetime celebration.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/templates">
              View all templates <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.slice(0, 3).map((t) => (
            <TemplateTile key={t.id} template={t} />
          ))}
        </div>
      </section>
      <section className="bg-[#f4ece5] px-5 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[.2em] text-wine">
            YOUR STORY STARTS HERE
          </span>
          <h2 className="serif mt-4 text-4xl md:text-5xl">
            A little magic for your big day.
          </h2>
          <p className="mt-5 text-muted">
            Design your invitation, personalize every detail, and share it with
            everyone you love.
          </p>
          <Button asChild className="mt-7" size="lg">
            <Link href="/templates">
              Create your invitation <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
function TemplateTile({ template }: { template: Template }) {
  return (
    <Card className="group template-card overflow-hidden shadow-soft">
      <div className="relative h-[295px] overflow-hidden">
        <div className="h-full transition-transform duration-500 group-hover:scale-[1.035]">
          <TemplateArt template={template} compact />
        </div>
        <div className="absolute left-4 top-4">
          <Tag>{template.category}</Tag>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-5">
        <div>
          <h3 className="serif text-xl">{template.title}</h3>
          <p className="mt-1 text-xs text-muted">{template.description}</p>
          <div className="mt-2 text-sm font-bold text-wine">
            {money(template.price)}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={"/preview/" + template.id}>Preview</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={"/editor?template=" + template.id}>Customize</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
function Templates({ catalog }: { catalog: Template[] }) {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const shown = catalog.filter(
    (t) =>
      (category === "All" || t.category === category) &&
      `${t.title} ${t.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-9">
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-[.2em] text-wine">
          THE TEMPLATE COLLECTION
        </div>
        <h1 className="serif mt-3 text-4xl md:text-5xl">
          A design for every love story
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Explore our carefully crafted collection of digital wedding
          invitations. Choose the one that feels like you.
        </p>
      </div>
      <div className="mt-11 flex flex-wrap items-center justify-between gap-4">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-2">
          {["All", "Traditional", "Minimal", "Royal", "Floral", "Modern"].map(
            (c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm " +
                  (category === c
                    ? "bg-wine text-white"
                    : "border border-[#e9ded5] bg-white text-[#6f625d] hover:border-wine")
                }
              >
                {c}
              </button>
            ),
          )}
        </div>
        <div className="relative w-full sm:w-60">
          <Search size={16} className="absolute left-3 top-3 text-muted" />
          <input
            aria-label="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="h-10 w-full rounded-xl border border-[#e9ded5] bg-white pl-10 pr-3 text-sm"
          />
        </div>
      </div>
      <div className="mb-5 mt-5 text-sm text-muted">
        Showing {shown.length} templates
      </div>
      {shown.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <TemplateTile key={t.id} template={t} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-muted">
          No templates found. Try another search or category.
        </Card>
      )}
    </main>
  );
}

export default function Studio({
  initialPage = "home",
  catalog,
}: {
  initialPage?: string;
  catalog: Template[];
}) {
  const page = initialPage === "templates" ? "templates" : "home";
  return (
    <>
      <Header current={page === "home" ? "/" : "/templates"} />
      {page === "home" ? (
        <main>
          <Home catalog={catalog} />
          <section className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="serif text-4xl">How it works</h2>
            <ol className="my-8 grid gap-6 sm:grid-cols-3">
              <li>
                <strong>Choose a design</strong>
                <p>Open any of six animated invitations.</p>
              </li>
              <li>
                <strong>Make it yours</strong>
                <p>
                  Personalize your photos, music, wedding itinerary, and colors.
                </p>
              </li>
              <li>
                <strong>Invite your guests</strong>
                <p>Share a wedding link and collect RSVPs.</p>
              </li>
            </ol>
            <Button asChild>
              <Link href="/preview/royal-bengali">
                Open the Royal Bengali invitation
              </Link>
            </Button>
            <h2 className="serif mt-16 text-4xl">Pricing</h2>
            <p className="mt-4">
              Free to customize.{" "}
              {catalog.length
                ? `Publish from ₹${Math.min(...catalog.map((t) => t.price)).toLocaleString("en-IN")} with a one-time payment per invitation.`
                : "Publishing prices will appear when templates are available."}
            </p>
            <h2 className="serif mt-16 text-4xl">Testimonials</h2>
            <blockquote className="mt-4 border-l-2 border-wine pl-4 italic">
              “Seeing the curtain open felt like the start of our wedding.”{" "}
              <span className="not-italic">— Sample testimonial</span>
            </blockquote>
            <h2 className="serif mt-16 text-4xl">Frequently asked questions</h2>
            <details className="mt-4 border-b py-4">
              <summary>Can I preview my invitation before paying?</summary>
              <p className="mt-2">
                Yes. Use the editor to preview your invitation on mobile or
                desktop.
              </p>
            </details>
            <details className="border-b py-4">
              <summary>Do guests need an account?</summary>
              <p className="mt-2">
                Guests can open your published link and RSVP without signing in.
              </p>
            </details>
          </section>
        </main>
      ) : (
        <Templates catalog={catalog} />
      )}
      <footer className="border-t bg-white p-8 text-center text-sm text-muted">
        © Vivah Studio · <Link href="/templates">Templates</Link> ·{" "}
        <Link href="/dashboard">My account</Link>
      </footer>
    </>
  );
}
