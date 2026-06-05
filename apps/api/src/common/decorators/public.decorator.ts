import { PUBLIC_ACCESS_TAG } from '@common/constants';
import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata(PUBLIC_ACCESS_TAG, true);
