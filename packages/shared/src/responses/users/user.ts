import { User } from 'db';

export interface IUserResponse extends Required<
  Pick<User, 'name' | 'id' | 'email' | 'createdAt' | 'avatar'>
> {
  plan: 'free' | 'pro';
  verified: boolean;
}
