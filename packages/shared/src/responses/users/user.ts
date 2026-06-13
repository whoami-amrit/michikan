import { Prisma } from 'db';

export interface IUserResponse extends Required<
  Pick<Prisma.UserModel, 'name' | 'id' | 'email' | 'createdAt' | 'avatar'>
> {
  plan: 'free' | 'pro';
  verified: boolean;
}
