export type Role = 'SUPER_ADMIN' | 'PROPERTY_ADMIN' | 'GUARD';

export type PropertySummary = {
  id: string;
  name: string;
  code?: string | null;
};

export type User = {
  id: string;
  email: string;
  fullName?: string | null;
  role: Role;
  displayName?: string | null;
  tenantId?: string | null;
  propertyName?: string | null;
  propertyCode?: string | null;
  property?: PropertySummary | null;
};

export type DailyParcelMetric = {
  date: string;
  count: number;
  propertyId?: string | null;
};

export type ParcelListItem = {
  id: string;
  photoUrl: string;
  remarks?: string | null;
  mobileNumber?: string | null;
  ocrText?: string | null;
  trackingNumber?: string | null;
  recipientName?: string | null;
  collectedAt?: string | null;
  createdAt?: string | null;
};

export type ParcelUploadRequest = {
  ext: 'jpg';
};

export type ParcelUploadResponse = {
  uploadUrl: string;
  blobUrl: string;
  readUrl:string;
  blobName:string,
};

export type CreateParcelRequest = {
  propertyId: string;
  photoUrl: string;
  remarks?: string | null;
  mobileNumber?: string | null;
  ocrText?: string | null;
  trackingNumber?: string | null;
  recipientName?: string | null;
  collectedAt: string;
};

export type CreateParcelResponse = ParcelListItem;

export type ParcelOcrSuggestion = {
  trackingNumber?: string | null;
  recipientName?: string | null;
  mobileNumber?: string | null;
  ocrText?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};
