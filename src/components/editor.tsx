"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Invitation } from "@/components/invitation";
import { draftSchema, publishSchema, type Draft } from "@/lib/invitation";
import { templates } from "@/lib/templates";

type CheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  handler: (receipt: Record<string, string>) => void;
  modal: { ondismiss: () => void };
};
type RazorpayWindow = Window & {
  Razorpay?: new (options: CheckoutOptions) => {
    open: () => void;
    on: (name: string, fn: () => void) => void;
  };
};
const events = [
  "Engagement",
  "Haldi",
  "Mehendi",
  "Sangeet",
  "Wedding ceremony",
  "Reception",
  "Custom event",
];
const tabs = [
  "Couple",
  "Wedding",
  "Events",
  "Design",
  "Music",
  "Sharing",
  "RSVP",
] as const;
const demoKey = "vivah-studio-draft-v2";
const labelClass = "block text-sm font-medium";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={labelClass}>
      {label}
      {children}
    </label>
  );
}

export function Editor({
  id,
  initial,
  revision,
  published,
  paymentMode,
  demo = false,
  accountAvailable = true,
  initialAssets = {},
}: {
  id: string;
  initial: Draft;
  revision: number;
  published?: string;
  paymentMode: boolean;
  demo?: boolean;
  accountAvailable?: boolean;
  initialAssets?: Record<string, string>;
}) {
  const { register, control, getValues, setValue, reset } = useForm<Draft>({
    defaultValues: initial,
  });
  const timeline = useFieldArray({ control, name: "events" });
  const values = useWatch({ control, defaultValue: initial }) as Draft;
  const json = JSON.stringify(values);
  const saved = useRef(JSON.stringify(initial));
  const version = useRef(revision);
  const pending = useRef<Promise<boolean> | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Couple");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [live, setLive] = useState(published);
  const [qr, setQr] = useState("");
  const [ready, setReady] = useState(!demo);

  useEffect(() => {
    if (!demo) return;
    try {
      const stored = JSON.parse(localStorage.getItem(demoKey) ?? "null");
      const parsed = draftSchema.safeParse(stored);
      if (parsed.success) {
        const data = {
          ...parsed.data,
          photo: "",
          music: "",
          template:
            stored.entryTemplate === initial.template
              ? parsed.data.template
              : initial.template,
        };
        reset(data);
        saved.current = JSON.stringify(data);
      }
    } catch {
      /* The demo can start with an empty draft. */
    }
    const readyTimer = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(readyTimer);
  }, [demo, initial.template, reset]);

  async function request(action: "save" | "publish", draft: Draft) {
    const response = await fetch("/api/workspace", {
      signal: AbortSignal.timeout(15000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, revision: version.current, draft, action }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result as { revision: number; slug?: string };
  }

  const save = useRef<(manual?: boolean) => Promise<boolean>>(
    async () => false,
  );
  useEffect(() => {
    save.current = async (manual = false) => {
      while (pending.current) await pending.current;
      const draft = getValues();
      const snapshot = JSON.stringify(draft);
      if (
        snapshot === saved.current &&
        (!manual || demo || version.current > 0)
      )
        return true;
      const parsed = draftSchema.safeParse(draft);
      if (!parsed.success) {
        if (manual)
          setNotice(
            parsed.error.issues[0].path.join(".") +
              ": " +
              parsed.error.issues[0].message,
          );
        return false;
      }
      const operation = (async () => {
        try {
          if (demo) {
            localStorage.setItem(
              demoKey,
              JSON.stringify({
                ...parsed.data,
                entryTemplate: initial.template,
              }),
            );
          } else {
            const result = await request("save", parsed.data);
            if (version.current === 0)
              history.replaceState(null, "", "/editor?id=" + id);
            version.current = result.revision;
          }
          saved.current = snapshot;
          setNotice(demo ? "Draft saved in this browser." : "Draft saved.");
          return true;
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Could not save your draft.",
          );
          return false;
        } finally {
          pending.current = null;
        }
      })();
      // The demo write has no await and completes immediately.
      if (!demo) pending.current = operation;
      return operation;
    };
  });
  useEffect(() => {
    if (!ready || json === saved.current) return;
    const timer = setTimeout(() => void save.current(), 750);
    return () => clearTimeout(timer);
  }, [json, ready]);
  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(getValues()) === saved.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [getValues]);

  async function upload(file: File | undefined, field: "photo" | "music") {
    if (!file) return;
    if (file.size > 3145728) {
      setNotice("Select a file up to 3 MB.");
      return;
    }
    setWorking(true);
    try {
      if (demo) {
        const path =
          field === "photo"
            ? "00000000-0000-0000-0000-000000000000/00000000-0000-0000-0000-000000000001.jpg"
            : "00000000-0000-0000-0000-000000000000/00000000-0000-0000-0000-000000000002.mp3";
        setAssets((prev) => ({ ...prev, [path]: URL.createObjectURL(file) }));
        setValue(field, path);
        setNotice("Media added for this preview session.");
      } else {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/asset", {
          signal: AbortSignal.timeout(20000),
          method: "POST",
          body: form,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setAssets((prev) => ({ ...prev, [result.path]: result.url }));
        setValue(field, result.path);
        setNotice("Media uploaded.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setWorking(false);
    }
  }

  async function publish() {
    const parsed = publishSchema.safeParse(getValues());
    if (!parsed.success) {
      setNotice(parsed.error.issues[0].message);
      return;
    }
    setWorking(true);
    try {
      if (!(await save.current(true))) return;
      const result = await request("publish", parsed.data);
      setLive(result.slug);
      setQr("");
      setNotice("Invitation published. Your guest link is ready.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Publishing failed.");
    } finally {
      setWorking(false);
    }
  }

  async function checkout() {
    setWorking(true);
    setNotice("Preparing checkout…");
    try {
      if (!(await save.current(true))) return;
      if (!paymentMode) {
        setNotice(
          "Demo checkout complete. No payment was collected and no publishing entitlement was created.",
        );
        return;
      }
      const win = window as RazorpayWindow;
      if (!win.Razorpay)
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          const fail = () => {
            clearTimeout(timeout);
            script.remove();
            reject(new Error("Checkout could not load. Please try again."));
          };
          const timeout = setTimeout(fail, 12000);
          script.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
          script.onerror = fail;
          document.head.append(script);
        });
      if (!win.Razorpay) throw new Error("Checkout could not load.");
      const response = await fetch("/api/checkout", {
        signal: AbortSignal.timeout(15000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.message);
      const control = new win.Razorpay({
        key: order.key,
        order_id: order.order,
        amount: order.amount,
        currency: "INR",
        name: "Vivah Studio",
        handler: async (receipt) => {
          setNotice("Verifying payment…");
          try {
            const verified = await fetch("/api/checkout/verify", {
              signal: AbortSignal.timeout(15000),
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(receipt),
            });
            const result = await verified.json();
            if (!verified.ok) throw new Error(result.message);
            setNotice(
              result.status === "captured"
                ? "Payment verified. Your invitation is ready to publish."
                : result.status === "failed"
                  ? "Payment failed. Check your order history before retrying."
                  : "Payment submitted. Try publishing once the payment is captured.",
            );
          } catch {
            setNotice(
              "Check your order history for payment status before retrying.",
            );
          }
        },
        modal: {
          ondismiss: () =>
            setNotice(
              "Checkout closed. You can retry if payment was incomplete.",
            ),
        },
      });
      control.on("payment.failed", () =>
        setNotice("Payment failed. You can retry checkout."),
      );
      control.open();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setWorking(false);
    }
  }

  const link = () => location.origin + "/invite/" + live;
  function leave(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      JSON.stringify(getValues()) !== saved.current &&
      !confirm("Leave the editor with unsaved changes?")
    )
      event.preventDefault();
  }

  return (
    <main className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-5 py-4">
        <div>
          <Link
            href={demo ? "/templates" : "/dashboard"}
            onClick={leave}
            className="text-sm text-wine underline"
          >
            {demo ? "Templates" : "Dashboard"}
          </Link>
          <h1 className="serif text-2xl">Invitation editor</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={working || !ready}
            onClick={() =>
              void save.current(true).then((ok) => {
                if (ok)
                  setNotice(
                    demo ? "Draft saved in this browser." : "Draft saved.",
                  );
              })
            }
          >
            Save draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={working || !ready}
            onClick={() => void checkout()}
          >
            {paymentMode ? "Checkout" : "Demo checkout"}
          </Button>
          {demo ? (
            accountAvailable && (
              <Button size="sm" asChild>
                <Link href="/login" onClick={leave}>
                  Sign in to publish
                </Link>
              </Button>
            )
          ) : (
            <Button
              size="sm"
              disabled={working || !ready}
              onClick={() => void publish()}
            >
              Publish
            </Button>
          )}
        </div>
      </header>
      <p aria-live="polite" className="min-h-10 px-5 py-2 text-sm text-wine">
        {notice ||
          (demo
            ? "Demo workspace · Drafts stay in this browser. Uploaded media is previewed for this session."
            : live
              ? "Published · Draft edits are private until republished."
              : "Private draft")}
      </p>
      <div className="grid lg:grid-cols-[minmax(310px,380px)_1fr]">
        <details open className="border-b border-r bg-white p-5">
          <summary className="mb-3 cursor-pointer font-semibold">
            Customization
          </summary>
          <div className="flex flex-wrap gap-1 border-b pb-3">
            {tabs.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={tab === item}
                onClick={() => setTab(item)}
                className={`rounded-lg px-3 py-2 text-sm ${tab === item ? "bg-wine text-white" : "text-wine"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4">
            {tab === "Couple" && (
              <>
                <Field label="Bride name">
                  <input
                    className="field"
                    maxLength={60}
                    {...register("bride")}
                  />
                </Field>
                <Field label="Groom name">
                  <input
                    className="field"
                    maxLength={60}
                    {...register("groom")}
                  />
                </Field>
                <Field label="Introduction">
                  <textarea
                    className="field"
                    maxLength={800}
                    rows={4}
                    {...register("message")}
                  />
                </Field>
                <Field label="Couple photo (JPEG, PNG, WebP)">
                  <input
                    className="field"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={working}
                    onChange={(event) =>
                      void upload(event.target.files?.[0], "photo")
                    }
                  />
                </Field>
                {values.photo && (
                  <Button
                    variant="outline"
                    onClick={() => setValue("photo", "")}
                  >
                    Remove photo
                  </Button>
                )}
              </>
            )}
            {tab === "Wedding" && (
              <>
                <Field label="Date">
                  <input type="date" className="field" {...register("date")} />
                </Field>
                <Field label="Time">
                  <input type="time" className="field" {...register("time")} />
                </Field>
                <Field label="Venue">
                  <input
                    className="field"
                    maxLength={160}
                    {...register("venue")}
                  />
                </Field>
                <Field label="Address">
                  <textarea
                    className="field"
                    maxLength={300}
                    {...register("address")}
                  />
                </Field>
                <Field label="Google Maps link">
                  <input
                    className="field"
                    type="url"
                    placeholder="https://maps.google.com/…"
                    {...register("maps")}
                  />
                </Field>
              </>
            )}
            {tab === "Events" && (
              <>
                {timeline.fields.map((event, index) => (
                  <fieldset
                    key={event.id}
                    className="grid gap-2 rounded-xl border p-3"
                  >
                    <legend className="px-2">Event {index + 1}</legend>
                    <Field label="Name">
                      <input
                        className="field"
                        maxLength={80}
                        {...register(`events.${index}.name`)}
                      />
                    </Field>
                    <Field label="Date">
                      <input
                        className="field"
                        type="date"
                        {...register(`events.${index}.date`)}
                      />
                    </Field>
                    <Field label="Time">
                      <input
                        className="field"
                        type="time"
                        {...register(`events.${index}.time`)}
                      />
                    </Field>
                    <Field label="Venue">
                      <input
                        className="field"
                        maxLength={160}
                        {...register(`events.${index}.venue`)}
                      />
                    </Field>
                    <Button
                      variant="outline"
                      onClick={() => timeline.remove(index)}
                    >
                      Remove event
                    </Button>
                  </fieldset>
                ))}
                <Field label="Add an event">
                  <select
                    className="field"
                    value=""
                    disabled={timeline.fields.length >= 20}
                    onChange={(e) =>
                      timeline.append({
                        name: e.target.value,
                        date: "",
                        time: "",
                        venue: "",
                      })
                    }
                  >
                    <option value="" disabled>
                      Choose event type
                    </option>
                    {events.map((event) => (
                      <option key={event}>{event}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            {tab === "Design" && (
              <>
                <Field label="Template">
                  <select className="field" {...register("template")}>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Accent color">
                  <input
                    type="color"
                    value={values.color || "#7c243e"}
                    className="mt-2 block h-10 w-16"
                    onChange={(e) => setValue("color", e.target.value)}
                  />
                </Field>
                {values.color && (
                  <Button
                    variant="outline"
                    onClick={() => setValue("color", "")}
                  >
                    Restore template accent
                  </Button>
                )}
                <Field label="Typography">
                  <select className="field" {...register("font")}>
                    <option value="serif">Classic serif</option>
                    <option value="sans">Modern sans serif</option>
                  </select>
                </Field>
                <Field label="Background">
                  <select className="field" {...register("background")}>
                    <option value="classic">Classic</option>
                    <option value="pattern">Gold dots</option>
                  </select>
                </Field>
                <Field label="Show decorative ornaments ">
                  <input type="checkbox" {...register("ornaments")} />
                </Field>
                <Field label="Animate invitation ">
                  <input type="checkbox" {...register("motion")} />
                </Field>
              </>
            )}
            {tab === "Music" && (
              <>
                <Field label="Background music (MP3)">
                  <input
                    className="field"
                    type="file"
                    accept="audio/mpeg"
                    disabled={working}
                    onChange={(e) => void upload(e.target.files?.[0], "music")}
                  />
                </Field>
                <p className="text-sm text-muted">
                  Guests can play, pause, and mute music using the invitation’s
                  audio controls.
                </p>
                {values.music && (
                  <Button
                    variant="outline"
                    onClick={() => setValue("music", "")}
                  >
                    Remove music
                  </Button>
                )}
              </>
            )}
            {tab === "Sharing" && (
              <>
                <Field label="Link slug">
                  <input
                    className="field"
                    maxLength={72}
                    placeholder="ananya-and-arjun"
                    {...register("slug")}
                  />
                </Field>
                {live ? (
                  <>
                    <Link
                      className="underline"
                      href={"/invite/" + live}
                      target="_blank"
                    >
                      Open published invitation
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(link())
                          .then(() => setNotice("Link copied."))
                          .catch(() =>
                            setNotice(
                              "Copy from the published invitation address bar.",
                            ),
                          )
                      }
                    >
                      Copy link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          "https://wa.me/?text=" + encodeURIComponent(link()),
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      Share on WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: "Wedding invitation",
                              url: link(),
                            });
                          } else {
                            await navigator.clipboard.writeText(link());
                            setNotice(
                              "Link copied. Paste it into your social post.",
                            );
                          }
                        } catch (error) {
                          if (!(
                            error instanceof DOMException &&
                            error.name === "AbortError"
                          ))
                            setNotice(
                              "Open the invitation and copy the link from the address bar.",
                            );
                        }
                      }}
                    >
                      Share invitation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void import("qrcode")
                          .then((module) =>
                            module.toDataURL(link(), { width: 250 }),
                          )
                          .then(setQr)
                          .catch(() => setNotice("QR code generation failed."))
                      }
                    >
                      Generate QR code
                    </Button>
                    {qr && (
                      <a href={qr} download="vivah-invitation.png">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qr}
                          alt="Download invitation QR code"
                          width={250}
                          height={250}
                        />
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    Share controls appear after publishing.
                  </p>
                )}
              </>
            )}
            {tab === "RSVP" && (
              <>
                <Field label="Collect RSVPs ">
                  <input type="checkbox" {...register("rsvp")} />
                </Field>
                <p className="text-sm text-muted">
                  Guests can enter their names, reply to your invitation, add
                  guest counts, and leave a message.
                </p>
              </>
            )}
          </div>
        </details>
        <section id="preview" className="min-w-0 px-3 pb-10 sm:px-8">
          <div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <h2 className="serif text-2xl">Live preview</h2>
            <div className="flex gap-2">
              {(["mobile", "desktop"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  aria-pressed={device === mode}
                  variant={device === mode ? "default" : "outline"}
                  onClick={() => setDevice(mode)}
                >
                  {mode === "mobile" ? "Mobile" : "Desktop"}
                </Button>
              ))}
            </div>
          </div>
          <div
            className={`mx-auto overflow-hidden rounded-[1.75rem] border-[7px] border-[#342c2b] shadow-soft ${device === "mobile" ? "max-w-[380px]" : "max-w-5xl"}`}
          >
            <Invitation editor draft={values} assets={assets} />
          </div>
        </section>
      </div>
    </main>
  );
}
