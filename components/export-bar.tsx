"use client"

import { useState } from "react"
import { Check, Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadAi, downloadEps, downloadIco, downloadMasterPackage, downloadPng, downloadReactComponent, downloadSvg, downloadImagePng } from "@/lib/export"

const FORMATS = [
  { key: "svg", label: "SVG" },
  { key: "ai", label: "AI" },
  { key: "eps", label: "EPS" },
  { key: "png", label: "PNG" },
  { key: "ico", label: "ICO" },
  { key: "tsx", label: "React" },
] as const

type FormatKey = (typeof FORMATS)[number]["key"]

export function ExportBar({ svg, imageSrc, name }: { svg?: string | null; imageSrc?: string | null; name: string }) {
  const [busy, setBusy] = useState<FormatKey | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleExport(key: FormatKey) {
    setBusy(key)
    try {
      const sourceSvg = svg ?? ""
      if (key === "svg") downloadSvg(sourceSvg, name)
      else if (key === "ai") downloadAi(sourceSvg, name)
      else if (key === "eps") downloadEps(sourceSvg, name)
      else if (key === "png") imageSrc ? await downloadImagePng(imageSrc, name) : await downloadPng(sourceSvg, name)
      else if (key === "ico") await downloadIco(sourceSvg, name)
      else if (key === "tsx") downloadReactComponent(sourceSvg, name)
    } catch (err) {
      console.log("[v0] export error:", err instanceof Error ? err.message : err)
    } finally {
      setBusy(null)
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(svg ?? "")
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.log("[v0] copy error:", err instanceof Error ? err.message : err)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="ghost" size="sm" onClick={copyCode} className="gap-1.5 text-xs">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy code"}
      </Button>
      <div className="mx-1 h-4 w-px bg-border" />
      <Button variant="default" size="sm" disabled={busy !== null || !svg} onClick={() => { if (!svg) return; setBusy("svg"); downloadMasterPackage(svg, name).finally(() => setBusy(null)) }} className="gap-1.5 text-xs">
        <Download className="size-3.5" />Master ZIP
      </Button>
      {FORMATS.map((f) => (
        <Button
          key={f.key}
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          onClick={() => handleExport(f.key)}
          className="gap-1.5 text-xs"
        >
          <Download className="size-3.5" />
          {f.label}
        </Button>
      ))}
    </div>
  )
}
