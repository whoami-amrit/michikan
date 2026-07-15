import { User } from 'db';

export interface IUserResponse extends Required<Pick<User, 'name' | 'id' | 'email' | 'createdAt'>> {
  plan: 'free' | 'pro';
  verified: boolean;
}
