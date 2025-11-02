import { useMemo, useRef } from "react";
import { Text, Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

// map helper
function mapRange(x, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return (outMin + outMax) / 2;
  const t = (x - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

// evenly spaced points on a sphere
function sphericalPositions(n, radius = 2.5) {
  if (n <= 0) return [];
  if (n === 1) return [[0, 0, 0]];                 // ← avoid division by zero
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;               // 1..-1
    const r = Math.sqrt(Math.max(0, 1 - y * y));   // guard tiny negatives
    const theta = i * golden;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    pts.push([x * radius, y * radius, z * radius]);
  }
  return pts;
}

export default function WordCloud3D({ keywords = [] }) {
  const group = useRef();

  // precompute base positions (stable per count)
  const basePositions = useMemo(
    () => sphericalPositions(keywords.length, 2.5),
    [keywords.length]
  );

  // normalize weights and build render items
  const items = useMemo(() => {
    if (!keywords.length) return [];
    const w = keywords.map(k => k.weight);
    const minW = Math.min(...w);
    const maxW = Math.max(...w);
    return keywords.map((k, i) => {
      const size = mapRange(k.weight, minW, maxW, 0.25, 1.0);
      // heatmap: small=blue, large=red
      const hue = mapRange(k.weight, minW, maxW, 220, 0);
      const color = `hsl(${hue}, 90%, 55%)`;
      return { ...k, size, color, position: basePositions[i] || [0, 0, 0] };
    });
  }, [keywords, basePositions]);

  // rotation + gentle bob, no drift and no out-of-bounds
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.15;

    const t = state.clock.getElapsedTime();
    const count = Math.min(group.current.children.length, basePositions.length);
    for (let i = 0; i < count; i++) {
      const child = group.current.children[i];    
      const base = basePositions[i];
      const amp = 0.12;
      child.position.set(base[0], base[1] + Math.sin(t + i * 0.7) * amp, base[2]);
    }
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <group key={`${it.word}-${i}`} position={it.position}>
           <Text
             fontSize={it.size}
             color={it.color}
             anchorX="center"
             anchorY="middle"
             outlineWidth={0.005}
             outlineColor="#000"
             // keep depthTest off if you never want words hidden
             depthTest={false}
             depthWrite={false}
           >
             {it.word}
           </Text>
        </group>
      ))}
    </group>
  );
}