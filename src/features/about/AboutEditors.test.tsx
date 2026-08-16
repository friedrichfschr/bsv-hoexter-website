import { describe, expect, it } from "vitest";
import { AboutIntroductionEditor } from "@/features/about/AboutIntroductionEditor";
import { BdkArchiveEditor } from "@/features/about/BdkArchiveEditor";
import { BoardEditor } from "@/features/about/BoardEditor";
import { StatuteEditor } from "@/features/about/StatuteEditor";

describe("about editor component boundaries", () => {
  it.each([
    ["AboutIntroductionEditor", AboutIntroductionEditor],
    ["BoardEditor", BoardEditor],
    ["StatuteEditor", StatuteEditor],
    ["BdkArchiveEditor", BdkArchiveEditor],
  ])("exports %s as a named component", (_name, component) => {
    expect(component).toBeTypeOf("function");
  });
});
