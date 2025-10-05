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
  property?: PropertySummary | null;
};

export type DailyParcelMetric = {
  date: string;
  count: number;
  propertyId?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};
