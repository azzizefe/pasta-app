import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = {
  size?: number;
  color: string;
  strokeWidth?: number;
};

/** Shared stroke settings so every icon reads as one family. */
const stroke = {
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function PlusIcon({ size = 18, color, strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ size = 22, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M18 8.5c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 5.8-2 7-2 7h16s-2-1.2-2-7Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path
        d="M10.2 19.2a2.1 2.1 0 0 0 3.6 0"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
    </Svg>
  );
}

export function HomeIcon({ size = 22, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3.2 9.6 12 2.9l8.8 6.7V20a1.2 1.2 0 0 1-1.2 1.2H4.4A1.2 1.2 0 0 1 3.2 20V9.6Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path
        d="M9.4 21.2v-6.4h5.2v6.4"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
    </Svg>
  );
}

export function BookmarkIcon({ size = 22, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6.2 3.8h11.6a1 1 0 0 1 1 1v16.4l-6.8-3.9-6.8 3.9V4.8a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
    </Svg>
  );
}

export function UserIcon({ size = 22, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx={12}
        cy={8.2}
        r={3.7}
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path
        d="M4.6 20.6a7.6 7.6 0 0 1 14.8 0"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 20, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5.5 15.5 12 9 18.5" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 20, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 5.5 8.5 12 15 18.5" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

/** Four-point sparkle, used to mark the AI-assisted generate action. */
export function SparkleIcon({ size = 18, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.2c.6 3.5 1.9 6.1 3.7 7.9 1.8 1.8 4.4 3.1 7.9 3.7-3.5.6-6.1 1.9-7.9 3.7-1.8 1.8-3.1 4.4-3.7 7.9-.6-3.5-1.9-6.1-3.7-7.9C6.4 15.7 3.8 14.4.3 13.8c3.5-.6 6.1-1.9 7.9-3.7C10 8.3 11.4 5.7 12 2.2Z"
        fill={color}
      />
    </Svg>
  );
}

/** Shield with a checkmark, used for the privacy policy row. */
export function ShieldIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3.2 5.4 5.9V11c0 4.6 2.8 8.3 6.6 9.8 3.8-1.5 6.6-5.2 6.6-9.8V5.9L12 3.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path d="M9 12.1l2 2 4-4.4" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

/** Lined document, used for the terms of use row. */
export function DocumentIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7.2 3.6h6.4l4 4V19.6a1 1 0 0 1-1 1H7.2a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path d="M13.6 3.6v4h4" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M8.8 12.4h6.4M8.8 15.8h6.4M8.8 9h2.4" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

/** Door with an outward arrow, used on the sign-out action. */
export function LogOutIcon({ size = 19, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M13.6 4H6.8a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6.8"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path d="M10 12h10.2M16.8 8.4l3.6 3.6-3.6 3.6" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

/** Waste bin, used on the destructive delete-account action. */
export function TrashIcon({ size = 19, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 7h15" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path
        d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path
        d="M6.7 7l.9 12.4a1.5 1.5 0 0 0 1.5 1.4h5.8a1.5 1.5 0 0 0 1.5-1.4L17.3 7"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path d="M10.2 10.6v6.6M13.8 10.6v6.6" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

/** Pâtissier's toque, used on the wedding-cake call to action. */
export function ChefHatIcon({ size = 18, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6.6 15.6a4.3 4.3 0 0 1-1.3-8.4 3.9 3.9 0 0 1 6.7-2.5 3.9 3.9 0 0 1 6.7 2.5 4.3 4.3 0 0 1-1.3 8.4"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path
        d="M6.6 15.6h10.8v3a1 1 0 0 1-1 1H7.6a1 1 0 0 1-1-1v-3Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
    </Svg>
  );
}

/** Coins icon for credits and balance */
export function CoinsIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="8" cy="8" r="6" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M18.09 10.37A6 6 0 1 1 10.34 18" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M7 6h2M8 5v6M14 13h2M15 12v4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Simple checkmark icon */
export function CheckIcon({ size = 18, color, strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Lock icon for secure purchases */
export function LockIcon({ size = 18, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Circle cx="12" cy="16" r="1.5" fill={color} />
    </Svg>
  );
}

/** Credit card icon */
export function CreditCardIcon({ size = 18, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Path d="M3 10h18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M7 15h4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Chevron down icon */
export function ChevronDownIcon({ size = 18, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Apple logo icon */
export function AppleIcon({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 170 170" fill={color}>
      <Path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.96-14.42-7.23-11.19-12.91-23.75-17.06-37.67-4.14-13.92-6.22-27.05-6.22-39.38 0-14.13 3.42-26.06 10.26-35.79 6.84-9.73 15.48-14.71 25.93-14.94 4.58 0 9.87 1.25 15.87 3.76 6 2.5 9.86 3.81 11.58 3.92 1.96-.22 6.06-1.63 12.3-4.23 6.25-2.61 11.77-3.75 16.57-3.43 12.63.66 22.86 5.38 30.7 14.16-11.11 6.74-16.55 16.14-16.33 28.19.22 9.57 3.92 17.58 11.09 24.03 7.18 6.45 15.89 10.15 26.14 11.11-2.07 6.1-4.47 12.42-7.2 18.96zM119.22 33.72c0-7.39 2.67-14.46 8.01-21.21 5.34-6.75 11.97-11.21 19.89-13.37.22 1.3.33 2.5.33 3.6 0 7.29-2.78 14.36-8.33 21.21-5.55 6.85-12.3 11.26-20.25 13.22-.11-1.19-.16-2.35-.16-3.45z" />
    </Svg>
  );
}

export function HeartIcon({
  size = 20,
  color,
  filled = false,
  strokeWidth = 1.7,
}: Props & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path
        d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CopyIcon({ size = 18, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x="9"
        y="9"
        width="13"
        height="13"
        rx="2"
        ry="2"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function CalendarIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        ry="2"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ImageIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        ry="2"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
      <Path
        d="M21 15l-5-5L5 21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CameraIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function DownloadIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="m7 10 5 5 5-5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M12 15V3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Globe icon for internationalization & language settings */
export function GlobeIcon({ size = 19, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AlertCircleIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M12 7.6v5.2" stroke={color} strokeWidth={strokeWidth + 0.3} {...stroke} />
      <Circle cx="12" cy="16.3" r="1.05" fill={color} />
    </Svg>
  );
}

export function ClockIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M12 7.5V12l3 2" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

export function HelpCircleIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path
        d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.3-2.6 3.9"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
      <Circle cx="12" cy="16.9" r="1.05" fill={color} />
    </Svg>
  );
}

export function InfoIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M12 11.2v5.2" stroke={color} strokeWidth={strokeWidth + 0.3} {...stroke} />
      <Circle cx="12" cy="7.9" r="1.05" fill={color} />
    </Svg>
  );
}

export function MailIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="m4.2 7 7.8 6 7.8-6" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

export function StarIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...stroke}
      />
    </Svg>
  );
}

export function GiftIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="8" width="18" height="4" rx="1.5" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 4.8 0 0 1 12 8a4.8 4.8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

export function UsersIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}


export function LayersIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3 2 8l10 5 10-5-10-5Z" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="m2 13 10 5 10-5M2 17.5l10 5 10-5" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

/** Curved arrow pointing back, used for undo. */
export function UndoIcon({ size = 20, color, strokeWidth = 1.7 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 14 4 9l5-5" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}
