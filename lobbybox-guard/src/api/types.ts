export type Role = 'GUARD' | 'ADMIN' | 'MANAGER' | 'RESIDENT' | string;

export type PropertyAssignment = {
  propertyId: string;
  propertyName: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  propertyAssignment?: PropertyAssignment | null;
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
  photoUrl: string;
  remarks?: string | null;
  recipientName?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
};

export type ParcelSasRequest = {
  ext: 'jpg' | string;
};

export type ParcelSasResponse = {
  uploadUrl: string;
  blobUrl: string;
};

export type CreateParcelPayload = {
  propertyId: string;
  photoUrl: string;
  remarks?: string;
};

export type ParcelQueryParams = {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
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
