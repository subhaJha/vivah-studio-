import { z } from "zod";

const text = (length: number) => z.string().trim().max(length);
const url = z.union([z.literal(""), z.url({ protocol: /^https$/ })]);
const asset = z.union([
  z.literal(""),
  z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|mp3)$/),
]);
export const slugSchema = z
  .string()
  .min(3)
  .max(72)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const draftSchema = z.object({
  template: z.enum([
    "royal-bengali",
    "ivory-dreams",
    "palace-affair",
    "blush-bloom",
    "golden-hour",
    "midnight-vows",
  ]),
  bride: text(60),
  groom: text(60),
  message: text(800),
  date: z.union([z.literal(""), z.iso.date()]),
  time: z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]),
  venue: text(160),
  address: text(300),
  maps: url,
  photo: asset,
  music: asset,
  color: z.union([z.literal(""), z.string().regex(/^#[a-fA-F0-9]{6}$/)]),
  font: z.enum(["serif", "sans"]),
  background: z.enum(["classic", "pattern"]),
  ornaments: z.boolean(),
  motion: z.boolean(),
  rsvp: z.boolean(),
  slug: text(72),
  events: z
    .array(
      z.object({
        name: text(80),
        date: z.union([z.literal(""), z.iso.date()]),
        time: text(5),
        venue: text(160),
      }),
    )
    .max(20),
});
export const publishSchema = draftSchema.refine(
  (d) =>
    d.bride &&
    d.groom &&
    d.date &&
    d.venue &&
    slugSchema.safeParse(d.slug).success,
  "Enter both names, a wedding date, a venue, and a lowercase link slug with optional hyphens.",
);
export const rsvpSchema = z
  .object({
    name: text(100).pipe(z.string().min(1)),
    attending: z.boolean(),
    guests: z.number().int().min(0).max(12),
    message: text(500),
  })
  .refine((r) => (r.attending ? r.guests > 0 : r.guests === 0));
export type Draft = z.infer<typeof draftSchema>;
export const emptyDraft: Draft = {
  template: "royal-bengali",
  bride: "",
  groom: "",
  message:
    "Together with our families, we invite you to celebrate our wedding.",
  date: "",
  time: "",
  venue: "",
  address: "",
  maps: "",
  photo: "",
  music: "",
  color: "",
  font: "serif",
  background: "classic",
  ornaments: true,
  motion: true,
  rsvp: true,
  slug: "",
  events: [],
};
export const sampleDraft: Draft = {
  ...emptyDraft,
  bride: "Ananya",
  groom: "Arjun",
  date: "2027-02-14",
  time: "18:30",
  venue: "The Grand Palace, Kolkata",
  address: "Kolkata, West Bengal",
  events: [
    { name: "Haldi", date: "2027-02-13", time: "11:00", venue: "Courtyard" },
    { name: "Wedding", date: "2027-02-14", time: "18:30", venue: "Grand Hall" },
    {
      name: "Reception",
      date: "2027-02-15",
      time: "19:00",
      venue: "Grand Hall",
    },
  ],
};
export function dateLabel(date: string) {
  return date
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(date + "T00:00:00Z"))
    : "";
}
