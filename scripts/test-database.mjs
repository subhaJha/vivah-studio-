import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const pg = new PGlite();
try {
  await pg.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,created_at timestamptz not null default now(),banned_until timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select current_setting('request.jwt.claim.sub',true)::uuid$$;
    grant usage on schema auth to authenticated;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit int,allowed_mime_types text[]);
  `);
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202611180001_studio.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const guest = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const draft = {
    template: "royal-bengali",
    slug: "ananya-arjun",
    bride: "Ananya",
    rsvp: true,
    events: [{ name: "Haldi" }],
  };
  await pg.query("insert into auth.users(id) values($1),($2)", [owner, guest]);
  async function scalar(sql, params = []) {
    const { rows } = await pg.query(sql, params);
    return Object.values(rows[0])[0];
  }
  const save = (revision, data) =>
    scalar("select public.save_studio_draft($1,$2,$3,$4)", [
      owner,
      id,
      revision,
      JSON.stringify(data),
    ]);
  const publish = (revision) =>
    scalar("select public.publish_studio_draft($1,$2,$3)", [
      owner,
      id,
      revision,
    ]);
  assert.equal(await save(0, draft), 1);
  assert.equal(await save(0, draft), null);
  assert.equal(await publish(1), "payment");
  await pg.query(
    "insert into public.orders(provider_order,invitation,template,amount) values('order_test',$1,'royal-bengali',99900)",
    [id],
  );
  await pg.exec(
    "select public.record_studio_payment('pay_test','order_test','failed')",
  );
  assert.equal(await publish(1), "payment");
  await pg.exec(
    "select public.record_studio_payment('pay_test','order_test','captured'); select public.record_studio_payment('pay_test','order_test','failed');",
  );
  assert.equal(await publish(1), "published");
  assert.equal(await save(1, { ...draft, bride: "Aparna" }), 2);
  assert.equal(await publish(1), "conflict");
  assert.equal(
    await scalar("select snapshot->>'bride' from public.publications"),
    "Ananya",
  );
  assert.equal(
    await scalar("select count(*) from public.invitation_events"),
    1,
  );
  await pg.exec(
    "select public.record_studio_view('ananya-arjun'); select public.record_studio_view('ananya-arjun');",
  );
  assert.equal(
    await scalar("select views from public.invitation_analytics"),
    2,
  );
  const rsvp = () =>
    scalar("select public.submit_studio_rsvp('ananya-arjun','bucket',$1)", [
      JSON.stringify({
        name: "Guest",
        attending: true,
        guests: 2,
        message: "",
      }),
    ]);
  for (let index = 0; index < 5; index++)
    assert.equal(await rsvp(), "accepted");
  assert.equal(await rsvp(), "limited");
  assert.equal(
    await scalar("select public.studio_admin_overview()->>'revenue'"),
    "99900",
  );
  await pg.exec("set role authenticated");
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    guest,
  ]);
  assert.equal(await scalar("select count(*) from public.invitations"), 0);
  assert.equal(await scalar("select count(*) from public.rsvp_responses"), 0);
  await assert.rejects(
    () => pg.query("select * from public.publications"),
    /permission denied/,
  );
  await assert.rejects(
    () => pg.query("select public.record_studio_view('ananya-arjun')"),
    /permission denied/,
  );
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  assert.equal(await scalar("select count(*) from public.invitations"), 1);
  assert.equal(await scalar("select count(*) from public.rsvp_responses"), 5);
  await pg.exec("reset role; set role anon");
  await assert.rejects(
    () => pg.query("select * from public.invitations"),
    /permission denied/,
  );
  console.log(
    "PostgreSQL checks passed for RLS, payment gating, autosave revisions, snapshots, analytics, and RSVP limits.",
  );
} finally {
  await pg.close();
}
