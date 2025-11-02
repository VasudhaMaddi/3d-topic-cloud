import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function SpinningBox() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.6;
      ref.current.rotation.y += delta * 0.8;
    }
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.6, 1.6, 1.6]} />
      <meshNormalMaterial />
    </mesh>
  );
}

export default function App() {
  const [health, setHealth] = useState("checking...");

  useEffect(() => {
    // backend is on 8000 locally
    axios.get("http://localhost:8000/health")
      .then(r => setHealth(r.data?.status ?? "ok"))
      .catch(() => setHealth("offline"));
  }, []);

  return (
    <div style={{ height: "100vh", width: "100vw", display: "grid", gridTemplateRows: "48px 1fr" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px", borderBottom: "1px solid #eee" }}>
        <strong>3D Topic Cloud</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>backend: {health}</span>
      </header>

      <div style={{ position: "relative" }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 5, 2]} intensity={0.7} />
          <SpinningBox />
          <OrbitControls enablePan enableZoom />
        </Canvas>
      </div>
    </div>
  );
}