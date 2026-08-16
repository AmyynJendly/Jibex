import Svg, { Path } from 'react-native-svg';

interface PackageCubeProps {
  size?: number;
}

/**
 * Static isometric parcel-box icon for the login logo — no animation, no
 * `perspective`/`rotateX`/`rotateY`. An earlier spinning-3D version of this
 * used those transforms and carried a known risk (they previously broke
 * native `GlassView`/`BlurView` backdrop sampling nearby on iOS); this is
 * deliberately just a flat, motionless illustration instead.
 */
export function PackageCube({ size = 88 }: PackageCubeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 88 88">
      {/* top face */}
      <Path d="M44 6 L80 24 L44 42 L8 24 Z" fill="#EAB464" />
      {/* left face */}
      <Path d="M8 24 L44 42 L44 82 L8 64 Z" fill="#A7754D" />
      {/* right face */}
      <Path d="M80 24 L44 42 L44 82 L80 64 Z" fill="#96683F" />
      {/* tape seams */}
      <Path d="M44 42 L44 82" stroke="#7E5731" strokeWidth={2} />
      <Path d="M44 6 L44 42" stroke="#DCCCBB" strokeWidth={2} opacity={0.6} />
    </Svg>
  );
}
