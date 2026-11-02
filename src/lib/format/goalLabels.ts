import { cardColorKey, type ColorKey } from "./colors";
import type { Color, Goal, GoalCategory } from "../sheets/types";

/** The colour a goal falls back to: its category's. A goal can be given any of the shared palette instead. */
export const GOAL_CATEGORY_COLOR: Record<GoalCategory, Color> = {
  Vehicle: "Copper",
  Home: "Forest",
  Appliance: "Teal",
  Gadget: "Violet",
  Travel: "Ruby",
  Education: "Sapphire",
  Family: "Rose",
  Health: "Jade",
  Other: "Onyx",
};

/** The token key (`--card-<key>`) a goal draws in. */
export const goalColorKey = (goal: Pick<Goal, "color" | "category">): ColorKey => cardColorKey(goal.color ?? GOAL_CATEGORY_COLOR[goal.category]);
