"use server";

import { updateTag } from "next/cache";
import { sameDayBalance } from "@/lib/aggregate/accounts";
import { resolution } from "@/lib/aggregate/statementBalances";
import type { FormState } from "@/lib/forms/formState";
import { balanceReviewsRepository } from "@/lib/sheets/balanceReviews";
import { balanceSnapshotsRepository } from "@/lib/sheets/balanceSnapshots";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";

/**
 * Answers a balance a bank statement disagreed with (BalanceReviews). Accept writes the statement's
 * balance over the recorded one; Keep leaves the recorded balance and closes the question. Either way the
 * review is closed, so the "needs attention" mark goes. The balance is written first and the review closed
 * after, so a failure between them leaves the question open to answer again, never a closed one with the
 * wrong balance. Another file than actions.ts, which the rest of the Accounts forms live in.
 */

const GONE: FormState = { status: "invalid", errors: { form: "This question isn't in the BalanceReviews tab any more. Close this and refresh." } };

function refreshed(): FormState {
  updateTag(CACHE_TAGS.balanceSnapshots);
  updateTag(CACHE_TAGS.balanceReviews);
  return { status: "saved", at: Date.now() };
}

export async function resolveBalanceReview(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const choice = formData.get("choice");
  if (!id || (choice !== "accept" && choice !== "keep")) return GONE;
  try {
    const review = await balanceReviewsRepository.get(id);
    if (!review) return GONE;
    // Already answered (say from another tab): nothing to do, and nothing to undo.
    if (review.status !== "Open") return refreshed();

    const answer = resolution(review, choice);
    if (answer.setBalance !== null) {
      const snapshots = await balanceSnapshotsRepository.list();
      // The balance the review was about, if it is still that day's (Edit balance can move one to another day, and
      // then it isn't the one the statement spoke of); else whatever is recorded for the day; else a new one.
      const named = snapshots.find((s) => s.id === review.snapshotId);
      const recorded = named && named.accountId === review.accountId && named.date === review.date ? named : sameDayBalance(snapshots, review.accountId, review.date);
      if (recorded) await balanceSnapshotsRepository.update(recorded.id, { balance: answer.setBalance, source: "Statement" });
      else await balanceSnapshotsRepository.create({ accountId: review.accountId, date: review.date, balance: answer.setBalance, source: "Statement" });
    }
    await balanceReviewsRepository.update(id, { status: answer.status, resolvedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z") });
  } catch (error) {
    console.error("[accounts] resolveBalanceReview failed:", error instanceof Error ? error.message : String(error));
    return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
  }
  return refreshed();
}
