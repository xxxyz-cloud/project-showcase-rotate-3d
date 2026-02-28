import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

// ─── Config ───────────────────────────────────────────────────────────────────
const RADIUS    = 2.8;
const PANEL_W   = 3.0;
const PANEL_H   = 2.0;
const COUNT     = 4;
const AUTO_SPEED = 0.07;

const getActiveIndex = (rotY) => {
  let best = 0, bestVal = -Infinity;
  for (let i = 0; i < COUNT; i++) {
    const angle = (i / COUNT) * Math.PI * 2;
    const val = Math.cos(angle + rotY);
    if (val > bestVal) { bestVal = val; best = i; }
  }
  return best;
};

// ─── Canvas fallback texture ──────────────────────────────────────────────────
const makeFallbackTexture = (project) => {
  const W = 1024, H = 680;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#080810";
  ctx.fillRect(0, 0, W, H);

  const hex = project.accent;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);

  const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.55);
  grad.addColorStop(0,   `rgba(${r},${g},${b},0.22)`);
  grad.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = `rgba(${r},${g},${b},0.06)`;
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Accent rule
  ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
  ctx.fillRect(W*0.1, H*0.44, W*0.8, 1.5);

  // Title
  ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
  ctx.font = `bold ${W*0.09}px "Helvetica Neue", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(project.title.toUpperCase(), W/2, H*0.54);

  // Category
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.font = `${W*0.024}px "Helvetica Neue", sans-serif`;
  ctx.fillText(project.category.toUpperCase(), W/2, H*0.645);

  // Corner marks
  const ml = 26, mT = 1.5, pad = 30;
  ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
  ctx.lineWidth = mT;
  [[pad,pad,1,1],[W-pad,pad,-1,1],[W-pad,H-pad,-1,-1],[pad,H-pad,1,-1]].forEach(([cx,cy,sx,sy]) => {
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+sx*ml,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy+sy*ml); ctx.stroke();
  });

  return new THREE.CanvasTexture(canvas);
};

// ─── Robust texture (fallback → real swap) ────────────────────────────────────
function useRobustTexture(project) {
  const fallback = useMemo(() => makeFallbackTexture(project), [project]);
  const [tex, setTex] = useState(fallback);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      project.image,
      (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        setTex(loaded);
      },
      undefined,
      () => { /* keep fallback silently */ }
    );
  }, [project.image]);

  return tex;
}

// ─── Particles ────────────────────────────────────────────────────────────────
function Particles({ count = 480 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = 5.5 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.38;
      pos[i*3+2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.007;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.011} color="#8aa4c0" transparent opacity={0.42} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// ─── Ambient floor glow ───────────────────────────────────────────────────────
function FloorGlow({ accentColor }) {
  const matRef = useRef();
  const target = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.color.lerp(target, delta * 2.5);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.3, 0]}>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial
        ref={matRef}
        color={accentColor}
        metalness={0.98}
        roughness={0.82}
        transparent
        opacity={0.055}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Single Panel ─────────────────────────────────────────────────────────────
function Panel({ index, project, isActive, onHover, hovered }) {
  const texture      = useRobustTexture(project);
  const meshRef      = useRef();
  const borderRef    = useRef();
  const scaleVec     = useRef(new THREE.Vector3(1, 1, 1));
  const accentColor  = useMemo(() => new THREE.Color(project.accent), [project.accent]);

  const angle     = (index / COUNT) * Math.PI * 2;
  const x         = Math.sin(angle) * RADIUS;
  const z         = Math.cos(angle) * RADIUS;
  const panelRotY = angle; // FIX: was -angle, see below

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const targetScale = hovered ? 1.055 : isActive ? 1.01 : 0.965;
    scaleVec.current.set(targetScale, targetScale, 1);
    meshRef.current.scale.lerp(scaleVec.current, delta * 8);

    const mat = meshRef.current.material;
    if (mat) {
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        hovered ? 0.3 : isActive ? 0.1 : 0.0,
        delta * 9
      );
    }

    if (borderRef.current?.material) {
      borderRef.current.material.opacity = THREE.MathUtils.lerp(
        borderRef.current.material.opacity,
        hovered ? 0.95 : isActive ? 0.55 : 0.1,
        delta * 7
      );
    }
  });

  return (
    <group position={[x, 0, z]} rotation={[0, panelRotY, 0]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); onHover(index); }}
        onPointerOut={(e)  => { e.stopPropagation(); onHover(-1);    }}
      >
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.1}
          metalness={0.04}
          side={THREE.DoubleSide}
          emissive={accentColor}
          emissiveIntensity={0.0}
        />
      </mesh>

      {/* Thin accent border */}
      <mesh ref={borderRef} position={[0, 0, -0.002]}>
        <planeGeometry args={[PANEL_W + 0.022, PANEL_H + 0.022]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Bottom accent line */}
      <mesh position={[0, -(PANEL_H / 2 + 0.008), 0.001]}>
        <planeGeometry args={[PANEL_W * 0.88, 0.0028]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={isActive ? 1.0 : 0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Lights ───────────────────────────────────────────────────────────────────
function SceneLights() {
  const l1 = useRef();
  const l2 = useRef();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    l1.current?.position.set(Math.sin(t*0.3)*6,  Math.cos(t*0.19)*3, Math.cos(t*0.3)*6);
    l2.current?.position.set(Math.cos(t*0.24)*5, Math.sin(t*0.16)*2, Math.sin(t*0.24)*5);
  });

  return (
    <>
      <ambientLight intensity={0.045} />
      <directionalLight position={[2, 9, 6]} intensity={2.4} color="#f2eade" />
      <pointLight ref={l1} color="#ffffff" intensity={1.8} distance={16} decay={2} />
      <pointLight ref={l2} color="#5070a8" intensity={1.1} distance={13} decay={2} />
      <pointLight position={[0, 0, -7]} color="#1a2840" intensity={0.9} distance={11} />
    </>
  );
}

// ─── Camera ───────────────────────────────────────────────────────────────────
function CameraController() {
  useFrame(({ camera, clock }) => {
    if (camera.position.z > 8.01) camera.position.z += (8 - camera.position.z) * 0.035;
    camera.position.y += (Math.sin(clock.elapsedTime * 0.28) * 0.16 - camera.position.y) * 0.011;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const Showcase = ({ projects, onActiveChange }) => {
  const groupRef = useRef();
  const { gl }   = useThree();

  const rotY       = useRef(0);
  const targetRotY = useRef(0);
  const isDragging = useRef(false);
  const lastPtrX   = useRef(0);
  const velocity   = useRef(0);
  const lastActive = useRef(0);

  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [localActive,  setLocalActive]  = useState(0);

  useEffect(() => {
    const el = gl.domElement;
    const onDown  = (e) => { isDragging.current = true; lastPtrX.current = e.clientX; velocity.current = 0; };
    const onMove  = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPtrX.current;
      velocity.current = dx * 0.006; targetRotY.current += dx * 0.006; lastPtrX.current = e.clientX;
    };
    const onUp    = () => { isDragging.current = false; };
    const onWheel = (e) => { targetRotY.current += e.deltaY * 0.0016; velocity.current = 0; };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!isDragging.current) {
      velocity.current   *= 0.91;
      targetRotY.current += velocity.current * delta * 60;
      targetRotY.current += AUTO_SPEED * delta;
    }
    rotY.current += (targetRotY.current - rotY.current) * Math.min(delta * 6, 1);
    groupRef.current.rotation.y = rotY.current;

    const active = getActiveIndex(rotY.current);
    if (active !== lastActive.current) {
      lastActive.current = active;
      setLocalActive(active);
      onActiveChange(active);
    }
  });

  return (
    <>
      <CameraController />
      <SceneLights />
      <Particles />
      <FloorGlow accentColor={projects[localActive].accent} />
      <group ref={groupRef}>
        {projects.map((project, i) => (
          <Panel
            key={i}
            index={i}
            project={project}
            isActive={localActive === i}
            hovered={hoveredIndex === i}
            onHover={setHoveredIndex}
          />
        ))}
      </group>
    </>
  );
};

export default Showcase;