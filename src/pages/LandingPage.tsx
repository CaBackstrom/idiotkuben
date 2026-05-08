import { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Navigate } from './routes'
import { useLanguage } from '../context/LanguageContext'
import { solvedState, FACE_COLORS, type CubeState } from '../cube/CubeState'
import { mulberry32 } from '../cube/prng'
import { Moves, ALL_MOVES } from '../cube/moves'
import { solveLayerByLayerPhases } from '../solver/lbl'
import TopNav from '../components/TopNav'
import MeshAura from '../components/landing/MeshAura'

// ── Cube state sequence ───────────────────────────────────────────────────────

function makeScrambledState(): CubeState {
  const rand = mulberry32(12345)
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

function rebuildGroup(group: THREE.Group, state: CubeState) {
  // Dispose existing children
  group.children.slice().forEach(child => {
    group.remove(child)
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      ;(child.material as THREE.Material).dispose()
    }
  })
  // Rebuild cubies from new state
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++)
      for (let x = -1; x <= 1; x++) {
        const mesh = buildCubie(x, y, z, state)
        mesh.position.set(x, y, z)
        group.add(mesh)
      }
}

// ── Landing cube scene ────────────────────────────────────────────────────────

type SceneProps = {
  scrollRef: React.MutableRefObject<number>
  mobile: boolean
  statesRef: React.MutableRefObject<CubeState[]>
  readyRef: React.MutableRefObject<boolean>
}

function LandingCubeScene({ scrollRef, mobile, statesRef, readyRef }: SceneProps) {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group | null>(null)
  const timeRef = useRef(0)
  const lastIdxRef = useRef(-1)

  useEffect(() => {
    const group = new THREE.Group()
    group.rotation.x = 0.4
    scene.add(group)
    groupRef.current = group

    // Build initial (scrambled) cube
    rebuildGroup(group, SCRAMBLED_STATE)
    lastIdxRef.current = 0

    return () => {
      scene.remove(group)
      group.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          ;(child.material as THREE.Material).dispose()
        }
      })
      groupRef.current = null
    }
  }, [scene])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    timeRef.current += delta * 0.3

    if (!readyRef.current) {
      // Spin slowly while loading
      g.rotation.y = timeRef.current * 0.5
      return
    }

    const states = statesRef.current
    const n = states.length

    let targetIdx: number
    if (mobile) {
      // On mobile: loop through the solution over ~10s
      const loopT = (timeRef.current % 10) / 10
      targetIdx = Math.floor(loopT * (n - 1))
    } else {
      targetIdx = Math.round(scrollRef.current * (n - 1))
    }

    targetIdx = Math.max(0, Math.min(n - 1, targetIdx))

    if (targetIdx !== lastIdxRef.current) {
      rebuildGroup(g, states[targetIdx])
      lastIdxRef.current = targetIdx
    }

    // Ambient y-rotation (always present)
    g.rotation.y = timeRef.current
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
  const { t } = useLanguage()
  const heroRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef(0)
  const [progress, setProgress] = useState(0)
  const mobile = window.innerWidth < 640

  // Self-solving cube states
  const statesRef = useRef<CubeState[]>([SCRAMBLED_STATE])
  const readyRef = useRef(false)
  const [cubeReady, setCubeReady] = useState(false)

  // Compute solution in background after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const phases = solveLayerByLayerPhases(SCRAMBLED_STATE)
        const allMoves = phases.flatMap(p => p.moves)
        const states: CubeState[] = [SCRAMBLED_STATE]
        let cur = SCRAMBLED_STATE
        for (const move of allMoves) {
          cur = Moves[move](cur)
          states.push(cur)
        }
        statesRef.current = states
        readyRef.current = true
        setCubeReady(true)
      } catch {
        // solver failed — keep scrambled static cube, still show it
        readyRef.current = true
        setCubeReady(true)
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [])

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

  const texts = [t('landing.hero1'), t('landing.hero2'), t('landing.hero3')]
  const opacities = mobile
    ? [1, 1, 1]
    : [textOp(0, 0.45, progress), textOp(0.3, 0.75, progress), textOp(0.6, 1.0, progress)]

  const cubeScene = useMemo(() => (
    <Canvas
      camera={{ position: [5, 4, 5], fov: 45 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <LandingCubeScene
        scrollRef={scrollRef}
        mobile={mobile}
        statesRef={statesRef}
        readyRef={readyRef}
      />
    </Canvas>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [mobile])

  return (
    <div className="bg-[var(--bg)] text-[var(--fg)] font-sans">
      <TopNav navigate={navigate} wordmarkOnly />

      {/* Hero — mobile */}
      {mobile && (
        <section className="flex flex-col">
          <div className="px-8 pt-10 pb-4">
            <h1 className="leading-tight">
              <span
                className="block"
                style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', fontStyle: 'italic', fontWeight: 400 }}
              >
                Idiotkuben
              </span>
              <span
                className="block tracking-wider uppercase"
                style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.12em', color: 'var(--muted)', marginTop: '0.25rem' }}
              >
                {t('landing.hero2')}
              </span>
            </h1>
          </div>
          <div className="relative" style={{ height: '55vh', background: 'var(--bg)' }}>
            <MeshAura />
            <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
              {cubeScene}
            </div>
            {!cubeReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-[var(--muted)] animate-pulse">{t('landing.cubeLoading')}</p>
              </div>
            )}
          </div>
          <div className="px-8 py-8">
            <p className="font-bold text-xl leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {t('landing.hero1')}
              <br />{t('landing.hero2')}
              <br />{t('landing.hero3')}
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
              <h1 className="leading-none mb-6">
                <span
                  className="block"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(4rem, 6vw, 6rem)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                  }}
                >
                  Idiotkuben
                </span>
                <span
                  className="block tracking-wider uppercase"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)',
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    color: 'var(--muted)',
                    marginTop: '0.5rem',
                  }}
                >
                  {t('landing.hero2')}
                </span>
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

              {!cubeReady && (
                <p className="text-xs text-[var(--muted)] animate-pulse mt-4">{t('landing.cubeLoading')}</p>
              )}
            </div>

            {/* Right: canvas — 55% wide, mesh aura behind */}
            <div
              className="relative"
              style={{ width: '55%', height: '100%', background: 'var(--bg)' }}
            >
              <MeshAura />
              <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
                {cubeScene}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative sm:py-20 py-12 px-6 text-center" style={{ overflow: 'hidden' }}>
        <MeshAura />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => navigate('/level')}
            className="px-8 py-4 text-base font-semibold rounded hover:opacity-90 transition-opacity sm:w-auto w-full"
            style={{
              backdropFilter: 'blur(12px) saturate(150%)',
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'var(--fg)',
              boxShadow: '0 2px 12px rgba(26,26,26,0.12)',
            }}
          >
            {t('landing.cta')}
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="sm:pb-20 pb-12 px-6 max-w-4xl mx-auto">
        <h2
          className="text-2xl font-bold mb-10 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('landing.howTitle')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { n: '1', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
            { n: '2', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
            { n: '3', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
          ].map(({ n, title, desc }) => (
            <div key={n} className="card-base">
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
