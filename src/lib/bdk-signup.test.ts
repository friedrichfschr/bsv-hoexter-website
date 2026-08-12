import { describe, expect, it } from "vitest";
import { validateBdkSignup } from "@/lib/bdk-signup";

const valid = {
  name: "Erika Muster",
  email: "erika@example.org",
  school: "Gymnasium Beispielstadt",
  role: "student-council",
  note: "Ich möchte bei der nächsten BDK mitarbeiten.",
  consent: true,
};

describe("validateBdkSignup", () => {
  it("accepts a complete BDK signup", () => {
    expect(validateBdkSignup(valid).success).toBe(true);
  });

  it("requires a name, email, school, and participation role", () => {
    for (const field of ["name", "email", "school", "role"] as const) {
      expect(validateBdkSignup({ ...valid, [field]: "" }).success, field).toBe(false);
    }
  });

  it("rejects an unknown participation role", () => {
    expect(validateBdkSignup({ ...valid, role: "guest" }).success).toBe(false);
  });

  it("allows the optional note to be empty", () => {
    expect(validateBdkSignup({ ...valid, note: "" }).success).toBe(true);
  });

  it("requires consent to data processing and contact", () => {
    expect(validateBdkSignup({ ...valid, consent: false }).success).toBe(false);
  });
});
