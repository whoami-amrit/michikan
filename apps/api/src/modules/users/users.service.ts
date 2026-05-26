import { Prisma, User } from '@db/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(userIdFromToken: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userIdFromToken },
    });
  }

  create(data: Prisma.UserCreateInput, txClient?: Prisma.TransactionClient): Promise<User> {
    return (txClient ?? this.prisma).user.create({
      data,
    });
  }

  async updateUserById(id: number, data: Prisma.UserUpdateInput): Promise<void> {
    // todo: proper error handling
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
