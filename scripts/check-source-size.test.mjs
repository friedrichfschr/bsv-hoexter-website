import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFeatureOwnership, evaluateSourceSizes } from "./check-source-size.mjs";

test("rejects authored source files above 700 lines", () => {
  const result = evaluateSourceSizes([
    { path: "src/example.ts", lines: 701 },
    { path: "src/other.tsx", lines: 120 },
  ]);

  assert.deepEqual(result.errors, ["src/example.ts (701 lines)"]);
});

test("reports files above 400 lines without rejecting them", () => {
  const result = evaluateSourceSizes([{ path: "src/example.ts", lines: 401 }]);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, ["src/example.ts (401 lines)"]);
});

test("ignores generated and test artifacts", () => {
  const result = evaluateSourceSizes([
    { path: ".next/generated.ts", lines: 900 },
    { path: "node_modules/package/index.ts", lines: 900 },
    { path: "src/example.test.ts", lines: 900 },
  ]);

  assert.deepEqual(result, { errors: [], warnings: [] });
});

test("rejects feature-owned modules in generic lib and domain folders", () => {
  assert.deepEqual(evaluateFeatureOwnership([
    "src/lib/bdk-signup.ts",
    "src/lib/submission.ts",
    "src/domain/notice-board.ts",
    "src/features/news/article-model.ts",
  ]), [
    "src/lib/bdk-signup.ts",
    "src/lib/submission.ts",
    "src/domain/notice-board.ts",
  ]);
});

test("keeps reusable server infrastructure in shared", () => {
  assert.deepEqual(evaluateFeatureOwnership([
    "src/lib/uploads.ts",
    "src/lib/request-body.test.ts",
    "src/shared/server/editorial-auth.ts",
  ]), [
    "src/lib/uploads.ts",
    "src/lib/request-body.test.ts",
  ]);
});
