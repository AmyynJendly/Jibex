import Svg, { Rect } from 'react-native-svg';

interface BarcodeProps {
  /** Deterministic seed (e.g. a tracking id) — same seed always renders the same bars. */
  seed: string;
  color: string;
  width?: number;
  height?: number;
}

/** Purely decorative barcode, deterministically generated from a seed string. */
export function Barcode({ seed, color, width = 240, height = 40 }: BarcodeProps) {
  const bars = Array.from(seed).map((ch) => (ch.charCodeAt(0) % 3) + 1);
  const gap = 2;
  const totalUnits = bars.reduce((sum, w) => sum + w + gap, 0);
  const scale = width / totalUnits;
  let x = 0;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars.map((w, i) => {
        const barWidth = w * scale;
        const bar = <Rect key={i} x={x} y={0} width={barWidth} height={height} fill={color} />;
        x += (w + gap) * scale;
        return bar;
      })}
    </Svg>
  );
}
