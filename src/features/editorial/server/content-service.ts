import { z } from "zod";
import { cleanupRemovedAboutUploads, normalizeAboutEditorialContent, validateAboutContent } from "@/features/about/server/content-service";
import {
  editorialContentSchema,
  mutateEditorialContent,
  resolveEditorialDirectory,
} from "@/features/editorial/server/content-store";
import { validateArticles } from "@/features/news/server/article-service";

export async function replaceEditorialContent(directory = resolveEditorialDirectory(), input: unknown) {
  return mutateEditorialContent(directory, async (current) => {
    const object = z.object({
      articles: editorialContentSchema.shape.articles,
      documents: editorialContentSchema.shape.documents,
      about: z.unknown().optional(),
    }).parse(input);
    const parsed = editorialContentSchema.parse({ ...object, about: object.about === undefined ? current.about : object.about });
    const content = { ...parsed, about: normalizeAboutEditorialContent(parsed.about) };
    await validateArticles(directory, content.articles);
    await validateAboutContent(directory, content.about);
    return {
      content,
      result: content,
      afterWrite: () => cleanupRemovedAboutUploads(directory, current.about, content.about, [
        ...content.articles.map((article) => article.imageId),
        ...content.documents.map((document) => document.mediaId),
      ]),
    };
  });
}
