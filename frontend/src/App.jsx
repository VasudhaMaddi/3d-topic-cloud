import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import WordCloud3D from "./components/WordCloud3D";

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
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // backend is on 8000 locally
    axios.get("http://localhost:8000/health")
      .then(r => setHealth(r.data?.status ?? "ok"))
      .catch(() => setHealth("offline"));
  }, []);

  async function handleAnalyze() {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:8000/analyze", { url });
      setKeywords(res.data.keywords || []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Request failed");
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: "100vh", width: "100vw", display: "grid", gridTemplateRows: "48px 1fr" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px", borderBottom: "1px solid #eee" }}>
        <strong>3D Topic Cloud</strong>
        {/* URL input */}
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter article URL"
          style={{ flex: 1, minWidth: 260, padding: "6px 8px" }}
        />

        {/* Analyze button */}
        <button onClick={handleAnalyze} disabled={loading} style={{ padding: "6px 12px" }}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        <span style={{ fontSize: 12, opacity: 0.7 }}>backend: {health}</span>

        {/* error message */}
        {error && <span style={{ color: "red", fontSize: 12 }}>{error}</span>}
      </header>

      <div style={{ position: "relative" }}>
        <Canvas camera={{ position: [0, 0, 9], fov: 60 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 5, 2]} intensity={0.7} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[3, 5, 2]} intensity={0.7} />

          {keywords.length > 0 ? (
            <WordCloud3D keywords={keywords} />
          ) : (
            <SpinningBox />
          )}
          <OrbitControls enablePan enableZoom />
        </Canvas>
        <div style={{ position: "absolute", right: 12, top: 60, maxHeight: "70vh", overflow: "auto", background: "rgba(255,255,255,0.9)", padding: 12, borderRadius: 8, fontSize: 14 }}>
        {keywords.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {keywords.map(k => (
              <li key={k.word}>
                {k.word} : {k.weight.toFixed(3)}
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ opacity: 0.6 }}>No keywords yet</span>
        )}
      </div>
      </div>
    </div>
  );
}