export type Role = 'SUPER_ADMIN' | 'PROPERTY_ADMIN' | 'GUARD';

export type User = {
  id: string;
  email: string;
  fullName?: string | null;
  role: Role;
  displayName?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};
