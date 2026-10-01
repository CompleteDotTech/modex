import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/main/engine/store.js";
import { ThreadRunner } from "../src/main/engine/runner.js";
import { Router } from "../src/main/engine/routing/router.js";
import type { Backend, TurnOptions, TurnSink } from "../src/main/engine/backends/types.js";
import { DEFAULT_ROUTING, type ModelInfo } from "../src/shared/types.js";
import { gitRepo, tmpdir } from "./helpers.js";

test("Auto stops before backend execution when no advertised effort fits the ceiling", async () => {
  const home = tmpdir("modex-policy-ceiling-");
  const store = new Store(home);
  const events: unknown[] = [];
  const repo = gitRepo();
  const project = store.addProject(repo);
  let runs = 0;
  const model: ModelInfo = { id: "high-only", label: "High only", efforts: ["high"] };
  const backend: Backend = {
    id: "codex",
    listModels: async () => [model],
    dispose: async () => {},
    runTurn: async (_text: string, _options: TurnOptions, _sink: TurnSink) => {
      runs++;
      return { status: "completed" };
    },
  };
  const router = new Router({
    home,
    policy: () => ({ ...DEFAULT_ROUTING, max_effort: "low" }),
    transport: null,
    listModels: async () => ({ models: [model] }),
  });
  const runner = new ThreadRunner({ home, store, emit: (event) => events.push(event), router, backends: { codex: backend } });
  const thread = await runner.createThread(project.id, { backend: "codex", auto: true });
  try {
    await runner.send(thread.id, "review the repository");
    assert.equal(runs, 0, "the existing backend model was run after the policy rejected its effort capability");
    assert.equal(runner.status(thread.id), "error");
    assert.equal(router.fit.snapshot().history.length, 0, "a blocked turn must not teach the fit or consume a route budget");
    assert.ok(runner.items(thread.id).some((item) => item.kind === "route" && item.reasons.some((reason) => /route was stopped/.test(reason))));
    assert.ok(runner.items(thread.id).some((item) => item.kind === "notice" && item.level === "error" && /Auto routing stopped/.test(item.text)));
  } finally {
    await runner.dispose();
  }
});
