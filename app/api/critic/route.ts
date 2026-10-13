import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { extractJson } from "@/lib/json"

export const maxDuration = 60
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash"

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return Response.json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY." }, { status: 500 })
  try {
    const body = (await req.json()) as { svg?: string; prompt?: string; styleId?: string; typeId?: string }
    if (!body.svg) return Response.json({ error: "Generate an SVG first." }, { status: 400 })
    const { text } = await generateText({
      model: google(MODEL),
      system: "You are an expert vector art director. Return ONLY JSON with a critique array containing exactly 4 concise, practical recommendations covering visual clarity, hierarchy, scalability/technical quality, and brief fit. Be constructive. No markdown.",
      prompt: `Brief: ${body.prompt || "Not provided"}\nDesign type: ${body.typeId || "unknown"}\nStyle: ${body.styleId || "unknown"}\nSVG:\n${body.svg.slice(0, 50000)}`,
      temperature: 0.3,
    })
    const parsed = extractJson<{ critique?: string[] }>(text)
    return Response.json({ critique: parsed?.critique?.filter((item) => typeof item === "string").slice(0, 4) ?? [text.trim()] })
  } catch (err) {
    console.log("[v0] critic error:", err instanceof Error ? err.message : err)
    return Response.json({ error: "Critique failed." }, { status: 500 })
  }
}
