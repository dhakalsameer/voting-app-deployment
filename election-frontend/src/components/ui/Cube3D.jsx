export default function Cube3D({ x, y, size, color, opacity }) {
  const s = size || 4;
  const h = s * 0.866;
  const top = `0,${-s} ${h},${-s * 0.5} 0,0 ${-h},${-s * 0.5}`;
  const left = `${-h},${-s * 0.5} 0,0 0,${s} ${-h},${s * 0.5}`;
  const right = `0,0 ${h},${-s * 0.5} ${h},${s * 0.5} 0,${s}`;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points={top} fill={color} opacity={opacity * 0.25} />
      <polygon points={left} fill={color} opacity={opacity * 0.45} />
      <polygon points={right} fill={color} opacity={opacity * 0.65} />
    </g>
  );
}
