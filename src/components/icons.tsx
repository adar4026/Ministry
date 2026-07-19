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

export function ClockIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Path d="M12 7v5l3.5 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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

export function PencilIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20l1-4.8L15.6 4.6a1.5 1.5 0 0 1 2.1 0l1.7 1.7a1.5 1.5 0 0 1 0 2.1L9 19l-5 1Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={13.5} y1={6.7} x2={17.3} y2={10.5} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ListIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={4.5} cy={6} r={1.3} fill={color} />
      <Circle cx={4.5} cy={12} r={1.3} fill={color} />
      <Circle cx={4.5} cy={18} r={1.3} fill={color} />
      <Line x1={9} y1={6} x2={20} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={9} y1={12} x2={20} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={9} y1={18} x2={20} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
