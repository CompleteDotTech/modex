import { test, expect, type ElectronApplication, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { launch, seedHome, tid } from "./support";

let app: ElectronApplication;
let page: Page;
let home: string;
let repo: string;

test.beforeEach(async () => {
  ({ home, repo } = seedHome());
  ({ app, page } = await launch(home));
});

test.afterEach(async () => {
  await app?.close();
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(repo, { recursive: true, force: true });
});

test("saving freezes the draft until persistence resolves and keeps it available after failure", async () => {
  await app.evaluate(({ ipcMain }) => {
    let rejectSave: ((error: Error) => void) | undefined;
    ipcMain.removeHandler("settings:update");
    ipcMain.handle("settings:update", () => new Promise((_resolve, reject) => { rejectSave = reject; }));
    (globalThis as any).__modexRejectSettingsSave = () => rejectSave?.(new Error("fake persistence failure"));
  });

  await tid(page, "open-settings").click();
  const dialog = tid(page, "settings");
  await dialog.getByRole("button", { name: "General" }).click();
  const mode = dialog.getByRole("combobox", { name: "Default mode for new threads" });
  await mode.selectOption("agent");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(dialog).toHaveAttribute("aria-busy", "true");
  await expect(tid(dialog, "settings-content")).toHaveAttribute("inert", "");
  await expect(dialog.getByRole("button", { name: "Auto routing" })).toBeDisabled();
  await page.keyboard.press("Tab");
  await expect(dialog).toBeFocused();

  await app.evaluate(() => (globalThis as any).__modexRejectSettingsSave());
  await expect(tid(page, "settings-save-error")).toContainText("fake persistence failure");
  await expect(dialog).toHaveAttribute("aria-busy", "false");
  await expect(tid(dialog, "settings-content")).not.toHaveAttribute("inert", "");
  await expect(mode).toHaveValue("agent");
  await dialog.getByRole("button", { name: "Cancel" }).click();
});

test("a failed learning reset stays in the dialog and explains how to check the result", async () => {
  const initial = await page.evaluate(() => window.modex!.invoke("routing:status", undefined));
  await app.evaluate(({ ipcMain }, current) => {
    ipcMain.removeHandler("routing:status");
    ipcMain.handle("routing:status", async () => ({ ...current, fit: { ...current.fit, routes: 1 } }));
    ipcMain.removeHandler("routing:reset");
    ipcMain.handle("routing:reset", async () => { throw new Error("fake reset persistence failure"); });
  }, initial);

  await tid(page, "open-settings").click();
  const dialog = tid(page, "settings");
  page.once("dialog", async (confirmation) => { await confirmation.accept(); });
  await dialog.getByRole("button", { name: "Reset learning…" }).click();
  await expect(tid(page, "routing-reset-error")).toContainText("fake reset persistence failure");
  await expect(tid(page, "routing-reset-error")).toContainText("Reopen Settings to check the current learning state");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
});

test("a test locks settings while running and marks its result stale after a relevant draft change", async () => {
  const initial = await page.evaluate(() => window.modex!.invoke("routing:status", undefined));
  await app.evaluate(({ ipcMain }, current) => {
    const tested = { transport: "http", executable: null, model: current.model };
    const lastTest = { ok: true, message: "fake Jev answered", transport: "http", ms: 4, tested, current: true, at: Date.now() };
    ipcMain.removeHandler("routing:status");
    ipcMain.handle("routing:status", async () => ({ ...current, live: true, detail: undefined, transport: { kind: "http" }, secrets: { ...current.secrets, present: true }, lastTest, fit: { ...current.fit, routes: 1 } }));
    ipcMain.removeHandler("routing:test");
    ipcMain.handle("routing:test", () => new Promise((resolve) => {
      (globalThis as any).__modexResolveRoutingTest = () => resolve({ ok: true, message: "fake Jev answered", transport: "http", ms: 4, tested, current: true });
    }));
  }, initial);

  await tid(page, "open-settings").click();
  const dialog = tid(page, "settings");
  await tid(dialog, "jev-key").locator('input[type="password"]').fill("fake-ui-test-key");
  await dialog.getByRole("button", { name: "Test judge" }).click();
  await expect(dialog.getByText("Asking Jev…")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save key now" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Clear now" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Reset learning…" })).toBeDisabled();
  const transport = dialog.getByRole("combobox", { name: "Judge transport" });
  await expect(dialog).toHaveAttribute("aria-busy", "true");
  await expect(tid(dialog, "settings-content")).toHaveAttribute("inert", "");
  await app.evaluate(() => (globalThis as any).__modexResolveRoutingTest());
  await expect(tid(page, "routing-test")).toContainText("fake Jev answered");
  await dialog.getByRole("button", { name: "Advanced / demo" }).click();
  const model = tid(dialog, "jev-model");
  await model.fill("jev-next-model");
  await dialog.getByRole("button", { name: "Auto routing" }).click();
  await expect(tid(page, "routing-verification")).toHaveText("Configured · untested");
  await expect(tid(page, "routing-test-stale")).toContainText("Settings changed while this test ran");
  await dialog.getByRole("button", { name: "Cancel" }).click();
});
