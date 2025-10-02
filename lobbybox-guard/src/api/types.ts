export type Role = 'SUPER_ADMIN' | 'PROPERTY_ADMIN' | 'GUARD';

export type Property = {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PropertyAssignment = {
  propertyId: string;
  propertyName: string;
};

export type User = {
  id: string;
  email: string;
  fullName?: string | null;
  role: Role;
  isActive?: boolean;
  lastLoginAt?: string | null;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  propertyName?: string | null;
  properties?: string[];
};

export type GuardProfile = User;

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type Parcel = {
  id: string;
  propertyId: string;
  propertyName?: string | null;
  collectedByUserId?: string | null;
  collectedAt?: string | null;
  photoUrl: string;
  remarks?: string | null;
  recipientName?: string | null;
  trackingNumber?: string | null;
  mobileNumber?: string | null;
  ocrText?: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type ParcelSasRequest = {
  ext?: string;
};

export type ParcelSasResponse = {
  uploadUrl: string;
  blobUrl: string;
};

export type CreateParcelPayload = {
  propertyId: string;
  photoUrl: string;
  remarks?: string;
  recipientName?: string;
  trackingNumber?: string;
  mobileNumber?: string;
  collectedAt?: string;
  ocrText?: string;
};

export type ParcelQueryParams = {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  date?: string;
  q?: string;
  propertyId?: string;
};

export type PaginatedParcelsResponse = {
  items: Parcel[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};
