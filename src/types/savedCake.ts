export type CakeKind = 'wedding' | 'birthday' | 'engagement' | 'custom' | 'diy';

export type ImageQuality = 'standard' | '4k';

export type BudgetTier = 'under_minimum' | 'economic' | 'standard' | 'luxury';

export interface CakeDetails {
  guests?: number;
  tier?: number;
  budget?: number;
  currency?: string;
  budgetTier?: BudgetTier;
  portionWeightGr?: number;
  shape?: string;
  flavor?: string;
  coating?: string;
  color?: string;
  decor?: string;
  writing?: string;
  fillingTags?: string[];
  textureTags?: string[];
  finishTags?: string[];
  metallicTags?: string[];
  dripTags?: string[];
  themeTags?: string[];
  decorTags?: string[];
  backgroundTags?: string[];
  dietTags?: string[];
  customNotes?: string;
  referenceImageUri?: string;
  referenceImageBase64?: string;
  quality?: ImageQuality;
  templateTitle?: string;
  /** Gemini 3.1 Flash Lite tarafından üretilen ev yapımı pasta tarifi (Kendi Pastanı Oluştur için) */
  recipe?: string;
}

export interface SavedCake {
  id: string;
  createdAt: number;
  title: string;
  kind: CakeKind;
  imageUri: string;
  prompt: string;
  details?: CakeDetails;
  isFavorite?: boolean;
  /** When the cake was last liked; liked cakes are listed newest-liked first. */
  likedAt?: number;
  /** Gemini 3.1 Flash Lite tarafından üretilen ev yapımı pasta tarifi */
  recipe?: string;
}

export type SavedCakeFilter = 'all' | 'favorites' | CakeKind;
