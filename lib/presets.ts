export type StylePreset = {
  id: string
  label: string
  description: string
  instruction: string
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "flat",
    label: "Flat Vector",
    description: "Clean, minimal, solid fills",
    instruction:
      "Flat design with solid fills, minimal detail, no gradients or shadows. Bold, simple shapes with clean geometry.",
  },
  {
    id: "line",
    label: "Line Icon",
    description: "Monoline stroke icon",
    instruction:
      "Monoline icon using consistent stroke width, no fills, rounded line caps and joins. Simple, recognizable at small sizes.",
  },
  {
    id: "gradient",
    label: "Gradient",
    description: "Modern vibrant gradients",
    instruction:
      "Modern design using smooth linear or radial gradients defined in <defs>. Vibrant but tasteful color transitions.",
  },
  {
    id: "duotone",
    label: "Duotone",
    description: "Two-tone with opacity",
    instruction:
      "Duotone style using one accent color at full and reduced opacity to create depth. No more than two hues.",
  },
  {
    id: "threed",
    label: "3D / Isometric",
    description: "Depth and dimension",
    instruction:
      "Isometric 3D look with layered shapes, subtle shading via gradients, and a clear light direction to imply depth.",
  },
  {
    id: "logo",
    label: "Logo Mark",
    description: "Balanced brand mark",
    instruction:
      "A balanced, scalable logo mark. Strong silhouette, geometric harmony, works in a single color and centered in the viewBox.",
  },
]

const BASE_RULES = `You are an expert SVG illustrator. Output a single, complete, valid, self-contained SVG document and NOTHING else.

Hard requirements:
- Start the response with "<svg" and end with "</svg>". No markdown, no code fences, no commentary.
- Include xmlns="http://www.w3.org/2000/svg" and a square viewBox="0 0 256 256".
- Do NOT set fixed width/height attributes on the root <svg> (keep it responsive).
- Use clean, optimized paths. Prefer <path>, <circle>, <rect>, <g>, and <defs> for gradients.
- Center the artwork within the viewBox with comfortable padding.
- No external references, no <image>, no raster data, no <script>, no foreignObject.
- Keep the file compact (aim for well under 300 lines).`

export type DesignType = {
  id: string
  label: string
  instruction: string
}

export const DESIGN_TYPES: DesignType[] = [
  { id: "logo", label: "Logo", instruction: "a brand logo mark with a strong, memorable silhouette" },
  { id: "icon", label: "Icon", instruction: "a single UI icon, legible and balanced at small sizes" },
  { id: "illustration", label: "Illustration", instruction: "a rich editorial illustration with a clear focal point" },
  { id: "mascot", label: "Mascot", instruction: "a characterful brand mascot with personality and clean forms" },
  { id: "infographic", label: "Infographic", instruction: "a compact infographic element that communicates data or a concept" },
  { id: "poster", label: "Poster", instruction: "a bold poster-style composition with strong hierarchy" },
  { id: "ui", label: "UI Spot", instruction: "a friendly UI spot illustration for an empty-state or onboarding screen" },
  { id: "pattern", label: "Pattern", instruction: "a seamless, tileable decorative pattern" },
  { id: "map", label: "Map", instruction: "a stylized map or location graphic with clear landmarks" },
  { id: "diagram", label: "Diagram", instruction: "a clean technical diagram with labeled, connected parts" },
]

export type VisualDNA = {
  palette?: string[]
  cornerRadius?: string
  strokeThickness?: string
  gradients?: string
  geometricLanguage?: string
  lighting?: string
  spacing?: string
  summary?: string
}

function visualDnaToInstruction(dna?: VisualDNA | null) {
  if (!dna) return ""
  const lines: string[] = []
  if (dna.palette?.length) lines.push(`- Color palette: use ${dna.palette.join(", ")} (stay within this palette).`)
  if (dna.cornerRadius) lines.push(`- Corner radius: ${dna.cornerRadius}.`)
  if (dna.strokeThickness) lines.push(`- Stroke thickness: ${dna.strokeThickness}.`)
  if (dna.gradients) lines.push(`- Gradients: ${dna.gradients}.`)
  if (dna.geometricLanguage) lines.push(`- Geometric language: ${dna.geometricLanguage}.`)
  if (dna.lighting) lines.push(`- Lighting: ${dna.lighting}.`)
  if (dna.spacing) lines.push(`- Spacing: ${dna.spacing}.`)
  if (!lines.length) return ""
  return `\n\nBrand Visual DNA — every output MUST match this existing visual language:\n${lines.join("\n")}`
}

export function buildSystemPrompt(opts?: {
  styleInstruction?: string
  typeInstruction?: string
  visualDna?: VisualDNA | null
}) {
  let prompt = BASE_RULES
  if (opts?.typeInstruction) prompt += `\n\nDeliverable: Create ${opts.typeInstruction}.`
  if (opts?.styleInstruction) prompt += `\n\nStyle direction: ${opts.styleInstruction}`
  prompt += visualDnaToInstruction(opts?.visualDna)
  return prompt
}

export function getPreset(id?: string | null) {
  return STYLE_PRESETS.find((p) => p.id === id)
}

export function getDesignType(id?: string | null) {
  return DESIGN_TYPES.find((t) => t.id === id)
}
