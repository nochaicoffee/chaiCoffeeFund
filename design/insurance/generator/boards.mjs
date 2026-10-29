// Every board: its file, width, canvas page and render function; the canvas pages; and each page's note.
import * as PG from "./page.mjs";
import { formsBoard } from "./forms.mjs";
import { statesBoard, phoneBoard } from "./states.mjs";

export const PAGES = [
  { id: "final", name: "Recommended page (cover map hero)" },
  { id: "states", name: "States and phone" },
  { id: "forms", name: "Forms: add, renew, cancel" },
];
export const NOTES = [
  { page: "states", text: "Insurance states and phone (2026-10-29), on his real policies with today moved where a state needs it: no policies, a renewal close (an amber strip), the accident cover lapsed (a red strip that says the bike's policy relies on it), renewed (with Undo), the car cancelled (dimmed, history kept), and a home with a loan and no policy. Then the phone layout, with the Renew bottom sheet. Dates after Oct 29, 2026 are illustrative." },
  { page: "forms", text: "Insurance forms (2026-10-29): Add policy for his health cover (paid once for three years) and his car (the kind decides the fields), Renew (his accident cover, on time and after a lapse with the gap shown) and Cancel (nothing is deleted). Renewal quotes in 2027 are illustrative." },
  { page: "final", text: "Insurance, the page (2026-10-29): Prathik picked the Cover map as the hero. His four policies, read from the PDFs in his Gmail Insurance label (identifiers cut to their last digits): ManipalCigna Lifetime Health (₹50L, paid once for 3 years), Digit owner-driver accident cover (₹15L), Acko car (IDV ₹4.42L) and Bajaj General bike (IDV ₹73.5k, paid once for 3 years). Click a policy in the map and Premiums paid and Policy details switch to it. The day the health and car premiums were paid is assumed to be the day cover began, and where any premium was paid from is not known." },
];
export const BOARDS = [
  { file: "InsForms.dc.html", w: 1100, page: "forms", render: formsBoard },
  { file: "InsStates.dc.html", w: 1460, page: "states", render: statesBoard },
  { file: "InsPhone.dc.html", w: 1380, page: "states", render: phoneBoard },
  { file: "InsFinal.dc.html", w: 1600, page: "final", render: PG.final },
];
