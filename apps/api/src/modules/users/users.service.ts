import { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import { getEffectivePlan } from '@common/utils/plan';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'db';
import { IUserResponse } from 'shared';

import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById({ sub, verified }: IJwtAccessPayload): Promise<IUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: sub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      plan: getEffectivePlan(user),
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      autoAnalyseResume: user.autoAnalyseResume,
      verified,
    };
  }

  async updateUserById(id: number, data: Prisma.UserUpdateInput): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
