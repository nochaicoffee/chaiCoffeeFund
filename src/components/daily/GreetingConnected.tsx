"use client";

import { greetingView, summarySentence } from "@/app/daily/views";
import { useDaily } from "./context";
import { GreetingSentence } from "./GreetingSentence";

/** The greeting's sentence and cards, worked out from the shell's model, so a spend just added is in it at once. */
export function GreetingConnected() {
  const { model } = useDaily();
  return <GreetingSentence parts={summarySentence(model)} cards={greetingView(model)} />;
}
