import { describe, expect, it } from "vitest";
import { bdkSchools } from "@/features/bdk/domain/schools";
import { bdkSignupSchema, validateBdkSignup } from "@/features/bdk/domain/signup";

const valid = {
  firstName: "Erika",
  lastName: "Muster",
  grade: "Q1",
  gradeOther: "",
  email: "erika@example.org",
  school: "schulen-der-brede-brakel",
  schoolOther: "",
  role: "district-delegate",
  message: "Ich möchte bei der nächsten BDK mitarbeiten.",
  privacyAccepted: true,
};

describe("BDK signup domain", () => {
  it("contains only the 20 official school names", () => {
    expect(bdkSchools).toHaveLength(20);
    expect(bdkSchools.map((school) => school.label)).toContain("Schulen der Brede Brakel");
    expect(JSON.stringify(bdkSchools)).not.toMatch(/@|Straße|PLZ/);
  });

  it("accepts the structured signup fields", () => {
    expect(validateBdkSignup(valid)).toEqual(expect.objectContaining({ success: true }));
  });

  it.each(["firstName", "lastName", "email", "school", "grade", "role"] as const)("requires %s", (field) => {
    expect(validateBdkSignup({ ...valid, [field]: "" }).success).toBe(false);
  });

  it("accepts only bounded grades and participation roles", () => {
    expect(bdkSignupSchema.safeParse({ ...valid, grade: "11" }).success).toBe(false);
    expect(bdkSignupSchema.safeParse({ ...valid, role: "interested" }).success).toBe(false);
  });

  it("requires details for other school and grade choices", () => {
    expect(validateBdkSignup({ ...valid, school: "other", schoolOther: "" }).success).toBe(false);
    expect(validateBdkSignup({ ...valid, school: "other", schoolOther: "Freie Schule Muster" }).success).toBe(true);
    expect(validateBdkSignup({ ...valid, grade: "other", gradeOther: "" }).success).toBe(false);
    expect(validateBdkSignup({ ...valid, grade: "other", gradeOther: "Ausbildung" }).success).toBe(true);
  });

  it("requires explicit privacy acknowledgement", () => {
    expect(validateBdkSignup({ ...valid, privacyAccepted: false }).success).toBe(false);
  });

  it("normalizes optional fields", () => {
    const parsed = bdkSignupSchema.parse({ ...valid, message: undefined, schoolOther: undefined, gradeOther: undefined });
    expect(parsed).toMatchObject({ message: "", schoolOther: "", gradeOther: "" });
  });
});
