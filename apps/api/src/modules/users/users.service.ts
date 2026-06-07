import { Prisma, User } from '@michikan/db';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(userId: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async updateUserById(id: number, data: Prisma.UserUpdateInput): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
