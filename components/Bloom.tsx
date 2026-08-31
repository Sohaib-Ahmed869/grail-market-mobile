import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { StyleSheet } from "react-native";

/** A soft warm glow behind the mark.
 *
 *  A circle filled with a LinearGradient was the obvious first try and it is
 *  wrong: the gradient runs top-to-bottom while the shape stays a hard-edged
 *  disc, so it reads as a grey plate laid on the navy. Light falls off in
 *  every direction at once, which is a radial gradient, and SVG is the only
 *  thing here that draws one. */
export function Bloom({ size, color, opacity = 0.22 }: { size: number; color: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill as any} pointerEvents="none">
      <Defs>
        <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.45" stopColor={color} stopOpacity={opacity * 0.42} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={size} height={size} fill="url(#bloom)" />
    </Svg>
  );
}
