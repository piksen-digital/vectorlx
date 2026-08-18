"use client"

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadSvg(svg: string, name = "vecdeslx") {
  triggerDownload(new Blob([svg], { type: "image/svg+xml" }), `${name}.svg`)
}

/** Rasterize the SVG string to a PNG blob at the given square size. */
export async function svgToPngBlob(svg: string, size = 1024): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)
  try {
    const img = new Image()
    img.crossOrigin = "anonymous"
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Could not render SVG"))
      img.src = url
    })
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(img, 0, 0, size, size)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png"),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function downloadPng(svg: string, name = "vecdeslx", size = 1024) {
  const blob = await svgToPngBlob(svg, size)
  triggerDownload(blob, `${name}.png`)
}

/** Build a .ico file that embeds a 256x256 PNG (ICO supports PNG-encoded entries). */
export async function downloadIco(svg: string, name = "vecdeslx") {
  const pngBlob = await svgToPngBlob(svg, 256)
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())

  const header = new Uint8Array(6)
  const view = new DataView(header.buffer)
  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // type: icon
  view.setUint16(4, 1, true) // image count

  const entry = new Uint8Array(16)
  const ev = new DataView(entry.buffer)
  ev.setUint8(0, 0) // width 256 -> 0
  ev.setUint8(1, 0) // height 256 -> 0
  ev.setUint8(2, 0) // color palette
  ev.setUint8(3, 0) // reserved
  ev.setUint16(4, 1, true) // color planes
  ev.setUint16(6, 32, true) // bits per pixel
  ev.setUint32(8, pngBytes.length, true) // size of PNG
  ev.setUint32(12, header.length + entry.length, true) // offset

  const ico = new Blob([header, entry, pngBytes], { type: "image/x-icon" })
  triggerDownload(ico, `${name}.ico`)
}

function toPascalCase(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9]+/g, " ").trim()
  const pascal = cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
  const safe = pascal || "Icon"
  return /^[A-Za-z]/.test(safe) ? safe : `Icon${safe}`
}

/** Convert an SVG string into a React (TSX) component and download it. */
export function downloadReactComponent(svg: string, name = "vecdeslx") {
  const componentName = toPascalCase(name)

  // Convert SVG attributes to JSX-friendly camelCase and spread props onto root.
  const jsx = svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\b([a-z]+)-([a-z])/g, (_m, a, b) => `${a}${b.toUpperCase()}`)
    .replace(/class=/g, "className=")
    .replace(/<svg([^>]*)>/i, (_m, attrs) => `<svg${attrs} {...props}>`)

  const file = `import type { SVGProps } from "react"

export function ${componentName}(props: SVGProps<SVGSVGElement>) {
  return (
    ${jsx.trim()}
  )
}

export default ${componentName}
`
  triggerDownload(new Blob([file], { type: "text/plain;charset=utf-8" }), `${componentName}.tsx`)
}
