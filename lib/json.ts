/** Extract the first JSON object from arbitrary model output. */
export function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  } catch {
    return null
  }
}
