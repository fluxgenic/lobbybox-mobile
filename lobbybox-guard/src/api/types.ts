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
  propertyId?: string | null;
  tenantId?: string | null;
  collectedByUserId?: string | null;
  photoUrl?: string | null;
  remarks?: string | null;
  mobileNumber?: string | null;
  ocrText?: string | null;
  trackingNumber?: string | null;
  recipientName?: string | null;
  collectedAt?: string | null;
  createdAt?: string | null;
  propertyName?: string | null;
  tenantName?: string | null;
  logisticSource?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
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

export type ParcelReadRequest = {
  blobUrl: string;
};

export type ParcelReadResponse = {
  readUrl: string;
};

export type CreateParcelRequest = {
  propertyId: string;
  photoUrl?: string | null;
  remarks?: string | null;
  mobileNumber?: string | null;
  ocrText?: string | null;
  trackingNumber?: string | null;
  recipientName?: string | null;
  logisticSource?: string | null;
  collectedAt: string;
};

export type CreateParcelResponse = ParcelListItem;

export type ParcelOcrSuggestion = {
  trackingNumber?: string | null;
  customerName?: string | null;
  mobileNumber?: string | null;
  unit?: string | null;
  address?: string | null;
  ocrText?: string | null;
  logisticSource?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};
