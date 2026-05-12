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
import HowItWorks from '../components/landing/HowItWorks'
import TwoLevels from '../components/landing/TwoLevels'
import TutorTease from '../components/landing/TutorTease'
import Footer from '../components/landing/Footer'
import FloatingCTA from '../components/landing/FloatingCTA'

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
  group.children.slice().forEach(child => {
    group.remove(child)
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      ;(child.material as THREE.Material).dispose()
    }
  })
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
      g.rotation.y = timeRef.current * 0.5
      return
    }

    const states = statesRef.current
    const n = states.length

    let targetIdx: number
    if (mobile) {
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

    g.rotation.y = timeRef.current
  })

  return null
}

// ── Landing page ──────────────────────────────────────────────────────────────

export default function LandingPage({ navigate }: { navigate: Navigate }) {
  const { t } = useLanguage()
  const heroRef = useRef<HTMLElement | null>(null)
  const scrollRef = useRef(0)
  const mobile = window.innerWidth < 640

  const statesRef = useRef<CubeState[]>([SCRAMBLED_STATE])
  const readyRef = useRef(false)
  const [cubeReady, setCubeReady] = useState(false)

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
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [mobile])

  const cubeScene = useMemo(() => (
    <Canvas
      camera={{ position: [5, 4, 5], fov: 45 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 8, 5]} intensity={0.5} />
      <LandingCubeScene
        scrollRef={scrollRef}
        mobile={mobile}
        statesRef={statesRef}
        readyRef={readyRef}
      />
    </Canvas>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [mobile])

  const benefits = [
    t('landing.benefit1'),
    t('landing.benefit2'),
    t('landing.benefit3'),
  ]

  return (
    <div className="bg-[var(--bg)] text-[var(--fg)] font-sans">
      <TopNav navigate={navigate} wordmarkOnly />

      {/* ── Mobile hero ─────────────────────────────────────────────────── */}
      {mobile && (
        <section ref={heroRef as React.RefObject<HTMLElement>} className="flex flex-col">
          <div className="px-8 pt-10 pb-6">
            {/* A3: Oversized dramatic heading */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              <span
                style={{ display: 'block', fontSize: '4rem', fontStyle: 'italic', fontWeight: 300 }}
              >
                Idiot–
              </span>
              <span
                style={{ display: 'block', fontSize: '4rem', fontStyle: 'italic', fontWeight: 700 }}
              >
                kuben
              </span>
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginTop: '0.75rem',
                marginBottom: 0,
              }}
            >
              {t('landing.hero2')}
            </p>

            {/* A1: Three benefits with accent blocks */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '1.75rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {benefits.map((b, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      background: 'var(--accent)',
                      flexShrink: 0,
                      marginTop: '0.375rem',
                    }}
                  />
                  <span style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--fg)' }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cube canvas with mesh aura + D2 floor glow */}
          <div className="relative" style={{ height: '55vw', minHeight: '260px', maxHeight: '400px', background: 'var(--bg)' }}>
            <MeshAura />
            {/* D2: Soft radial floor glow */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80%',
                height: '40px',
                background: 'radial-gradient(ellipse, rgba(255,213,0,0.25) 0%, transparent 70%)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
              {cubeScene}
            </div>
            {!cubeReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-[var(--muted)] animate-pulse">{t('landing.cubeLoading')}</p>
              </div>
            )}
          </div>

          {/* CTA + social proof */}
          <div className="px-8 pt-8 pb-28 flex flex-col gap-3">
            <button
              onClick={() => navigate('/level')}
              style={{
                padding: '0.9375rem',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(200,16,46,0.28)',
              }}
            >
              {t('landing.cta')}
            </button>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center' }}>
              {t('landing.socialProof')}
            </p>
          </div>
        </section>
      )}

      {/* ── Desktop hero ─────────────────────────────────────────────────── */}
      {!mobile && (
        <section ref={heroRef as React.RefObject<HTMLElement>} style={{ height: '250vh' }}>
          <div
            className="flex overflow-hidden"
            style={{ position: 'sticky', top: '56px', height: 'calc(100vh - 56px)' }}
          >
            {/* Left: heading + benefits + CTA */}
            <div
              style={{
                width: '48%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingLeft: 'clamp(2rem, 10vw, 14vw)',
                paddingRight: '4%',
              }}
            >
              {/* A3: Oversized split-weight heading */}
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  lineHeight: 0.9,
                  letterSpacing: '-0.025em',
                  margin: 0,
                  marginBottom: '1.5rem',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: 'clamp(4rem, 8.5vw, 9rem)',
                    fontStyle: 'italic',
                    fontWeight: 300,
                  }}
                >
                  Idiot–
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 'clamp(4rem, 8.5vw, 9rem)',
                    fontStyle: 'italic',
                    fontWeight: 700,
                  }}
                >
                  kuben
                </span>
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: '2rem',
                }}
              >
                {t('landing.hero2')}
              </p>

              {/* A1: Benefits list */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {benefits.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        background: 'var(--accent)',
                        flexShrink: 0,
                        marginTop: '0.35rem',
                      }}
                    />
                    <span style={{ fontSize: '1.125rem', lineHeight: '1.6', color: 'var(--fg)' }}>{b}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '320px' }}>
                <button
                  onClick={() => navigate('/level')}
                  style={{
                    padding: '0.9375rem 2rem',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(200,16,46,0.28)',
                    textAlign: 'center',
                  }}
                >
                  {t('landing.cta')}
                </button>
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  {t('landing.socialProof')}
                </p>
              </div>

              {!cubeReady && (
                <p className="text-xs text-[var(--muted)] animate-pulse mt-4">{t('landing.cubeLoading')}</p>
              )}
            </div>

            {/* Right: cube with mesh aura + D2 floor glow */}
            <div
              style={{ width: '52%', height: '100%', position: 'relative', background: 'var(--bg)' }}
            >
              <MeshAura />
              {/* D2: Floor glow */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60%',
                  height: '50px',
                  background: 'radial-gradient(ellipse, rgba(255,213,0,0.2) 0%, transparent 70%)',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              />
              <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
                {cubeScene}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Content sections ──────────────────────────────────────────────── */}
      <HowItWorks />
      <TwoLevels navigate={navigate} />
      <TutorTease />
      <Footer />

      {/* C1: Floating CTA — mobile only, fades in when hero scrolls out */}
      <FloatingCTA heroRef={heroRef} navigate={navigate} />
    </div>
  )
}
