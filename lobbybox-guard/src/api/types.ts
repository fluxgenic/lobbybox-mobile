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
