import { SKIP_AUTH_TAG } from '@common/constants';
import { SetMetadata } from '@nestjs/common';

export const SkipAuth = () => SetMetadata(SKIP_AUTH_TAG, true);
