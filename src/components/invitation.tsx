"use client";

import { useRef, useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { dateLabel, type Draft } from "@/lib/invitation";
import { templates } from "@/lib/templates";

export function Invitation({
  draft,
  slug,
  editor = false,
  assets = {},
}: {
  draft: Draft;
  slug?: string;
  editor?: boolean;
  assets?: Record<string, string>;
}) {
  const template =
    templates.find((t) => t.id === draft.template) ?? templates[0];
  const cinematic = template.id === "royal-bengali" && !editor;
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState("");
  const [attending, setAttending] = useState(true);
  const curtains = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const photo =
    assets[draft.photo] ||
    (!editor && !slug && cinematic ? "/bengali-wedding.webp" : undefined);
  const audio = assets[draft.music];

  async function open() {
    setOpening(true);
    const reveal = () => {
      setOpened(true);
      requestAnimationFrame(() => title.current?.focus());
    };
    const fallback = setTimeout(reveal, 2800);
    try {
      if (
        draft.motion &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches &&
        curtains.current
      ) {
        const { gsap } = await import("gsap");
        const [left, right] = Array.from(
          curtains.current?.querySelectorAll("i") ?? [],
        );
        if (left && right)
          await gsap
            .timeline({ defaults: { duration: 0.95, ease: "power3.inOut" } })
            .to(left, { xPercent: -102 }, 0)
            .to(right, { xPercent: 102 }, 0);
      }
    } catch {
      // The invitation remains accessible if the animation module cannot load.
    } finally {
      clearTimeout(fallback);
      if (curtains.current) reveal();
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <article
        data-motion={draft.motion && (!cinematic || opened) ? "on" : "off"}
        style={{ background: template.theme, color: template.accent }}
        className={
          "invitation " + template.id + (draft.font === "serif" ? " serif" : "")
        }
      >
        <div
          className="relative isolate overflow-hidden"
          inert={cinematic && !opened ? true : undefined}
        >
          <section
            className={
              "invitation-hero relative grid min-h-[min(780px,85svh)] place-content-center px-8 py-24 text-center " +
              (draft.background === "pattern" ? "pattern" : "")
            }
          >
            {draft.ornaments && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-5 invitation-frame border border-current opacity-40"
              />
            )}
            {draft.ornaments && (
              <div
                className="invitation-ornament pointer-events-none mb-7 text-5xl"
                aria-hidden
              >
                {template.flower}
              </div>
            )}
            <p className="invitation-arrive text-xs uppercase tracking-[.22em]">
              Together with our families
            </p>
            <h1
              ref={title}
              tabIndex={-1}
              className="invitation-arrive invitation-names my-8 text-5xl sm:text-7xl"
            >
              {draft.bride || "Bride"} <em>&amp;</em> {draft.groom || "Groom"}
            </h1>
            <p className="invitation-arrive invitation-message mx-auto max-w-md leading-relaxed">
              {draft.message}
            </p>
            <p className="invitation-arrive invitation-date mt-8 text-lg">
              {dateLabel(draft.date)}
            </p>
            {!editor && (
              <a
                href="#celebration"
                className="invitation-arrive invitation-date mx-auto mt-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-current px-5 text-sm"
              >
                The celebration <span aria-hidden>↓</span>
              </a>
            )}
          </section>
        </div>
        {cinematic && !opened && (
          <div
            className="fixed inset-0 z-20 flex items-center justify-center overflow-hidden text-[#f6d69f]"
            ref={curtains}
          >
            <i className="silk-curtain absolute inset-y-0 left-0 w-1/2 border-r-2 border-[#bb8b50]" />
            <i className="silk-curtain absolute inset-y-0 right-0 w-1/2 border-l-2 border-[#bb8b50]" />
            <div className="relative p-8 text-center">
              <div
                className="invitation-curtain-crest mb-5 text-5xl"
                aria-hidden
              >
                ❦
              </div>
              <p className="mb-6 text-2xl">
                {draft.bride} &amp; {draft.groom}
              </p>
              <Button
                variant="outline"
                disabled={opening}
                onClick={() => void open()}
              >
                {opening ? "Opening…" : "Open invitation"}
              </Button>
            </div>
          </div>
        )}
        <div
          id={editor ? undefined : "celebration"}
          hidden={cinematic && !opened}
          style={{ borderColor: draft.color || template.accent }}
          className="invitation-celebration border-t-4 bg-[#fcf5eb] px-7 py-16 text-center text-[#522b35]"
        >
          {photo && (
            <section aria-label="The couple">
              <div className="invitation-reveal mx-auto mb-10 max-w-lg overflow-hidden rounded-t-[12rem] shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${draft.bride} and ${draft.groom}`}
                  src={photo}
                  loading="lazy"
                  className="w-full object-cover"
                />
              </div>
              <p className="mx-auto mb-9 max-w-sm italic">{draft.message}</p>
            </section>
          )}
          {audio && (
            <audio
              className="mx-auto mb-8 max-w-full"
              src={audio}
              preload="none"
              controls
              aria-label="Background music"
            />
          )}
          <section className="invitation-reveal mx-auto max-w-xl rounded-3xl border border-[#d6b992] bg-white/70 px-6 py-10">
            <span className="mb-3 block text-3xl text-wine" aria-hidden>
              {template.flower}
            </span>
            <h2 className="text-4xl">The wedding</h2>
            <p className="mt-4">
              {[dateLabel(draft.date), draft.time].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-3 text-lg font-semibold">{draft.venue}</p>
            <p>{draft.address}</p>
            {draft.maps && (
              <a
                className="mt-4 inline-flex min-h-11 items-center underline"
                href={draft.maps}
                target="_blank"
                rel="noreferrer"
              >
                Get directions
              </a>
            )}
          </section>
          {draft.events.length > 0 && (
            <section className="mx-auto mt-16 max-w-xl">
              <h2 className="invitation-reveal mb-7 text-4xl">
                Celebration itinerary
              </h2>
              <ol className="grid gap-3">
                {draft.events.map((event, i) => (
                  <motion.li
                    key={i}
                    initial={
                      draft.motion && !editor ? { opacity: 0, y: 12 } : false
                    }
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.55,
                      delay: Math.min(i, 4) * 0.07,
                    }}
                    className="rounded-2xl border border-[#dec7ad] bg-white p-5 shadow-soft"
                  >
                    <strong>{event.name}</strong>
                    <p>
                      {[dateLabel(event.date), event.time, event.venue]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </motion.li>
                ))}
              </ol>
            </section>
          )}
          {draft.rsvp && (
            <section className="invitation-reveal mx-auto mt-16 max-w-md rounded-3xl border border-[#dec7ad] bg-white/75 p-6">
              <h2 className="mb-4 text-3xl">Kindly RSVP</h2>
              {slug ? (
                <form
                  className="grid gap-3 text-left"
                  action={async (form) => {
                    setNotice("Sending…");
                    try {
                      const response = await fetch("/api/rsvp/" + slug, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: form.get("name"),
                          attending,
                          guests: attending ? Number(form.get("guests")) : 0,
                          message: form.get("message"),
                        }),
                      });
                      setNotice(
                        response.ok
                          ? "Thank you. Your RSVP was received."
                          : response.status === 429
                            ? "Too many submissions. Please try again later."
                            : "We could not accept the RSVP. Check your details and try again.",
                      );
                    } catch {
                      setNotice(
                        "The RSVP could not be sent. Please try again.",
                      );
                    }
                  }}
                >
                  <label>
                    Your name
                    <input
                      name="name"
                      maxLength={100}
                      required
                      className="field"
                    />
                  </label>
                  <label>
                    Attendance
                    <select
                      className="field"
                      value={String(attending)}
                      onChange={(e) => setAttending(e.target.value === "true")}
                    >
                      <option value="true">Joyfully accept</option>
                      <option value="false">Regretfully decline</option>
                    </select>
                  </label>
                  {attending && (
                    <label>
                      Guest count
                      <input
                        className="field"
                        type="number"
                        name="guests"
                        min={1}
                        max={12}
                        defaultValue={1}
                        required
                      />
                    </label>
                  )}
                  <label>
                    Message (optional)
                    <textarea
                      className="field"
                      name="message"
                      maxLength={500}
                    />
                  </label>
                  <Button type="submit">Send RSVP</Button>
                  <p role="status">{notice}</p>
                </form>
              ) : (
                <p>RSVP opens on the published invitation.</p>
              )}
            </section>
          )}
          {slug && (
            <Button
              variant="outline"
              className="mt-10"
              onClick={() =>
                window.open(
                  "https://wa.me/?text=" + encodeURIComponent(location.href),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Share on WhatsApp
            </Button>
          )}
          <p className="mt-10 text-xl italic">
            Thank you for being part of our story.
          </p>
        </div>
      </article>
    </MotionConfig>
  );
}
