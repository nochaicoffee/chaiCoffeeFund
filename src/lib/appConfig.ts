/**
 * App-wide settings that aren't secrets. Personal, but safe to commit:
 * the owner's display name for the greeting and avatar, and the time zone
 * "today" is computed in (the server may run in UTC once hosted).
 */
export const appConfig = {
  appName: "chaiCoffeeFund",
  ownerName: "Prathik",
  timeZone: "Asia/Kolkata",
} as const;
