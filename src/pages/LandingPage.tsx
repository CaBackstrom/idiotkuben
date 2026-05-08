import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Navigate } from './routes'
import { sv } from '../i18n/sv'
import { solvedState, FACE_COLORS, type CubeState } from '../cube/CubeState'
import { mulberry32 } from '../cube/prng'
import { Moves, ALL_MOVES } from '../cube/moves'
import TopNav from '../components/TopNav'

// ── Scrambled state (seed 29810, 20 moves) ───────────────────────────────────

function makeScrambledState(): CubeState {
  const rand = mulberry32(29810)
  let state = solvedState()
  for (let i = 0; i < 20; i++) {
    state = Moves[ALL_MOVES[Math.floor(rand() * ALL_MOVES.length)]](state)
  }
  return state
}

const SCRAMBLED_STATE = makeScrambledState()

// ── Cube mesh builder ─────────────────────────────────────────────────────────

function faceIndex(face: keyof CubeState, px: number, py: number, pz: number): number {
  switch (face) {
    case 'U': return (pz + 1) * 3 + (px + 1)
    case 'D': return (1 - pz) * 3 + (px + 1)
    case 'F': return (1 - py) * 3 + (px + 1)
    case 'B': return (1 - py) * 3 + (1 - px)
    case 'R': return (1 - py) * 3 + (1 - pz)
    case 'L': return (1 - py) * 3 + (pz + 1)
  }
}

function buildCubie(px: number, py: number, pz: number, state: CubeState): THREE.Mesh {
  const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95)
  const faceHexes = [
    px ===  1 ? FACE_COLORS[state.R[faceIndex('R', px, py, pz)]] : '#111111',
    px === -1 ? FACE_COLORS[state.L[faceIndex('L', px, py, pz)]] : '#111111',
    py ===  1 ? FACE_COLORS[state.U[faceIndex('U', px, py, pz)]] : '#111111',
    py === -1 ? FACE_COLORS[state.D[faceIndex('D', px, py, pz)]] : '#111111',
    pz ===  1 ? FACE_COLORS[state.F[faceIndex('F', px, py, pz)]] : '#111111',
    pz === -1 ? FACE_COLORS[state.B[faceIndex('B', px, py, pz)]] : '#111111',
  ]
  const count = (geo.attributes['position'] as THREE.BufferAttribute).count
  const colors = new Float32Array(count * 3)
  faceHexes.forEach((hex, f) => {
    const c = new THREE.Color(hex)
    for (let v = f * 4; v < (f + 1) * 4; v++) {
      colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b
    }
  })
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }))
}

// ── Landing cube scene ────────────────────────────────────────────────────────

type SceneProps = { scrollRef: React.MutableRefObject<number>; mobile: boolean }

function LandingCubeScene({ scrollRef, mobile }: SceneProps) {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    const group = new THREE.Group()
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++)
        for (let x = -1; x <= 1; x++) {
          const mesh = buildCubie(x, y, z, SCRAMBLED_STATE)
          mesh.position.set(x, y, z)
          group.add(mesh)
        }
    group.rotation.x = 0.4
    scene.add(group)
    groupRef.current = group
    return () => {
      scene.remove(group)
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          ;(child.material as THREE.Material).dispose()
        }
      })
    }
  }, [scene])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    if (mobile) {
      timeRef.current += delta * 0.4
      g.rotation.y = timeRef.current
    } else {
      g.rotation.y = scrollRef.current * Math.PI * 2
    }
  })

  return null
}

// ── Scroll opacity helper ─────────────────────────────────────────────────────

function textOp(start: number, end: number, t: number): number {
  const fade = 0.1
  if (t <= start || t >= end) return 0
  if (t < start + fade) return (t - start) / fade
  if (t > end - fade) return (end - t) / fade
  return 1
}

// ── Landing page ──────────────────────────────────────────────────────────────

export default function LandingPage({ navigate }: { navigate: Navigate }) {
  const heroRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef(0)
  const [progress, setProgress] = useState(0)
  const mobile = window.innerWidth < 640

  useEffect(() => {
    if (mobile) return
    const handler = () => {
      const el = heroRef.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      const p = Math.max(0, Math.min(1, -top / (height - window.innerHeight)))
      scrollRef.current = p
      setProgress(p)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [mobile])

  const texts = [sv.landing.hero1, sv.landing.hero2, sv.landing.hero3]
  const opacities = mobile
    ? [1, 1, 1]
    : [textOp(0, 0.45, progress), textOp(0.3, 0.75, progress), textOp(0.6, 1.0, progress)]

  // Camera pulled back to [5, 4, 5] so the cube fits fully within the canvas
  const canvas = (
    <Canvas camera={{ position: [5, 4, 5], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <LandingCubeScene scrollRef={scrollRef} mobile={mobile} />
    </Canvas>
  )

  return (
    <div className="bg-[var(--bg)] text-[var(--fg)] font-sans">
      <TopNav navigate={navigate} />

      {/* Hero — mobile */}
      {mobile && (
        <section className="flex flex-col">
          <div className="px-8 pt-10 pb-4">
            <h1
              className="font-bold leading-none"
              style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem' }}
            >
              Idiotkuben
            </h1>
          </div>
          <div style={{ height: '55vh', background: 'var(--bg)' }}>
            {canvas}
          </div>
          <div className="px-8 py-8">
            <p className="font-bold text-xl leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {sv.landing.hero1}
              <br />{sv.landing.hero2}
              <br />{sv.landing.hero3}
            </p>
          </div>
        </section>
      )}

      {/* Hero — desktop */}
      {!mobile && (
        <section ref={heroRef} style={{ height: '300vh' }}>
          <div
            className="flex overflow-hidden"
            style={{ position: 'sticky', top: '56px', height: 'calc(100vh - 56px)' }}
          >
            {/* Left: large title + scroll taglines */}
            <div
              className="relative flex flex-col justify-center"
              style={{ width: '45%', height: '100%', paddingLeft: '10%', paddingRight: '6%' }}
            >
              <h1
                className="font-bold leading-none mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(4rem, 6vw, 6rem)',
                }}
              >
                Idiotkuben
              </h1>

              {/* Taglines — one visible at a time, scroll-driven */}
              <div className="relative" style={{ height: '2.5em' }}>
                {texts.map((text, i) => (
                  <p
                    key={i}
                    className="absolute top-0 left-0 font-medium leading-snug"
                    style={{
                      opacity: opacities[i],
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
                      color: 'var(--muted)',
                    }}
                  >
                    {text}
                  </p>
                ))}
              </div>
            </div>

            {/* Right: canvas — 55% wide, cube ~40% of viewport */}
            <div
              className="relative"
              style={{ width: '55%', height: '100%', background: 'var(--bg)' }}
            >
              {canvas}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <button
          onClick={() => navigate('/level')}
          className="px-8 py-4 text-base font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 transition-opacity sm:w-auto w-full"
        >
          {sv.landing.cta}
        </button>
      </section>

      {/* How it works */}
      <section className="pb-20 px-6 max-w-4xl mx-auto">
        <h2
          className="text-2xl font-bold mb-10 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {sv.landing.howTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { n: '1', title: sv.landing.step1Title, desc: sv.landing.step1Desc },
            { n: '2', title: sv.landing.step2Title, desc: sv.landing.step2Desc },
            { n: '3', title: sv.landing.step3Title, desc: sv.landing.step3Desc },
          ].map(({ n, title, desc }) => (
            <div key={n} className="p-6 bg-white border border-[var(--border)] rounded-lg">
              <div
                className="text-3xl font-bold text-[var(--accent)] mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {n}
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-[var(--muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
