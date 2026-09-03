import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors } from "../theme";

/** A week, drawn as a filled area.
 *
 *  The first version was a bare 1.75pt stroke floating in the middle of the
 *  card. Six points of thin line with nothing under it and no baseline reads
 *  as a scribble, not a chart — there is no ground for the shape to sit on,
 *  so the eye cannot tell up from down at a glance.
 *
 *  So: a curve with a soft fill beneath it, anchored to the bottom of its own
 *  box. The fill is what gives the line a floor; the floor is what makes the
 *  direction legible at 56pt wide. Still no axes, no grid, no labels — the
 *  price and the percentage beside it carry the numbers, and this carries
 *  only the shape of the week. */
export function Spark({
  points, width = 62, height = 26, up,
}: {
  points: number[]; width?: number; height?: number; up: boolean;
}) {
  const tone = up ? colors.up : colors.down;
  if (!points || points.length < 2) {
    return <Svg width={width} height={height} />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const pad = 2;

  const xy = points.map((p, i) => ({
    x: i * step,
    y: height - pad - ((p - min) / span) * (height - pad * 2),
  }));

  // A Catmull-Rom-ish smoothing: each segment gets control points a third of
  // the way along, which rounds the corners without inventing peaks that are
  // not in the data.
  let line = `M${xy[0].x.toFixed(1)} ${xy[0].y.toFixed(1)}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const a = xy[i];
    const b = xy[i + 1];
    const cx = (a.x + b.x) / 2;
    line += ` C${cx.toFixed(1)} ${a.y.toFixed(1)}, ${cx.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const id = `spark-${up ? "up" : "down"}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={tone} stopOpacity={0.22} />
          <Stop offset="1" stopColor={tone} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${id})`} />
      <Path d={line} stroke={tone} strokeWidth={2} strokeLinecap="round"
        strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
