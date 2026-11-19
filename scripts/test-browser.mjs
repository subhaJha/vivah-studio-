import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const staticPage = await noJs.newPage();
  await staticPage.goto(base);
  await staticPage.getByLabel("Toggle navigation").click();
  await staticPage
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Templates" })
    .click();
  await staticPage.waitForURL("**/templates");
  await staticPage
    .getByRole("link", { name: "Customize", exact: true })
    .first()
    .click();
  await staticPage.waitForURL("**/editor?template=royal-bengali");
  await noJs.close();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(base);
  await page
    .getByRole("heading", {
      name: "Your Love Story Deserves a Beautiful Beginning",
    })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "Mobile landing must fit its viewport",
  );
  await page
    .getByRole("link", { name: "Explore Templates", exact: true })
    .click();
  await page.waitForURL("**/templates");
  assert.equal(
    await page.getByRole("link", { name: "Customize", exact: true }).count(),
    6,
  );
  await page.getByRole("button", { name: "Minimal", exact: true }).click();
  assert.equal(
    await page.getByRole("link", { name: "Customize", exact: true }).count(),
    1,
  );
  await page.getByRole("link", { name: "Customize", exact: true }).click();
  await page.waitForURL("**/editor?template=ivory-dreams");
  await page.getByLabel("Bride name").fill("Riya");
  await page.getByLabel("Groom name").fill("Rahul");
  await page.getByRole("heading", { name: "Riya & Rahul" }).waitFor();
  await page.getByRole("button", { name: "Design", exact: true }).click();
  assert.equal(
    await page
      .getByRole("combobox", { name: "Template", exact: true })
      .inputValue(),
    "ivory-dreams",
  );
  await page
    .getByRole("combobox", { name: "Template", exact: true })
    .selectOption("palace-affair");
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Add an event" })
    .selectOption("Haldi");
  await page.getByRole("heading", { name: "Celebration itinerary" }).waitFor();
  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Desktop", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page
    .getByRole("button", { name: "Demo checkout", exact: true })
    .click();
  await page.getByText("Demo checkout complete.", { exact: false }).waitFor();
  await page.reload();
  assert.equal(await page.getByLabel("Bride name").inputValue(), "Riya");
  await page.goto(base + "/preview/royal-bengali");
  await page.getByRole("button", { name: "Open invitation" }).click();
  await page.getByRole("heading", { name: "Ananya & Arjun" }).waitFor();
  await page.getByRole("heading", { name: "Celebration itinerary" }).waitFor();
  assert.equal((await page.goto(base + "/admin")).status(), 404);
  assert.equal(
    (await page.goto(base + "/invite/unknown-wedding")).status(),
    404,
  );
  await page.goto(base + "/dashboard");
  await page
    .getByText("Demo mode. Account dashboards require Supabase.")
    .waitFor();
  assert.deepEqual(pageErrors, []);
  await context.close();
  const animated = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await animated.goto(base + "/preview/royal-bengali");
  await animated.getByRole("button", { name: "Open invitation" }).click();
  await animated.getByRole("heading", { name: "Ananya & Arjun" }).waitFor();
  await animated.getByRole("heading", { name: "Kindly RSVP" }).waitFor();
  console.log(
    "Browser checks passed for mobile landing, marketplace filtering, the editor, demo persistence, protections, and both curtain modes.",
  );
} finally {
  await browser.close();
}
