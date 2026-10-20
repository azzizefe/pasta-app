/**
 * Design tokens for the app. Keeping every colour and metric in one place
 * makes it easy to restyle the whole experience later on.
 */
export const colors = {
  // Backdrop
  backdropTop: '#C08880',
  backdropMid: '#D9A199',
  blushTop: '#F2C9C2',
  blushMid: '#F8DCD6',
  cream: '#FBF2E9',
  creamDeep: '#F6E7DA',

  // Typography
  ink: '#2A1A15',
  inkSoft: '#6B4F47',
  inkMuted: '#8A6C63',

  // Surfaces
  surface: '#FFFFFF',
  divider: 'rgba(42, 26, 21, 0.08)',
} as const;

/** Warm ivory palette used by the signed-in experience. */
export const home = {
  bg: '#FDFAF3',
  washTop: '#FEFCF9',
  washMid: '#FAF1DD',
  washEnd: '#FDFAF3',
  ink: '#3B2416',
  gold: '#8A5A1C',
  muted: '#A98F68',
  body: '#7C6B57',
  card: '#FBF6EA',
  cardBorder: '#EFE5D3',
  cta: '#3B2416',
  ctaLabel: '#FFFFFF',

  // Wedding-cake feature card
  cardGradFrom: '#FFFDF9',
  cardGradTo: '#F8ECD6',
  cardBorderRich: '#EFE0C6',
  ctaFrom: '#4A2C18',
  ctaTo: '#2E1A0D',
  accentGold: '#F3D9A6',
  glow: '#F6D9A8',
  tabBar: '#FCF8F0',
  tabBorder: '#F0E7D7',
  tabInactive: '#B3A086',
  avatarBg: '#F3DCD4',

  // Profile
  divider: 'rgba(59, 36, 22, 0.08)',
  danger: '#B5433A',
  dangerBg: 'rgba(181, 67, 58, 0.06)',
  dangerBorder: 'rgba(181, 67, 58, 0.28)',
} as const;

export const fonts = {
  display: 'PlayfairDisplay_700Bold',
  displayMedium: 'PlayfairDisplay_500Medium',
} as const;

export const radii = {
  pill: 32,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
