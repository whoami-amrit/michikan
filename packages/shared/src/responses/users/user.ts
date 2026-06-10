import { Prisma } from '@michikan/db';

export interface IUserResponse extends Required<
  Pick<Prisma.UserModel, 'name' | 'id' | 'email' | 'createdAt'>
> {}
