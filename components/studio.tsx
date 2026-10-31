"use client"

import type React from "react"
import { useCallback, useRef, useState } from "react"
import { Check, ClipboardList, ImageUp, LoaderCircle, ScanSearch, Sparkles, Trash2, Type, WandSparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DESIGN_TYPES, STYLE_PRESETS, type VisualDNA } from "@/lib/presets"
import { scoreSvg, type Metric } from "@/lib/metrics"
import { optimizeSvg } from "@/lib/svg"
import { cn } from "@/lib/utils"
import { ExportBar } from "@/components/export-bar"

type Mode = "text" | "image"
type Workspace = "generate" | "dna" | "inspect"
type PuterImage = { src: string }
type PuterClient = { ai: { txt2img: (prompt: string) => Promise<HTMLImageElement> } }

declare global {
  interface Window {
    puter?: PuterClient
  }
}

const EXAMPLE_PROMPTS = ["A minimalist mountain range inside a circle", "A friendly robot mascot holding a pencil", "A geometric fox head logo mark", "A rocket launching with a dotted trail"]

export function Studio() {
  const [workspace, setWorkspace] = useState<Workspace>("generate")
  const [mode, setMode] = useState<Mode>("text")
  const [prompt, setPrompt] = useState("")
  const [styleId, setStyleId] = useState("flat")
  const [typeId, setTypeId] = useState("logo")
  const [image, setImage] = useState<string | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [puterImage, setPuterImage] = useState<PuterImage | null>(null)
  const [puterSvg, setPuterSvg] = useState<string | null>(null)
  const [provider, setProvider] = useState<"puter" | null>(null)
  const [quality, setQuality] = useState<ReturnType<typeof scoreSvg> | null>(null)
  const [dna, setDna] = useState<VisualDNA | null>(null)
  const [dnaImages, setDnaImages] = useState<string[]>([])
  const [critique, setCritique] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dnaFileRef = useRef<HTMLInputElement>(null)

  const onPickFile = useCallback((file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) { setError("Please choose an image file."); return }
    const reader = new FileReader(); reader.onload = () => setImage(reader.result as string); reader.readAsDataURL(file)
  }, [])

  const readDnaFile = useCallback((file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader(); reader.onload = () => setDnaImages((items) => [...items, reader.result as string].slice(-5)); reader.readAsDataURL(file)
  }, [])

  const canGenerate = mode === "text" ? prompt.trim().length > 0 : Boolean(image)

  async function generate() {
    if (!canGenerate || loading) return
    setLoading(true); setError(null); setSvg(null); setPuterImage(null); setPuterSvg(null); setProvider(null); setQuality(null); setCritique([])
    try {
      if (mode === "image") {
        throw new Error("Puter's no-key image generator cannot read uploaded reference images. Use Text mode for Puter generation.")
      }
      if (!window.puter?.ai?.txt2img) {
        throw new Error("Puter is still loading. Please try again in a moment.")
      }
      const preset = STYLE_PRESETS.find((item) => item.id === styleId)
      const type = DESIGN_TYPES.find((item) => item.id === typeId)
      const currentRequest = prompt.trim()
      const puterPrompt = `CURRENT REQUEST ONLY. Ignore all previous prompts, generated images, conversation history, and cached context. Generate only the following new graphic: ${currentRequest}. Design type: ${type?.instruction ?? "clean vector artwork"}. Style: ${preset?.instruction ?? "minimal, polished design"}. Create a crisp, centered composition with a simple background. Do not reuse or reference any earlier request.`
      const generated = await window.puter.ai.txt2img(puterPrompt)
      const generatedSvg = imageToSvg(generated.src)
      setPuterImage({ src: generated.src })
      setPuterSvg(generatedSvg)
      setProvider("puter")
      setWorkspace("generate")
    } catch (err) {
      console.log("[v0] Puter generation error:", err)
      setError(err instanceof Error ? err.message : "Generation failed.")
    } finally { setLoading(false) }
  }

  async function analyzeBrand() {
    if (!dnaImages.length || loading) return
    setLoading(true); setError(null)
    try { const res = await fetch("/api/visual-dna", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: dnaImages }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setDna(data.dna) }
    catch (err) { setError(err instanceof Error ? err.message : "Brand analysis failed.") } finally { setLoading(false) }
  }

  async function critiqueDesign() {
    if (!svg || loading) return
    setLoading(true); setError(null)
    try { const res = await fetch("/api/critic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ svg, prompt, styleId, typeId }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setCritique(data.critique ?? []) }
    catch (err) { setError(err instanceof Error ? err.message : "Critique failed.") } finally { setLoading(false) }
  }

  return <div className="flex flex-col gap-5">
    <div className="grid grid-cols-3 rounded-xl bg-secondary p-1">
      {([["generate", "Generate", WandSparkles], ["dna", "Visual DNA", Sparkles], ["inspect", "Inspector", ScanSearch]] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setWorkspace(id)} className={cn("flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", workspace === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><Icon className="size-4" />{label}</button>)}
    </div>

    {workspace === "dna" && <DnaPanel images={dnaImages} dna={dna} fileRef={dnaFileRef} onPick={readDnaFile} onRemove={(i) => setDnaImages((items) => items.filter((_, n) => n !== i))} onAnalyze={analyzeBrand} loading={loading} />}
    {workspace === "inspect" && <Inspector svg={svg} quality={quality} critique={critique} onCritique={critiqueDesign} onOptimize={() => { if (svg) { const next = optimizeSvg(svg); setSvg(next); setQuality(scoreSvg(next)); setCritique([]) } }} loading={loading} />}
    {workspace === "generate" && <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex rounded-xl bg-secondary p-1"><ModeButton active={mode === "text"} onClick={() => setMode("text")} icon={<Type className="size-4" />}>Text</ModeButton><ModeButton active={mode === "image"} onClick={() => setMode("image")} icon={<ImageUp className="size-4" />}>Image</ModeButton></div>
        {mode === "image" && <ImageDropzone image={image} onPick={onPickFile} onClear={() => setImage(null)} openPicker={() => fileRef.current?.click()} fileRef={fileRef} />}
        <div className="flex flex-col gap-2"><label htmlFor="prompt" className="text-sm font-medium">{mode === "text" ? "Describe your vector" : "Extra direction (optional)"}</label><textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing && e.keyCode !== 229) generate() }} rows={4} placeholder="e.g. A geometric fox head logo mark, symmetrical, bold" className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />{mode === "text" && <div className="flex flex-wrap gap-1.5">{EXAMPLE_PROMPTS.map((ex) => <button key={ex} type="button" onClick={() => setPrompt(ex)} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground">{ex}</button>)}</div>}</div>
        <SelectGrid label="Design type" items={DESIGN_TYPES} value={typeId} onChange={setTypeId} />
        <SelectGrid label="Style" items={STYLE_PRESETS} value={styleId} onChange={setStyleId} />
        {dna && <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Visual DNA active</span><br />{dna.summary || "Brand language will be applied to this generation."}</div>}
        <Button onClick={generate} disabled={!canGenerate || loading} size="lg" className="mt-1 w-full gap-2 text-base">{loading ? <><LoaderCircle className="size-4 animate-spin" />Generating…</> : <><WandSparkles className="size-4" />Generate graphic</>}</Button>{error && <p className="text-sm text-destructive">{error}</p>}
      </section>
      <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3"><div className="flex items-center gap-2"><span className="text-sm font-medium text-muted-foreground">Preview</span>{provider && <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Puter AI</span>}</div>{(svg || puterImage) && <ExportBar svg={svg ?? puterSvg} imageSrc={puterImage?.src} name={slugify(prompt) || "vecdeslx"} />}</div><div className="relative flex flex-1 items-center justify-center p-8"><Checkerboard />{svg ? <div className="relative z-10 aspect-square w-full max-w-[420px] [&>svg]:size-full [&>svg]:drop-shadow-xl" dangerouslySetInnerHTML={{ __html: svg }} /> : puterImage ? <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-3"><img src={puterImage.src} alt="AI-generated fallback artwork" className="max-h-[420px] w-full rounded-xl object-contain shadow-xl" /><p className="text-xs text-muted-foreground">Generated with Puter as a no-key fallback. Export as an image from your browser.</p></div> : <EmptyState loading={loading} />}</div></section>
    </div>}
  </div>
}

function SelectGrid({ label, items, value, onChange }: { label: string; items: { id: string; label: string; description?: string }[]; value: string; onChange: (value: string) => void }) { return <div className="flex flex-col gap-2"><span className="text-sm font-medium">{label}</span><div className="grid grid-cols-2 gap-2">{items.map((item) => <button key={item.id} type="button" onClick={() => onChange(item.id)} className={cn("flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors", value === item.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40")}><span className="text-sm font-medium">{item.label}</span>{item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}</button>)}</div></div> }

function Inspector({ svg, quality, critique, onCritique, onOptimize, loading }: { svg: string | null; quality: ReturnType<typeof scoreSvg> | null; critique: string[]; onCritique: () => void; onOptimize: () => void; loading: boolean }) { if (!svg) return <EmptyCard title="No artwork to inspect" body="Generate an SVG first, then return here for quality metrics, optimization, and an AI design critique." />; const live = quality ?? scoreSvg(svg); return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="rounded-2xl border border-border bg-card p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Enterprise SVG Inspector</p><h2 className="text-2xl font-semibold">Quality Meter <span className="text-primary">{live.overall}/100</span></h2></div><div className="flex gap-2"><Button onClick={onOptimize} disabled={loading} variant="secondary" className="gap-2">Optimize</Button><Button onClick={onCritique} disabled={loading} variant="secondary" className="gap-2">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}AI Critic</Button></div></div><div className="grid gap-3 sm:grid-cols-2">{live.metrics.map((metric) => <MetricRow key={metric.key} metric={metric} />)}</div><div className="mt-5 rounded-xl bg-secondary p-4 text-xs text-muted-foreground"><span className="font-medium text-foreground">SVG stats:</span> {live.stats.elements} elements · {live.stats.paths} paths · {live.stats.gradients} gradients · {(live.stats.bytes / 1024).toFixed(1)} KB · {live.stats.hasViewBox ? "responsive viewBox" : "missing viewBox"}</div></section><section className="rounded-2xl border border-border bg-card p-5"><p className="mb-3 text-sm font-medium">AI Design Critic</p>{critique.length ? <ul className="space-y-3 text-sm text-muted-foreground">{critique.map((item, i) => <li key={i} className="flex gap-2"><span className="text-primary">{i + 1}.</span>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">Get practical feedback on clarity, hierarchy, scalability, and brand fit.</p>}</section></div> }

function MetricRow({ metric }: { metric: Metric }) { return <div className="rounded-xl border border-border bg-background p-3"><div className="flex items-center justify-between text-sm"><span>{metric.label}</span><span className="font-mono text-primary">{metric.score}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${metric.score}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div> }

function DnaPanel({ images, dna, fileRef, onPick, onRemove, onAnalyze, loading }: { images: string[]; dna: VisualDNA | null; fileRef: React.RefObject<HTMLInputElement | null>; onPick: (file?: File | null) => void; onRemove: (index: number) => void; onAnalyze: () => void; loading: boolean }) { return <section className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-col gap-1"><p className="text-sm text-primary">Brand intelligence</p><h2 className="text-2xl font-semibold">Visual DNA</h2><p className="max-w-2xl text-sm text-muted-foreground">Upload logos, screenshots, or brand assets. VecDesLX extracts the visual language and injects it into every future generation.</p></div><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} /><div className="mt-5 grid gap-3 sm:grid-cols-5">{images.map((src, i) => <div key={src} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-background"><img src={src} alt={`Brand asset ${i + 1}`} className="size-full object-contain" /><button type="button" onClick={() => onRemove(i)} className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive" aria-label={`Remove asset ${i + 1}`}><Trash2 className="size-3.5" /></button></div>)}<button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"><ImageUp className="size-5" /><span className="text-xs">Add asset</span></button></div><Button onClick={onAnalyze} disabled={!images.length || loading} className="mt-5 gap-2">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Analyze brand DNA</Button>{dna && <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{dna.palette?.length ? <div className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">Palette</p><div className="mt-2 flex gap-1.5">{dna.palette.map((color) => <span key={color} className="size-7 rounded-full border border-border" style={{ background: color }} title={color} />)}</div></div> : null}{[["Corners", dna.cornerRadius], ["Strokes", dna.strokeThickness], ["Geometry", dna.geometricLanguage], ["Lighting", dna.lighting]].map(([label, value]) => <div key={label} className="rounded-xl border border-border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value || "Not detected"}</p></div>)}</div>}</section> }

function EmptyCard({ title, body }: { title: string; body: string }) { return <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center"><ClipboardList className="mb-3 size-8 text-primary" /><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p></div> }
function ModeButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{icon}{children}</button> }
function ImageDropzone({ image, onPick, onClear, openPicker, fileRef }: { image: string | null; onPick: (file?: File | null) => void; onClear: () => void; openPicker: () => void; fileRef: React.RefObject<HTMLInputElement | null> }) { const [dragging, setDragging] = useState(false); return <div>{<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />}{image ? <div className="relative overflow-hidden rounded-xl border border-border bg-background"><img src={image} alt="Source to vectorize" className="mx-auto max-h-56 object-contain" /><button type="button" onClick={onClear} aria-label="Remove image" className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 hover:bg-destructive hover:text-white"><X className="size-4" /></button></div> : <button type="button" onClick={openPicker} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); onPick(e.dataTransfer.files?.[0]) }} className={cn("flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center", dragging ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50")}><ImageUp className="size-6 text-muted-foreground" /><span className="text-sm font-medium">Drop an image or click to upload</span><span className="text-xs text-muted-foreground">PNG, JPG, or WEBP</span></button>}</div> }
function EmptyState({ loading }: { loading: boolean }) { return <div className="relative z-10 flex flex-col items-center gap-3 text-center"><div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">{loading ? <LoaderCircle className="size-6 animate-spin" /> : <Sparkles className="size-6" />}</div><p className="max-w-xs text-sm text-muted-foreground">{loading ? "Drawing your vector…" : "Your generated SVG will appear here, ready to tweak and export."}</p></div> }
function Checkerboard() { return <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(45deg,#fff 25%,transparent 25%),linear-gradient(-45deg,#fff 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#fff 75%),linear-gradient(-45deg,transparent 75%,#fff 75%)", backgroundSize: "24px 24px", backgroundPosition: "0 0,0 12px,12px -12px,-12px 0" }} /> }
function imageToSvg(src: string) {
  const safeSrc = src.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" role="img"><image width="1024" height="1024" preserveAspectRatio="xMidYMid meet" href="${safeSrc}" xlink:href="${safeSrc}" /></svg>`
}

function slugify(text: string) { return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) }
