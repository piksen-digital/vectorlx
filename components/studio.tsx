"use client"

import type React from "react"
import { useCallback, useRef, useState } from "react"
import {
  ArrowRight,
  ImageUp,
  LoaderCircle,
  Sparkles,
  Trash2,
  Type,
  WandSparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { STYLE_PRESETS } from "@/lib/presets"
import { cn } from "@/lib/utils"
import { ExportBar } from "@/components/export-bar"

type Mode = "text" | "image"

const EXAMPLE_PROMPTS = [
  "A minimalist mountain range inside a circle",
  "A friendly robot mascot holding a pencil",
  "A geometric fox head logo mark",
  "A rocket launching with a dotted trail",
]

export function Studio() {
  const [mode, setMode] = useState<Mode>("text")
  const [prompt, setPrompt] = useState("")
  const [styleId, setStyleId] = useState<string>("flat")
  const [image, setImage] = useState<string | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onPickFile = useCallback((file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const canGenerate = mode === "text" ? prompt.trim().length > 0 : Boolean(image)

  async function generate() {
    if (!canGenerate || loading) return
    setLoading(true)
    setError(null)
    setSvg(null)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          styleId,
          image: mode === "image" ? image : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Generation failed.")
      setSvg(data.svg as string)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* Controls */}
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
        {/* Mode switch */}
        <div className="flex rounded-xl bg-secondary p-1">
          <ModeButton active={mode === "text"} onClick={() => setMode("text")} icon={<Type className="size-4" />}>
            Text
          </ModeButton>
          <ModeButton active={mode === "image"} onClick={() => setMode("image")} icon={<ImageUp className="size-4" />}>
            Image
          </ModeButton>
        </div>

        {mode === "image" && (
          <ImageDropzone
            image={image}
            onPick={onPickFile}
            onClear={() => setImage(null)}
            openPicker={() => fileRef.current?.click()}
            fileRef={fileRef}
          />
        )}

        {/* Prompt */}
        <div className="flex flex-col gap-2">
          <label htmlFor="prompt" className="text-sm font-medium text-foreground">
            {mode === "text" ? "Describe your vector" : "Extra direction (optional)"}
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) generate()
            }}
            rows={4}
            placeholder={
              mode === "text"
                ? "e.g. A geometric fox head logo mark, symmetrical, bold"
                : "e.g. Simplify to two colors, keep it bold"
            }
            className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {mode === "text" && (
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Style presets */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Style</span>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setStyleId(p.id)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  styleId === p.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/40",
                )}
              >
                <span className="text-sm font-medium text-foreground">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.description}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={generate}
          disabled={!canGenerate || loading}
          size="lg"
          className="mt-1 w-full gap-2 text-base"
        >
          {loading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <WandSparkles className="size-4" />
              Generate SVG
            </>
          )}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {/* Preview */}
      <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-medium text-muted-foreground">Preview</span>
          {svg && <ExportBar svg={svg} name={slugify(prompt) || "vecdeslx"} />}
        </div>
        <div className="relative flex flex-1 items-center justify-center p-8">
          <Checkerboard />
          {svg ? (
            <div
              className="relative z-10 aspect-square w-full max-w-[420px] [&>svg]:size-full [&>svg]:drop-shadow-xl"
              // Preview only; content is sanitized server-side.
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <EmptyState loading={loading} />
          )}
        </div>
      </section>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function ImageDropzone({
  image,
  onPick,
  onClear,
  openPicker,
  fileRef,
}: {
  image: string | null
  onPick: (f?: File | null) => void
  onClear: () => void
  openPicker: () => void
  fileRef: React.RefObject<HTMLInputElement | null>
}) {
  const [dragging, setDragging] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      {image ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image || "/placeholder.svg"} alt="Source to vectorize" className="mx-auto max-h-56 object-contain" />
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove image"
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur transition-colors hover:bg-destructive hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            onPick(e.dataTransfer.files?.[0])
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50",
          )}
        >
          <ImageUp className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Drop an image or click to upload</span>
          <span className="text-xs text-muted-foreground">PNG, JPG, or WEBP</span>
        </button>
      )}
    </div>
  )
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        {loading ? <LoaderCircle className="size-6 animate-spin" /> : <Sparkles className="size-6" />}
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">
        {loading ? "Drawing your vector…" : "Your generated SVG will appear here, ready to tweak and export."}
      </p>
    </div>
  )
}

function Checkerboard() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          "linear-gradient(45deg,#fff 25%,transparent 25%),linear-gradient(-45deg,#fff 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#fff 75%),linear-gradient(-45deg,transparent 75%,#fff 75%)",
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0,0 12px,12px -12px,-12px 0",
      }}
    />
  )
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}
