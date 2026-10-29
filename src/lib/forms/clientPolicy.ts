import type { Policy } from "../sheets/types";

/**
 * A policy as it may be sent to the browser: with its policy number cut to the last four characters ("…3850"), which is all
 * the page shows. The whole number stays on the server, in the Sheet. A form that sends the shortened number back can't
 * overwrite the whole one (policies.ts refuses a number that starts with "…").
 */
export type ClientPolicy = Omit<Policy, "policyNumber"> & { policyNumber?: string };

export function toClientPolicy(policy: Policy): ClientPolicy {
  const { policyNumber, ...rest } = policy;
  const kept = policyNumber?.replace(/[^A-Za-z0-9]/g, "").slice(-4);
  return kept ? { ...rest, policyNumber: `…${kept}` } : rest;
}
