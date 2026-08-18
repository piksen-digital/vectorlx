import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { buildSystemPrompt, getDesignType, getPreset, type VisualDNA } from "@/lib/presets"
import { extractSvg } from "@/lib/svg"
import { scoreSvg } from "@/lib/metrics"

export const maxDuration = 60

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash"

type GenerateBody = {
  prompt?: string
  styleId?: string | null
  typeId?: string | null
  visualDna?: VisualDNA | null
  // data URL: "data:image/png;base64,...."
  image?: string | null
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it in your Vercel project settings." },
      { status: 500 },
    )
  }

  let body: GenerateBody
  try {
    body = (await req.json()) as GenerateBody
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const prompt = body.prompt?.trim() ?? ""
  const image = body.image ?? null

  if (!prompt && !image) {
    return Response.json({ error: "Provide a prompt or an image." }, { status: 400 })
  }

  const preset = getPreset(body.styleId)
  const type = getDesignType(body.typeId)
  const system = buildSystemPrompt({
    styleInstruction: preset?.instruction,
    typeInstruction: type?.instruction,
    visualDna: body.visualDna ?? null,
  })

  const userText = image
    ? `Recreate the attached image as a clean vector SVG. Faithfully capture its shapes, composition, and colors while simplifying it into crisp vector geometry.${
        prompt ? ` Additional direction: ${prompt}` : ""
      }`
    : `Create an SVG of: ${prompt}`

  try {
    const { text } = await generateText({
      model: google(MODEL),
      system,
      messages: [
        {
          role: "user",
          content: image
            ? [
                { type: "text", text: userText },
                { type: "image", image },
              ]
            : [{ type: "text", text: userText }],
        },
      ],
      temperature: 0.6,
    })

    const svg = extractSvg(text)
    if (!svg) {
      return Response.json(
        { error: "The model did not return a valid SVG. Try rephrasing your prompt." },
        { status: 502 },
      )
    }

    const quality = scoreSvg(svg, { wantsGradient: preset?.id === "gradient" || preset?.id === "threed" })

    return Response.json({ svg, quality })
  } catch (err) {
    console.log("[v0] generate error:", err instanceof Error ? err.message : err)
    const message = err instanceof Error ? err.message : "Generation failed."
    return Response.json({ error: message }, { status: 500 })
  }
}
