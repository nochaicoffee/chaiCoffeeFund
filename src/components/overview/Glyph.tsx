import { GLYPHS, type GlyphKey } from "@/app/overview/glyphs";

/** One glyph, drawn as a line with a faint body; the tiles draw it large and cropped as a watermark. */
export function Glyph({ name, className = "" }: { name: GlyphKey; className?: string }) {
  const g = GLYPHS[name];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={g.fill} fill="currentColor" fillOpacity={0.35} stroke="none" />
      <path d={g.line} />
    </svg>
  );
}
