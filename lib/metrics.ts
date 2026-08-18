/**
 * Deterministic SVG quality analysis. Pure string/regex based so it runs
 * identically on the server and in the browser (no DOM required).
 */

export type MetricKey =
  | "visualClarity"
  | "geometryAccuracy"
  | "gradientAccuracy"
  | "nodeEfficiency"
  | "scalability"
  | "printReadiness"

export type Metric = {
  key: MetricKey
  label: string
  score: number // 0-100
  detail: string
}

export type SvgStats = {
  elements: number
  paths: number
  gradients: number
  groups: number
  rasterRefs: number
  hasViewBox: boolean
  fixedSize: boolean
  bytes: number
  longestPathPoints: number
}

const COUNT = (s: string, re: RegExp) => (s.match(re) ?? []).length

export function analyzeSvg(svg: string): SvgStats {
  const paths = COUNT(svg, /<path\b/gi)
  const shapes = COUNT(svg, /<(rect|circle|ellipse|line|polyline|polygon)\b/gi)
  const groups = COUNT(svg, /<g\b/gi)
  const gradients = COUNT(svg, /<(linearGradient|radialGradient)\b/gi)
  const rasterRefs = COUNT(svg, /<image\b/gi) + COUNT(svg, /data:image\/(png|jpe?g|gif|webp)/gi)
  const hasViewBox = /viewBox\s*=/.test(svg)
  const fixedSize = /<svg[^>]*\bwidth\s*=/.test(svg) && /<svg[^>]*\bheight\s*=/.test(svg)

  // Longest path command sequence ~ complexity proxy.
  let longestPathPoints = 0
  for (const m of svg.matchAll(/<path[^>]*\bd\s*=\s*"([^"]*)"/gi)) {
    const points = COUNT(m[1], /[a-zA-Z]/g)
    if (points > longestPathPoints) longestPathPoints = points
  }

  return {
    elements: paths + shapes,
    paths,
    gradients,
    groups,
    rasterRefs,
    hasViewBox,
    fixedSize,
    bytes: new TextEncoder().encode(svg).length,
    longestPathPoints,
  }
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/**
 * Turn raw stats into human-facing quality metrics. `wantsGradient` lets the
 * gradient score reflect whether the chosen style was supposed to use them.
 */
export function scoreSvg(svg: string, opts: { wantsGradient?: boolean } = {}): {
  metrics: Metric[]
  overall: number
  stats: SvgStats
} {
  const stats = analyzeSvg(svg)

  // Scalability: viewBox present, responsive (no fixed px), and vector-only.
  let scalability = 100
  if (!stats.hasViewBox) scalability -= 45
  if (stats.fixedSize) scalability -= 20
  if (stats.rasterRefs > 0) scalability -= 40
  scalability = clamp(scalability)

  // Print readiness: no raster, valid structure, reasonable size.
  let print = 100
  if (stats.rasterRefs > 0) print -= 55
  if (!stats.hasViewBox) print -= 20
  if (stats.bytes > 60_000) print -= 15
  print = clamp(print)

  // Node efficiency: fewer, cleaner nodes score higher; penalize bloat.
  const idealElements = 14
  const overBudget = Math.max(0, stats.elements - idealElements)
  const heavyPath = Math.max(0, stats.longestPathPoints - 120)
  let efficiency = 100 - overBudget * 1.6 - heavyPath * 0.25 - Math.max(0, stats.bytes - 8000) / 900
  efficiency = clamp(efficiency)

  // Geometry accuracy: rewards well-formed shape usage and grouping.
  let geometry = 88 + Math.min(8, stats.groups * 2) + (stats.hasViewBox ? 4 : -30)
  if (stats.elements === 0) geometry = 20
  geometry = clamp(geometry)

  // Gradient accuracy: only relevant when gradients are expected/used.
  const usesGradient = stats.gradients > 0
  let gradient: number
  if (opts.wantsGradient) {
    gradient = usesGradient ? clamp(90 + Math.min(8, stats.gradients * 2)) : 62
  } else {
    gradient = usesGradient ? 95 : 100 // clean flat art is "perfect" gradient fidelity
  }

  // Visual clarity: balance of detail vs. noise.
  let clarity = 96
  if (stats.elements > 60) clarity -= 18
  if (stats.elements < 2) clarity -= 40
  if (!stats.hasViewBox) clarity -= 10
  clarity = clamp(clarity)

  const metrics: Metric[] = [
    { key: "visualClarity", label: "Visual Clarity", score: clarity, detail: `${stats.elements} shapes` },
    { key: "geometryAccuracy", label: "Geometry Accuracy", score: geometry, detail: `${stats.groups} groups` },
    {
      key: "gradientAccuracy",
      label: "Gradient Accuracy",
      score: gradient,
      detail: usesGradient ? `${stats.gradients} gradient${stats.gradients > 1 ? "s" : ""}` : "solid fills",
    },
    { key: "nodeEfficiency", label: "Node Efficiency", score: efficiency, detail: `${(stats.bytes / 1024).toFixed(1)} KB` },
    { key: "scalability", label: "Scalability", score: scalability, detail: stats.hasViewBox ? "responsive viewBox" : "no viewBox" },
    { key: "printReadiness", label: "Print Readiness", score: print, detail: stats.rasterRefs ? "raster found" : "pure vector" },
  ]

  const overall = clamp(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length)
  return { metrics, overall, stats }
}
