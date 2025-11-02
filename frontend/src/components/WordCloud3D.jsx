import { useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

// simple linear mapping helper
function mapRange(x, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return (outMin + outMax) / 2;
  const t = (x - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

// deterministic placement on a sphere using the golden angle
function sphericalPositions(n, radius = 3) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5)); // ~2.399
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;  // from 1 to -1
    const r = Math.sqrt(1 - y * y);
    const theta = i * golden;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    pts.push([x * radius, y * radius, z * radius]);
  }
  return pts;
}

export default function WordCloud3D({ keywords = [] }) {
  const group = useRef();

  // normalize weights and precompute positions once per keyword list
  const items = useMemo(() => {
    if (!keywords.length) return [];
    const w = keywords.map(k => k.weight);
    const minW = Math.min(...w);
    const maxW = Math.max(...w);
    const positions = sphericalPositions(keywords.length, 2.5);

    return keywords.map((k, i) => {
      const size = mapRange(k.weight, minW, maxW, 0.25, 1.0);
      const hue = mapRange(k.weight, minW, maxW, 220, 330); // blue to magenta
      const color = `hsl(${hue}, 80%, 60%)`;
      return { ...k, size, color, position: positions[i] };
    });
  }, [keywords]);

  // slow idle rotation
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15;
  });

  return (
    <group ref={group}>
      {items.map((it) => (
        <Text
          key={it.word}
          position={it.position}
          fontSize={it.size}
          color={it.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="black"
          onPointerOver={(e) => { e.object.scale.set(1.2, 1.2, 1.2); }}
          onPointerOut={(e) => { e.object.scale.set(1, 1, 1); }}
        >
          {it.word}
        </Text>
      ))}
    </group>
  );
}