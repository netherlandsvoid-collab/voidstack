import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://localhost:3000");
  await page
    .getByRole("button", { name: "View A study in soft forms", exact: true })
    .waitFor();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  assert.equal(
    await page
      .locator(".artwork img")
      .evaluateAll((imgs) =>
        imgs.every((i) => i.complete && i.naturalWidth > 0),
      ),
    true,
  );
  await page.getByRole("button", { name: "Create post", exact: true }).click();
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name", { exact: true }).fill("Test Buyer");
  const suffix = Date.now();
  await page.getByLabel("Username", { exact: true }).fill("ui_" + suffix);
  await page
    .getByLabel("Email address", { exact: true })
    .fill(`ui${suffix}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-test-password");
  await page
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your creative identity." })
    .waitFor();
  await page
    .getByLabel("Creative discipline", { exact: true })
    .fill("Illustration");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Create post", exact: true }).click();
  await page
    .getByLabel("Your story", { exact: true })
    .fill("A browser-tested creative journey. #illustration");
  await page
    .getByRole("button", { name: "Publish your work", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", {
      name: "View A browser-tested creative journey. #illustration",
      exact: true,
    })
    .waitFor();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Marketplace", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Soft Form — 3D Material Pack", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Get this resource", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete test purchase", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your next idea starts here." })
    .waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download your file", exact: true })
    .click();
  const downloaded = await downloadPromise;
  assert.equal(downloaded.suggestedFilename(), "nexirel-demo.txt");
  await page
    .getByRole("button", { name: "View all purchases", exact: true })
    .click();
  await page.getByRole("heading", { name: "Your creative toolkit." }).waitFor();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3000");
    await page
      .getByRole("button", { name: "View A study in soft forms", exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `No overflow at ${width}`,
    );
    await page.screenshot({
      path: `test-results/viewport-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".mobile-bottom")
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  await page.getByRole("heading", { name: "Conversations" }).waitFor();
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Message Mila Chen", exact: true })
    .click();
  await page
    .getByLabel("Message", { exact: true })
    .fill("Hello from a responsive browser test.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page
    .locator(".message-bubble")
    .getByText("Hello from a responsive browser test.", { exact: true })
    .waitFor();
  await page.screenshot({
    path: "test-results/mobile-messages.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: UI registration, profile, posting, checkout, download, mobile messaging; 390/768/1440px overflow and image checks; no browser errors.",
  );
} catch (e) {
  await page.screenshot({
    path: "/tmp/nexirel-ui-failure.png",
    fullPage: true,
  });
  console.log(await page.locator("body").innerText());
  throw e;
} finally {
  await browser.close();
}
