import { Canvas } from "@react-three/fiber";
import React, { useState, useRef } from "react";
import "./style.css";
import Showcase from "./Showcase";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";

export const projects = [
  {
    id: 0,
    title: "Phantom",
    category: "Brand Identity",
    year: "2024",
    desc: "A complete visual identity system built around negative space and controlled contrast.",
    image: "./image1.png",
    accent: "#ff6b35",
  },
  {
    id: 1,
    title: "Luminary",
    category: "Digital Experience",
    year: "2024",
    desc: "An interactive web experience exploring light and perception for a cultural institution.",
    image: "./image2.png",
    accent: "#c9a96e",
  },
  {
    id: 2,
    title: "Nexus",
    category: "Web Platform",
    year: "2023",
    desc: "A design-system-driven SaaS platform shipping to 80k+ users across 40 countries.",
    image: "./image3.png",
    accent: "#6ea8c9",
  },
  {
    id: 3,
    title: "Verdant",
    category: "Mobile Application",
    year: "2023",
    desc: "An iOS app merging biophilic design principles with precision data visualization.",
    image: "./image4.png",
    accent: "#7bc98a",
  },
];

// ─── Custom Cursor ────────────────────────────────────────────────────────────
function Cursor() {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);
  const pos     = useRef({ x: -200, y: -200 });
  const ring    = useRef({ x: -200, y: -200 });
  const raf     = useRef(null);
  const isHover = useRef(false);

  React.useEffect(() => {
    const onMove = (e) => { pos.current = { x: e.clientX, y: e.clientY }; };

    const onOver = (e) => {
      if (e.target.closest("canvas")) {
        isHover.current = true;
        if (ringRef.current) { ringRef.current.style.width = "56px"; ringRef.current.style.height = "56px"; }
      }
    };
    const onOut = () => {
      isHover.current = false;
      if (ringRef.current) { ringRef.current.style.width = "36px"; ringRef.current.style.height = "36px"; }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout",  onOut);

    const tick = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.12;
      ring.current.y += (pos.current.y - ring.current.y) * 0.12;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x}px,${pos.current.y}px) translate(-50%,-50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px,${ring.current.y}px) translate(-50%,-50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout",  onOut);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
const App = () => {
  const [activeIndex,  setActiveIndex]  = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timeoutRef = useRef(null);

  const handleActiveChange = (idx) => {
    if (idx === activeIndex) return;
    setTransitioning(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveIndex(idx);
      setTransitioning(false);
    }, 180);
  };

  const current = projects[activeIndex];

  return (
    <div className="app-root">
      <Cursor />

      <Canvas
        camera={{ fov: 38, position: [0, 0, 14] }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
        dpr={[1, 2]}
      >
        <Showcase projects={projects} onActiveChange={handleActiveChange} />
        <EffectComposer>
          <Bloom
            mipmapBlur
            intensity={1.2}
            luminanceThreshold={0.22}
            luminanceSmoothing={0.35}
            radius={0.65}
          />
          <ChromaticAberration offset={new THREE.Vector2(0.0004, 0.0004)} />
          <Noise opacity={0.025} />
          <Vignette eskil={false} offset={0.14} darkness={1.05} />
        </EffectComposer>
      </Canvas>

      {/* HTML Overlay */}
      <div className="overlay">
        <div className="overlay-top">
          <div className="overlay-logo">VOID<span className="logo-dot">◆</span>STUDIO</div>
          <div className="overlay-nav">
            <span>Selected Works</span>
            <span className="nav-sep">·</span>
            <span>2023–2024</span>
          </div>
        </div>

        <div className="overlay-bottom">
          <div className={`project-info ${transitioning ? "fade-out" : "fade-in"}`}>
            <div className="project-counter">
              <span className="counter-current" style={{ color: current.accent }}>
                {String(activeIndex + 1).padStart(2, "0")}
              </span>
              <span className="counter-sep">/</span>
              <span className="counter-total">{String(projects.length).padStart(2, "0")}</span>
            </div>

            <h2 className="project-title" style={{ "--accent": current.accent }}>
              {current.title}
            </h2>

            <div className="project-meta-row">
              <span className="project-category">{current.category}</span>
              <span className="meta-sep">·</span>
              <span className="project-year">{current.year}</span>
            </div>

            <p className="project-desc">{current.desc}</p>
          </div>

          <div className="project-dots">
            {projects.map((p, i) => (
              <div
                key={i}
                className={`proj-dot ${i === activeIndex ? "active" : ""}`}
                style={{ "--c": p.accent }}
              />
            ))}
          </div>
        </div>

        <div className="drag-hint">
          <div className="drag-arrow"><span className="drag-line" /></div>
          <span>Drag or scroll</span>
        </div>
      </div>
    </div>
  );
};

export default App;