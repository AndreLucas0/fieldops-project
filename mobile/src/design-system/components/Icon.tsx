import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../tokens';

/**
 * Conjunto mínimo de ícones em traço, desenhado direto em SVG.
 * Evita uma fonte de ícones só para as telas públicas.
 */
export const ICON_PATHS = {
  clipboard: [
    'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
    'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z',
    'M8 12h8',
    'M8 16h5',
  ],
  checklist: ['m9 11 3 3 8-8', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10'],
  camera: [
    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z',
  ],
  offline: [
    'M12 20h.01',
    'M8.5 16.4a5 5 0 0 1 7 0',
    'M5 12.9a10 10 0 0 1 5.2-2.7',
    'M19 12.9a10 10 0 0 0-2-1.5',
    'M2 8.8a15 15 0 0 1 4.2-2.6',
    'M22 8.8a15 15 0 0 0-11.3-3.8',
    'm2 2 20 20',
  ],
} as const;

export type IconName = keyof typeof ICON_PATHS;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  testID?: string;
};

export function Icon({ name, size = 22, color = colors.primary, testID }: IconProps) {
  return (
    <Svg testID={testID} width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICON_PATHS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {name === 'camera' ? (
        <Circle cx={12} cy={13} r={3.4} stroke={color} strokeWidth={1.8} />
      ) : null}
    </Svg>
  );
}
