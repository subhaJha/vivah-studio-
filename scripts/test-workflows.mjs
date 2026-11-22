import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import sharp from "sharp";

const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const invitation = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const submission = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const draft = {
  template: "royal-bengali",
  bride: "Ananya",
  groom: "Arjun",
  message: "Join us",
  date: "2027-01-14",
  time: "",
  venue: "Kolkata",
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
  slug: "test-wedding",
  events: [],
};
let savedDraft;
let uploaded;
let paymentCalls = 0;
let views = 0;
const rsvps = new Set();
const payments = new Set();
const provider = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const route = new URL(req.url, "http://test").pathname;
  let data;
  if (route === "/auth/v1/user") {
    data = {
      id: owner,
      aud: "authenticated",
      email: "studio@example.test",
      app_metadata: {},
      user_metadata: {},
    };
  } else if (route.endsWith("/save_studio_draft")) {
    const { p_draft } = JSON.parse(bytes);
    data = savedDraft ? null : 1;
    savedDraft ??= p_draft;
  } else if (route === "/rest/v1/invitations") {
    data = savedDraft ? [{ draft: savedDraft, revision: 1 }] : [];
  } else if (route.endsWith("/publish_studio_draft")) {
    data = payments.size ? "published" : "payment";
  } else if (route.endsWith("/record_studio_view")) {
    views++;
    data = null;
  } else if (route.endsWith("/process_studio_payment")) {
    const { p_event, p_amount, p_status } = JSON.parse(bytes);
    paymentCalls++;
    assert.equal(p_amount, 99900);
    assert.equal(p_status, "captured");
    data = payments.has(p_event) ? "duplicate" : "recorded";
    payments.add(p_event);
  } else if (route.endsWith("/submit_studio_rsvp_once")) {
    const { p_submission, p_response } = JSON.parse(bytes);
    assert.equal(p_submission, submission);
    assert.equal(p_response.name, "Guest");
    rsvps.add(p_submission);
    data = "accepted";
  } else if (route === "/rest/v1/invitation_assets") {
    assert.equal(JSON.parse(bytes).owner, owner);
    data = {};
  } else if (route.startsWith("/storage/v1/object/sign/")) {
    data = {
      signedURL: "/object/sign/invitation-media/example.webp?token=test",
    };
  } else if (route.startsWith("/storage/v1/object/invitation-media/")) {
    assert.match(route, /\.webp$/);
    assert.equal(req.headers["content-type"], "image/webp");
    uploaded = await sharp(bytes).metadata();
    data = { Key: "example" };
  } else {
    res.writeHead(404).end();
    return;
  }
  res
    .writeHead(200, { "content-type": "application/json" })
    .end(JSON.stringify(data));
});

function listen(server) {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
  );
}
const service = "http://127.0.0.1:" + (await listen(provider));
const reserve = createServer();
const port = await listen(reserve);
await new Promise((resolve) => reserve.close(resolve));
const base = "http://127.0.0.1:" + port;
const requestOrigin = "http://localhost:" + port;
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: service,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public",
      SUPABASE_SERVICE_ROLE_KEY: "test-service",
      NEXT_PUBLIC_SITE_URL: base,
      RAZORPAY_KEY_ID: "test-key",
      RAZORPAY_KEY_SECRET: "test-secret",
      RAZORPAY_WEBHOOK_SECRET: "test-webhook",
      RSVP_RATE_LIMIT_SECRET: "test-rate-limit",
    },
  },
);
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if ((await fetch(base + "/login")).ok) break;
    } catch {
      /* Wait for the server. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const encode = (input) =>
    Buffer.from(JSON.stringify(input)).toString("base64url");
  const token =
    encode({ alg: "HS256", typ: "JWT" }) +
    "." +
    encode({ sub: owner, exp }) +
    ".mock";
  const cookie =
    "sb-127-auth-token=base64-" +
    encode({
      access_token: token,
      refresh_token: "test-refresh",
      expires_at: exp,
    });
  const post = (path, body, headers = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        origin: requestOrigin,
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  const save = (changes = {}) =>
    post(
      "/api/workspace",
      {
        id: invitation,
        revision: 0,
        action: "save",
        draft: { ...draft, ...changes },
      },
      { cookie },
    );
  assert.equal((await post("/api/workspace", {})).status, 401);
  for (let retry = 0; retry < 2; retry++)
    assert.deepEqual(await (await save()).json(), { revision: 1 });
  assert.equal((await save({ bride: "Aparna" })).status, 409);
  const publish = () =>
    post(
      "/api/workspace",
      { id: invitation, revision: 1, action: "publish", draft },
      { cookie },
    );
  assert.equal((await publish()).status, 402);
  const picture = await sharp({
    create: { width: 40, height: 60, channels: 3, background: "#7c243e" },
  })
    .withMetadata()
    .png()
    .toBuffer();
  const form = new FormData();
  form.append("file", new Blob([picture], { type: "image/png" }), "couple.png");
  const upload = await fetch(base + "/api/asset", {
    method: "POST",
    headers: { origin: requestOrigin, cookie },
    body: form,
  });
  assert.equal(upload.status, 200);
  assert.equal(uploaded.format, "webp");
  assert.equal(uploaded.exif, undefined);
  const invalid = new FormData();
  invalid.append(
    "file",
    new Blob([picture.subarray(0, 8)], { type: "image/png" }),
    "broken.png",
  );
  assert.equal(
    (
      await fetch(base + "/api/asset", {
        method: "POST",
        headers: { origin: requestOrigin, cookie },
        body: invalid,
      })
    ).status,
    400,
  );
  const event = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_Test",
          order_id: "order_Test",
          amount: 99900,
          currency: "INR",
          status: "captured",
        },
      },
    },
  };
  assert.equal(
    (
      await post("/api/webhook", event, {
        "x-razorpay-signature": "0".repeat(64),
      })
    ).status,
    401,
  );
  assert.equal(paymentCalls, 0);
  const signature = createHmac("sha256", "test-webhook")
    .update(JSON.stringify(event))
    .digest("hex");
  for (let retry = 0; retry < 2; retry++)
    assert.equal(
      (await post("/api/webhook", event, { "x-razorpay-signature": signature }))
        .status,
      200,
    );
  assert.equal(paymentCalls, 2);
  assert.equal(payments.size, 1);
  assert.deepEqual(await (await publish()).json(), {
    revision: 1,
    slug: draft.slug,
  });
  assert.equal((await post("/api/views/" + draft.slug, {})).status, 204);
  assert.equal(views, 1);
  const response = {
    name: "Guest",
    attending: true,
    guests: 2,
    message: "",
    submissionId: submission,
  };
  for (let retry = 0; retry < 2; retry++)
    assert.equal((await post("/api/rsvp/test-wedding", response)).status, 200);
  assert.equal(rsvps.size, 1);
  assert.equal(
    (
      await post("/api/rsvp/test-wedding", response, {
        origin: "https://other.example",
      })
    ).status,
    403,
  );
  console.log(
    "HTTP workflow checks passed for authenticated draft retries, media normalization, webhook signatures, and RSVP retries.",
  );
} finally {
  child.kill();
  provider.closeAllConnections();
  provider.close();
}
