export type CakeKind = 'wedding' | 'birthday' | 'engagement' | 'custom' | 'diy';

export interface CakeDetails {
  tier?: number;
  shape?: string;
  flavor?: string;
  color?: string;
  decor?: string;
  customNotes?: string;
  referenceImageUri?: string;
  referenceImageBase64?: string;
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
}

export type SavedCakeFilter = 'all' | 'favorites' | CakeKind;
