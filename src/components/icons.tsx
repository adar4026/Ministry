import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

export type IconProps = { size?: number; color: string };

// Minimal 24x24 stroke-based line icons (no external icon library).

export function HomeIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11l9-8 9 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v10h14V10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 20v-6h6v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChartIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={6} y1={20} x2={6} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={12} y1={20} x2={12} y2={8} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={18} y1={20} x2={18} y2={4} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CalendarIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={2} stroke={color} strokeWidth={2} />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} strokeWidth={2} />
      <Line x1={8} y1={3} x2={8} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={16} y1={3} x2={16} y2={7} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MicIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={2} width={6} height={12} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M5 10a7 7 0 0 0 14 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={12} y1={19} x2={12} y2={22} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={8} y1={22} x2={16} y2={22} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function PersonIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
      <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 26, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={5} x2={12} y2={19} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
