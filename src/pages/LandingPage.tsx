import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Navigate } from './routes'
import { sv } from '../i18n/sv'

// ── Solved cube mesh builder ──────────────────────────────────────────────────

function buildSolvedCubie(px: number, py: number, pz: number): THREE.Mesh {
  const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95)
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (4 verts each)
  const faceColors = [
    px ===  1 ? '#B71234' : '#111111',
    px === -1 ? '#FF5800' : '#111111',
    py ===  1 ? '#FFFFFF' : '#111111',
    py === -1 ? '#FFCC00' : '#111111',
    pz ===  1 ? '#009B48' : '#111111',
    pz === -1 ? '#0046AD' : '#111111',
  ]
  const count = (geo.attributes['position'] as THREE.BufferAttribute).count
  const colors = new Float32Array(count * 3)
  faceColors.forEach((hex, f) => {
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
          const mesh = buildSolvedCubie(x, y, z)
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

  const canvas = (
    <Canvas camera={{ position: [3.5, 3.5, 3.5], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <LandingCubeScene scrollRef={scrollRef} mobile={mobile} />
    </Canvas>
  )

  return (
    <div className="bg-[var(--bg)] text-[var(--fg)] font-sans">
      {/* Header */}
      <header className="px-8 py-5">
        <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Idiotkuben
        </span>
      </header>

      {/* Hero — mobile */}
      {mobile && (
        <section className="flex flex-col">
          <div style={{ height: '60vh', background: 'var(--bg)' }}>
            {canvas}
          </div>
          <div className="px-8 py-8">
            <h1
              className="font-bold leading-tight text-4xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {sv.landing.hero1}
              <br />
              {sv.landing.hero2}
              <br />
              {sv.landing.hero3}
            </h1>
          </div>
        </section>
      )}

      {/* Hero — desktop */}
      {!mobile && (
        <section ref={heroRef} style={{ height: '300vh' }}>
          <div
            className="flex overflow-hidden"
            style={{ position: 'sticky', top: 0, height: '100vh' }}
          >
            {/* Text column */}
            <div className="relative" style={{ width: '45%', height: '100%' }}>
              {texts.map((text, i) => (
                <div
                  key={i}
                  className="absolute inset-0 flex items-center"
                  style={{ opacity: opacities[i], paddingLeft: '10%', paddingRight: '6%' }}
                >
                  <p
                    className="font-bold leading-tight"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(2rem, 4vw, 3.75rem)',
                    }}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>

            {/* Canvas column */}
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
