import { describe, expect, it } from "vitest";
import { createSettingSchema, settingRowSchema, updateSettingSchema } from "./settings";

describe("setting schemas", () => {
  it("accepts the look as Classic or Neubrutalism", () => {
    expect(createSettingSchema.safeParse({ key: "look", value: "Classic" }).success).toBe(true);
    expect(createSettingSchema.safeParse({ key: "look", value: "Neubrutalism" }).success).toBe(true);
  });

  it("refuses a look that isn't one, a key it doesn't know, or an empty value", () => {
    expect(createSettingSchema.safeParse({ key: "look", value: "Pastel" }).success).toBe(false);
    expect(createSettingSchema.safeParse({ key: "theme", value: "dark" }).success).toBe(false);
    expect(createSettingSchema.safeParse({ key: "look", value: "" }).success).toBe(false);
  });

  it("checks an update's value against its key, and wants the key with the value", () => {
    expect(updateSettingSchema.safeParse({ key: "look", value: "Neubrutalism" }).success).toBe(true);
    expect(updateSettingSchema.safeParse({ key: "look", value: "Pastel" }).success).toBe(false);
    expect(updateSettingSchema.safeParse({ value: "Neubrutalism" }).success).toBe(false);
  });

  it("reads a row back with its id", () => {
    expect(settingRowSchema.safeParse({ id: "s1", key: "look", value: "Classic" }).success).toBe(true);
    expect(settingRowSchema.safeParse({ key: "look", value: "Classic" }).success).toBe(false);
  });
});
