import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([".git", ".next", "node_modules", "playwright-report", "test-results"]);
const TEMPORARY_ALLOWLIST = new Set();

function isTestFile(filePath) {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filePath);
}

export function evaluateSourceSizes(files, allowlist = TEMPORARY_ALLOWLIST) {
  const errors = [];
  const warnings = [];

  for (const file of files) {
    const normalized = file.path.replaceAll("\\", "/");
    if (normalized.split("/").some((part) => IGNORED_DIRECTORIES.has(part)) || isTestFile(normalized) || allowlist.has(normalized)) continue;
    const label = `${normalized} (${file.lines} lines)`;
    if (file.lines > 700) errors.push(label);
    else if (file.lines > 400) warnings.push(label);
  }

  return { errors, warnings };
}

export function evaluateFeatureOwnership(paths) {
  const legacyFeatureModules = [
    /^src\/lib\/.+\.ts$/,
    /^src\/domain\/(?:events|notice-board)(?:\.test)?\.ts$/,
  ];
  return paths
    .map((filePath) => filePath.replaceAll("\\", "/"))
    .filter((filePath) => legacyFeatureModules.some((pattern) => pattern.test(filePath)));
}

export function evaluateClientServerImports(files) {
  return files
    .filter((file) => /^\s*["']use client["'];/.test(file.content) && /from\s+["'][^"']*\/server\//m.test(file.content))
    .map((file) => file.path.replaceAll("\\", "/"));
}

async function collectSourceFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(absolute, root));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      const content = await readFile(absolute, "utf8");
      files.push({ path: path.relative(root, absolute).replaceAll("\\", "/"), lines: content.split("\n").length, content });
    }
  }
  return files;
}

async function main() {
  const root = process.cwd();
  const files = await collectSourceFiles(root);
  const result = evaluateSourceSizes(files);
  const ownershipErrors = evaluateFeatureOwnership(files.map((file) => file.path));
  const clientServerErrors = evaluateClientServerImports(files);
  for (const warning of result.warnings) console.warn(`Structure warning: ${warning}`);
  for (const error of ownershipErrors) console.error(`Structure error: move feature-owned module ${error}`);
  for (const error of clientServerErrors) console.error(`Structure error: client module imports server code ${error}`);
  if (result.errors.length || ownershipErrors.length || clientServerErrors.length) {
    for (const error of result.errors) console.error(`Structure error: ${error}`);
    process.exitCode = 1;
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) await main();
