import { describe, expect, it } from "vitest";
import { demoInsuranceData } from "@/lib/demo/insuranceDemo";
import { insuranceFormsData } from "./formsView";
import type { InsuranceData } from "./views";

const TODAY = "2026-10-29";

describe("the forms' data", () => {
  it("starts Renew from each policy's renewal date and last term", () => {
    const forms = insuranceFormsData(demoInsuranceData(TODAY, "soon"), TODAY, false);
    const accident = forms.policies.find((p) => p.id === "demo-accident")!;
    expect(accident.defaults).toMatchObject({ start: "2026-11-10", years: 1, lastAmount: 451, gapDays: 0 });
    expect(accident.last).toEqual({ years: 1, amount: 451 });
    expect(forms.policies.find((p) => p.id === "demo-car")?.defaults?.ncb).toBe(50);
    expect(forms.covers).toEqual(["You", "Car", "Bike"]);
  });

  it("starts a lapsed policy's renewal today and says how many days had no cover", () => {
    const forms = insuranceFormsData(demoInsuranceData(TODAY, "lapsed"), TODAY, false);
    expect(forms.policies.find((p) => p.id === "demo-car")?.defaults).toMatchObject({ start: TODAY, gapDays: 9 });
  });

  it("carries where a policy is paid from as one value, and a year of cover for Cancel", () => {
    const data = demoInsuranceData(TODAY);
    const withPlace: InsuranceData = { ...data, policies: data.policies.map((p) => (p.id === "demo-health" ? { ...p, paidFromAccountId: "demo-hdfc" } : p)) };
    const forms = insuranceFormsData(withPlace, TODAY, false);
    expect(forms.policies.find((p) => p.id === "demo-health")?.paidFrom).toBe("account:demo-hdfc");
    expect(forms.yearlyAll).toBeCloseTo(20511.2, 1);
  });

  it("never carries a whole policy number to the browser", () => {
    const data = demoInsuranceData(TODAY);
    const withNumber: InsuranceData = { ...data, policies: data.policies.map((p) => ({ ...p, policyNumber: "ZXCV1234567890" })) };
    const forms = insuranceFormsData(withNumber, TODAY, false);
    expect(forms.policies[0].policyNumber).toBe("…7890");
    expect(JSON.stringify(forms)).not.toContain("1234567");
    expect(insuranceFormsData(data, TODAY, false).policies[0].policyNumber).toBe("");
  });

  it("has nothing for an empty book", () => {
    const forms = insuranceFormsData(demoInsuranceData(TODAY, "empty"), TODAY, true);
    expect(forms).toMatchObject({ demo: true, covers: [], policies: [], yearlyAll: 0 });
  });
});
