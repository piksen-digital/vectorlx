import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { extractJson } from "@/lib/json"
import type { VisualDNA } from "@/lib/presets"

export const maxDuration = 60

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash"

type Body = { images?: string[] }

const SYSTEM = `You are a senior brand designer. Analyze the attached brand assets (logos, screenshots, icons, brand guides) and extract the shared visual language so future artwork can match it exactly.

Return ONLY a JSON object with these string fields (no markdown, no commentary):
{
  "palette": ["#hex", "#hex", ...up to 6 dominant colors],
  "cornerRadius": "e.g. sharp 0px corners / soft 8px / fully rounded",
  "strokeThickness": "e.g. thin 1.5px monoline / bold 4px / no strokes, filled",
  "gradients": "how gradients are used, or 'flat solid fills'",
  "geometricLanguage": "e.g. circular & organic / rigid grid / angular",
  "lighting": "e.g. flat / soft top-light / dramatic",
  "spacing": "e.g. generous padding / tight & dense",
  "summary": "one sentence describing the overall brand look"
}`

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY." }, { status: 500 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const images = (body.images ?? []).filter(Boolean).slice(0, 5)
  if (!images.length) {
    return Response.json({ error: "Upload at least one brand asset." }, { status: 400 })
  }

  try {
    const { text } = await generateText({
      model: google(MODEL),
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the Visual DNA from these brand assets." },
            ...images.map((image) => ({ type: "image" as const, image })),
          ],
        },
      ],
      temperature: 0.2,
    })

    const dna = extractJson<VisualDNA>(text)
    if (!dna) {
      return Response.json({ error: "Could not analyze the assets. Try clearer images." }, { status: 502 })
    }
    return Response.json({ dna })
  } catch (err) {
    console.log("[v0] visual-dna error:", err instanceof Error ? err.message : err)
    return Response.json({ error: "Analysis failed." }, { status: 500 })
  }
}
