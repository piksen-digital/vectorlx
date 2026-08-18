import { Sparkles } from "lucide-react"
import { Studio } from "@/components/studio"

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-mono text-lg font-semibold tracking-tight text-foreground">VecDesLX</span>
            <span className="text-xs text-muted-foreground">AI Vector Studio</span>
          </div>
        </div>
        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
          Powered by Gemini
        </span>
      </header>

      <section className="flex flex-col items-center gap-3 py-10 text-center sm:py-14">
        <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Turn ideas and images into clean, editable <span className="text-primary">SVG vectors</span>
        </h1>
        <p className="max-w-xl text-pretty text-base text-muted-foreground">
          Describe what you want or drop in an image. VecDesLX generates crisp vector artwork you can export to SVG,
          PNG, ICO, or a ready-to-use React component.
        </p>
      </section>

      <Studio />

      <footer className="mt-auto pt-12 text-center text-xs text-muted-foreground">
        Built with Next.js and the Gemini API · Vectors are AI-generated
      </footer>
    </main>
  )
}
