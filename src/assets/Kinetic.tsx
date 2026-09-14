// Kinetic Grid — Originkit
// Using component defaults.

"use client"

import { useRef, useEffect, type CSSProperties } from "react"
const useIsStaticRenderer = () => false

interface KineticGridProps {
    background: string
    dotColor: string
    lineColor: string
    trailColor: string
    spacing: number // grid spacing in px
    radius: number // cursor attraction radius in px
    strength: number // 1-10 attraction strength
    trail: boolean // show cursor trail line
    style?: CSSProperties
}

/**
 * Kinetic Grid
 *
 * A reactive dot grid that is pulled toward the cursor within a chosen
 * radius, with a trail line that follows the mouse as it moves.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 600
 */
export default function KineticGrid(props: KineticGridProps) {
    props = { ...COMPONENT_DEFAULTS, ...props }
    const {
        background = "#000000",
        dotColor = "#FFFFFF",
        lineColor = "#2563EB",
        trailColor = "#2664EB",
        spacing = 50,
        radius = 200,
        strength = 4,
        trail = true,
    } = props

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const mouseRef = useRef({ x: -9999, y: -9999, active: false })
    const trailRef = useRef<{ x: number; y: number; t: number }[]>([])
    const isStatic = useIsStaticRenderer()

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const GAP = Math.max(8, spacing)
        const R = Math.max(1, radius)
        const PULL = (Math.max(1, Math.min(10, strength)) / 10) * 4

        let W = 1
        let H = 1
        let cols: {
            hx: number
            hy: number
            x: number
            y: number
            vx: number
            vy: number
        }[][] = []
        let dots: {
            hx: number
            hy: number
            x: number
            y: number
            vx: number
            vy: number
        }[] = []

        const build = (mw?: number, mh?: number) => {
            const r = host.getBoundingClientRect()
            W = Math.max(1, Math.floor(mw ?? r.width))
            H = Math.max(1, Math.floor(mh ?? r.height))
            const dpr = window.devicePixelRatio || 1
            canvas.width = Math.floor(W * dpr)
            canvas.height = Math.floor(H * dpr)
            canvas.style.width = W + "px"
            canvas.style.height = H + "px"
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            cols = []
            dots = []
            const nCols = Math.floor(W / GAP) + 2
            const nRows = Math.floor(H / GAP) + 2
            for (let c = 0; c < nCols; c++) {
                const col: typeof dots = []
                for (let rIdx = 0; rIdx < nRows; rIdx++) {
                    const hx = c * GAP
                    const hy = rIdx * GAP
                    const d = { hx, hy, x: hx, y: hy, vx: 0, vy: 0 }
                    col.push(d)
                    dots.push(d)
                }
                cols.push(col)
            }
        }
        // One-shot grid render for the Framer canvas / thumbnail (no cursor,
        // no animation) — draws the full mesh at home positions so the grid
        // fills the whole component instead of a top-left patch.
        const drawStatic = () => {
            ctx.clearRect(0, 0, W, H)
            ctx.globalAlpha = 0.14
            ctx.strokeStyle = lineColor
            ctx.lineWidth = 0.75
            for (let c = 0; c < cols.length; c++) {
                for (let rIdx = 0; rIdx < cols[c].length; rIdx++) {
                    const d = cols[c][rIdx]
                    const right = cols[c + 1]?.[rIdx]
                    const down = cols[c]?.[rIdx + 1]
                    if (right) {
                        ctx.beginPath()
                        ctx.moveTo(d.hx, d.hy)
                        ctx.lineTo(right.hx, right.hy)
                        ctx.stroke()
                    }
                    if (down) {
                        ctx.beginPath()
                        ctx.moveTo(d.hx, d.hy)
                        ctx.lineTo(down.hx, down.hy)
                        ctx.stroke()
                    }
                }
            }
            ctx.globalAlpha = 0.4
            ctx.fillStyle = dotColor
            for (const d of dots) {
                ctx.beginPath()
                ctx.arc(d.hx, d.hy, 1.2, 0, 2 * Math.PI)
                ctx.fill()
            }
            ctx.globalAlpha = 1
        }

        build()

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver((entries) => {
                      // contentRect is the reliable size — getBoundingClientRect
                      // can be stale (pre-layout) when the effect first runs.
                      const cr = entries[0]?.contentRect
                      build(cr?.width, cr?.height)
                      if (isStatic) drawStatic()
                  })
                : null
        ro?.observe(host)

        // Static renderer: draw once, skip interaction + animation loop.
        if (isStatic) {
            drawStatic()
            return () => ro?.disconnect()
        }

        let isRunning = false
        let raf = 0

        const wakeUp = () => {
            if (!isRunning) {
                isRunning = true
                raf = requestAnimationFrame(frame)
            }
        }

        const setMouse = (clientX: number, clientY: number) => {
            if (!canvas) return
            const r = canvas.getBoundingClientRect()
            const mx = clientX - r.left
            const my = clientY - r.top
            
            if (clientX >= r.left - 80 && clientX <= r.right + 80 && clientY >= r.top - 80 && clientY <= r.bottom + 80) {
                mouseRef.current.x = mx
                mouseRef.current.y = my
                mouseRef.current.active = true
                const now = performance.now()
                const trailArr = trailRef.current
                trailArr.push({ x: mx, y: my, t: now })
                if (trailArr.length > 80) trailArr.shift()
                wakeUp()
            } else if (mouseRef.current.active) {
                mouseRef.current.active = false
                wakeUp()
            }
        }

        const onMove = (e: MouseEvent) => setMouse(e.clientX, e.clientY)
        const onLeave = () => {
            mouseRef.current.active = false
            mouseRef.current.x = -9999
            mouseRef.current.y = -9999
            wakeUp()
        }
        const onTouch = (e: TouchEvent) => {
            const t = e.touches[0]
            if (t) setMouse(t.clientX, t.clientY)
        }

        window.addEventListener("mousemove", onMove, { passive: true })
        window.addEventListener("touchmove", onTouch, { passive: true })
        document.addEventListener("mouseleave", onLeave)
        window.addEventListener("touchend", onLeave)

        const frame = () => {
            const m = mouseRef.current
            ctx.clearRect(0, 0, W, H)

            let maxEnergy = 0

            // Update dot physics: spring home + attraction toward cursor.
            for (const d of dots) {
                let ax = (d.hx - d.x) * 0.08
                let ay = (d.hy - d.y) * 0.08
                if (m.active) {
                    const dx = m.x - d.x
                    const dy = m.y - d.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < R && dist > 0.001) {
                        const f = (1 - dist / R) * PULL
                        ax += (dx / dist) * f
                        ay += (dy / dist) * f
                    }
                }
                d.vx = (d.vx + ax) * 0.82
                d.vy = (d.vy + ay) * 0.82
                d.x += d.vx
                d.y += d.vy

                const speed = Math.abs(d.vx) + Math.abs(d.vy)
                if (speed > maxEnergy) maxEnergy = speed
            }

            // Highlighting near cursor vs batching distant mesh lines
            ctx.globalAlpha = 0.06
            ctx.strokeStyle = lineColor
            ctx.lineWidth = 0.5
            ctx.beginPath()

            const activeLines: { x1: number; y1: number; x2: number; y2: number; prox: number }[] = []

            for (let c = 0; c < cols.length; c++) {
                for (let rIdx = 0; rIdx < cols[c].length; rIdx++) {
                    const d = cols[c][rIdx]
                    const right = cols[c + 1]?.[rIdx]
                    const down = cols[c]?.[rIdx + 1]
                    const prox = m.active
                        ? Math.max(
                              0,
                              1 -
                                  Math.sqrt(
                                      (m.x - d.x) ** 2 + (m.y - d.y) ** 2
                                  ) /
                                      R
                          )
                        : 0

                    if (right) {
                        if (prox > 0) {
                            activeLines.push({ x1: d.x, y1: d.y, x2: right.x, y2: right.y, prox })
                        } else {
                            ctx.moveTo(d.x, d.y)
                            ctx.lineTo(right.x, right.y)
                        }
                    }
                    if (down) {
                        if (prox > 0) {
                            activeLines.push({ x1: d.x, y1: d.y, x2: down.x, y2: down.y, prox })
                        } else {
                            ctx.moveTo(d.x, d.y)
                            ctx.lineTo(down.x, down.y)
                        }
                    }
                }
            }
            ctx.stroke()

            // Draw active/highlighted lines near cursor
            for (const line of activeLines) {
                ctx.globalAlpha = 0.06 + line.prox * 0.7
                ctx.strokeStyle = lineColor
                ctx.lineWidth = 0.5 + line.prox * 1.5
                ctx.beginPath()
                ctx.moveTo(line.x1, line.y1)
                ctx.lineTo(line.x2, line.y2)
                ctx.stroke()
            }

            // Dots batching: Base dots vs Active dots
            ctx.globalAlpha = 0.22
            ctx.fillStyle = dotColor
            ctx.beginPath()

            const activeDots: { x: number; y: number; prox: number }[] = []

            for (const d of dots) {
                const prox = m.active
                    ? Math.max(
                          0,
                          1 - Math.sqrt((m.x - d.x) ** 2 + (m.y - d.y) ** 2) / R
                      )
                    : 0

                if (prox > 0) {
                    activeDots.push({ x: d.x, y: d.y, prox })
                } else {
                    ctx.moveTo(d.x + 0.8, d.y)
                    ctx.arc(d.x, d.y, 0.8, 0, 2 * Math.PI)
                }
            }
            ctx.fill()

            // Draw active/highlighted dots near cursor
            for (const d of activeDots) {
                ctx.globalAlpha = 0.22 + d.prox * 0.78
                ctx.fillStyle = dotColor
                ctx.beginPath()
                ctx.arc(d.x, d.y, 0.8 + d.prox * 2.2, 0, 2 * Math.PI)
                ctx.fill()
            }

            // Cursor trail line — visible on plain mouse move, fades out.
            let activeTrailCount = 0
            if (trail) {
                const now = performance.now()
                const tr = trailRef.current
                ctx.lineCap = "round"
                ctx.lineJoin = "round"
                for (let i = 1; i < tr.length; i++) {
                    const a = tr[i - 1]
                    const b = tr[i]
                    const age = now - b.t
                    if (age > 260) continue
                    activeTrailCount++
                    ctx.globalAlpha = Math.max(0, 1 - age / 260) * 0.85
                    ctx.strokeStyle = trailColor
                    ctx.lineWidth = 2
                    ctx.beginPath()
                    ctx.moveTo(a.x, a.y)
                    ctx.lineTo(b.x, b.y)
                    ctx.stroke()
                }
            }

            ctx.globalAlpha = 1

            // Pausa inteligente si no hay energía física y no hay interacción activa
            if (!m.active && maxEnergy < 0.005 && activeTrailCount === 0) {
                isRunning = false
                return
            }

            raf = requestAnimationFrame(frame)
        }
        wakeUp()

        return () => {
            isRunning = false
            cancelAnimationFrame(raf)
            ro?.disconnect()
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("touchmove", onTouch)
            document.removeEventListener("mouseleave", onLeave)
            window.removeEventListener("touchend", onLeave)
        }
    }, [
        background,
        dotColor,
        lineColor,
        trailColor,
        spacing,
        radius,
        strength,
        trail,
        isStatic,
    ])

    return (
        <div
            ref={hostRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                cursor: "crosshair",
                ...(props.style || {}),
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                }}
            />
        </div>
    )
}

const COMPONENT_DEFAULTS = {
    background: "#000000",
    dotColor: "#FFFFFF",
    lineColor: "#80ACFF",
    trail: true,
    trailColor: "#2664EB",
    spacing: 30,
    radius: 400,
    strength: 4,
}

KineticGrid.displayName = "Kinetic Grid"
