import path from "node:path";

type Environment = Record<string, string | undefined>;

export function isPreviewFormEnabled(environment: Environment) {
  return environment.NODE_ENV !== "production" || environment.PREVIEW_FORMS_ENABLED === "true";
}

export function resolvePreviewDirectory(environment: Environment, cwd = process.cwd()) {
  return path.resolve(cwd, environment.PREVIEW_SUBMISSIONS_DIR || ".preview-submissions");
}
