import { randomUUID } from "node:crypto";
import { db, failed, sameOrigin, user } from "@/lib/server";

const formats: Record<
  string,
  { extension: string; matches: (b: Buffer) => boolean }
> = {
  "image/jpeg": {
    extension: "jpg",
    matches: (b) => b[0] === 255 && b[1] === 216 && b[2] === 255,
  },
  "image/png": {
    extension: "png",
    matches: (b) =>
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  "image/webp": {
    extension: "webp",
    matches: (b) =>
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
  "audio/mpeg": {
    extension: "mp3",
    matches: (b) =>
      b.toString("ascii", 0, 3) === "ID3" ||
      (b[0] === 255 && (b[1] & 224) === 224),
  },
};

export async function POST(req: Request) {
  if (!sameOrigin(req)) return failed("Invalid origin.", 403);
  const customer = await user();
  if (!customer) return failed("Sign in to upload media.", 401);
  if (Number(req.headers.get("content-length")) > 3300000)
    return failed("Maximum upload size is 3 MB.", 413);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 3145728)
    return failed("Choose a file up to 3 MB.");
  const format = formats[file.type];
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!format || !format.matches(bytes))
    return failed("Upload a valid JPEG, PNG, WebP, or MP3.");
  const path = customer.id + "/" + randomUUID() + "." + format.extension;
  const database = db();
  const bucket = database.storage.from("invitation-media");
  const result = await bucket.upload(path, bytes, { contentType: file.type });
  if (result.error) return failed("Upload failed.", 503);
  const record = await database
    .from("invitation_assets")
    .insert({ path, owner: customer.id });
  if (record.error) {
    await bucket.remove([path]);
    return failed("Could not register upload.", 503);
  }
  const { data, error } = await bucket.createSignedUrl(path, 3600);
  if (error) return failed("Could not preview upload.", 503);
  return Response.json({ path, url: data.signedUrl });
}
