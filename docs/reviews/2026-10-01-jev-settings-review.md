# Jev settings and routing review

Scope: issues [#40](https://github.com/TypeSafeAI/modex/issues/40) through
[#50](https://github.com/TypeSafeAI/modex/issues/50), based on main
`3c2bb240059b3e1bec9264f1e57fa885096c6bf9`. This is an offline implementation and
regression review; it does not establish live provider credentials, credits, pricing,
or quality. Coding turns remain CLI-only and existing approval/sandbox rules apply.

## Acceptance checklist

Every published criterion is part of the review scope. A green suite alone is insufficient;
the reviewer must inspect the behavior and its integration before recording a disposition.

| Issue | Required behavior | Evidence to inspect |
| --- | --- | --- |
| #40 | CLI-only never falls back to HTTPS; Auto prefers CLI; HTTP skips CLI; fake key/detection matrix covers missing credentials. | Router setup and transport regression cases. |
| #41 | Relevant successful saves invalidate setup for status/test/route/follow-up; learned history survives; stale setup/provider work cannot alter new configuration. | Settings IPC, Router generation fencing, configuration-change tests. |
| #42 | Dirty judge configuration cannot masquerade as tested; exact saved transport/executable/model identified; edits invalidate visible results. | Settings test gating and fake-IPC e2e. |
| #43 | Immediate credential/reset actions are clearly separate from drafts; reset is confirmed; Cancel/Escape/backdrop semantics are explicit; credentials remain masked/encrypted. | Settings actions, secret storage, confirmation/cancellation e2e. |
| #44 | Existing sessions never switch under the no-session option, regardless of judge continuity score; no-session availability/capability cases preserve consent. | Policy and deterministic switching cases. |
| #45 | Normal, pinned, sparse/unknown-capability and no-list routes respect effort/premium caps; impossible safe selection stops before backend execution. | Policy hardening and runner ceiling tests; blocked routes excluded from Fit. |
| #46 | Configured/untested, explicit success and failure are distinct; last explicit result has configuration identity; old successes cannot validate edits; no automatic provider ping. | Router test/status, reset/race tests and settings e2e. |
| #47 | HTTP reports CLI not checked; only failed detection can report missing; transport/detected executable feedback is accurate. | Router setup and settings transport feedback cases. |
| #48 | Four navigable sections; persistent actions; Auto section immediately accessible; keyboard focus containment/return, small viewport and zoom are exercised. | Settings structure/styles and layout e2e. |
| #49 | Validated judge model and allowed backend controls; empty selection defined; compatibility and save/reopen round trip; restrictions affect routing. | Settings advanced controls, Store migration and policy cases. |
| #50 | Save is awaitable; persistence failure retains draft/error/retry; duplicate submissions/dismissal blocked while pending; refresh failure handled separately. | Settings/App persistence and delayed/rejected fake-IPC e2e. |

## Review and validation

Final reviewer disposition and exact-head validation evidence will be recorded after
integration. Implementation used separate Luna/high worktrees. The requested fast service
tier was unavailable in the delegation interface; no model substitution was made.

Baseline platform limitations were reproduced before integration: the Windows suite assumes
POSIX modes, path separators and login shells in several existing tests. The Linux GCC
build also reports pre-existing unused-parameter/unused-result warnings as errors in the
terminal supervisor. An isolated Linux harness suppresses only those two warning classes;
it is supplemental evidence, not a replacement for the required unmodified macOS CI job.
