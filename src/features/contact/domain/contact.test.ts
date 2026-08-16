import { describe, expect, it } from "vitest";
import { validateContact } from "@/features/contact/domain/contact";

const valid = {
  name: "Erika Muster",
  email: "erika@example.org",
  school: "Gymnasium Beispielstadt",
  message: "Wir möchten ein Thema in die nächste Bezirksdelegiertenkonferenz einbringen.",
  privacy: true,
};

describe("validateContact", () => {
  it("accepts a useful contact message", () => {
    expect(validateContact(valid).success).toBe(true);
  });

  it("rejects messages that are too short", () => {
    expect(validateContact({ ...valid, message: "Hallo" }).success).toBe(false);
  });

  it("requires acknowledgement of the privacy information", () => {
    expect(validateContact({ ...valid, privacy: false }).success).toBe(false);
  });

  it("accepts a message without a personal name", () => {
    const result = validateContact({ ...valid, name: "" });
    expect(result.success).toBe(true);
  });
});
