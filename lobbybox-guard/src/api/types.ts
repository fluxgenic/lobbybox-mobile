export type Role = 'GUARD' | 'ADMIN' | 'MANAGER' | 'RESIDENT' | string;

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

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
