/**
 * Extract a single <svg>...</svg> block from arbitrary model output and strip
 * anything unsafe. Returns null if no usable SVG is found.
 */
export function extractSvg(raw: string): string | null {
  if (!raw) return null

  // Strip markdown code fences if the model added them anyway.
  let text = raw.replace(/```(?:svg|xml|html)?/gi, "").trim()

  const match = text.match(/<svg[\s\S]*?<\/svg>/i)
  if (!match) return null

  let svg = match[0]

  // Remove dangerous / non-portable constructs.
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "") // inline event handlers
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")

  // Ensure the xmlns is present so the file opens standalone.
  if (!/xmlns=/.test(svg)) {
    svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  return svg.trim()
}
