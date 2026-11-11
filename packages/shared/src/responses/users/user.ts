import { Plan, User } from 'db';

export interface IUserResponse extends Required<Pick<User, 'name' | 'id' | 'email' | 'createdAt'>> {
  plan: Plan;
  planExpiresAt: string | null;
  verified: boolean;
}
