"use client"

import { useState } from "react"
import { Check, Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadIco, downloadPng, downloadReactComponent, downloadSvg } from "@/lib/export"

const FORMATS = [
  { key: "svg", label: "SVG" },
  { key: "png", label: "PNG" },
  { key: "ico", label: "ICO" },
  { key: "tsx", label: "React" },
] as const

type FormatKey = (typeof FORMATS)[number]["key"]

export function ExportBar({ svg, name }: { svg: string; name: string }) {
  const [busy, setBusy] = useState<FormatKey | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleExport(key: FormatKey) {
    setBusy(key)
    try {
      if (key === "svg") downloadSvg(svg, name)
      else if (key === "png") await downloadPng(svg, name)
      else if (key === "ico") await downloadIco(svg, name)
      else if (key === "tsx") downloadReactComponent(svg, name)
    } catch (err) {
      console.log("[v0] export error:", err instanceof Error ? err.message : err)
    } finally {
      setBusy(null)
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(svg)
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
