import type { Settings } from "../../shared/types.js";
import type { Router } from "./routing/router.js";
import type { Store } from "./store.js";

/** Apply the settings IPC update and invalidate routing setup only after persistence succeeds. */
export function updateSettings(store: Pick<Store, "settings" | "updateSettings">, router: Pick<Router, "reset">, patch: Partial<Settings>): Settings {
  const before = store.settings.routing;
  const settings = store.updateSettings(patch);
  const after = settings.routing;
  if (patch.routing && (
    before.jev_transport !== after.jev_transport ||
    before.jev_bin !== after.jev_bin ||
    before.jev_model !== after.jev_model
  )) router.reset();
  return settings;
}
