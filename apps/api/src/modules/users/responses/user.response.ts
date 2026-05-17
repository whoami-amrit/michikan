import { Prisma } from '@db/client';

export interface IUserResponse extends Required<
  Pick<Prisma.UserModel, 'name' | 'id' | 'email' | 'createdAt'>
> {}
