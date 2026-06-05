import { ALLOW_UNVERIFIED_TAG } from '@common/constants';
import { SetMetadata } from '@nestjs/common';

/**
 * This decorator is used to mark routes that can be accessed by users who have not verified their email addresses.
 * It is typically used in conjunction with an authentication guard that checks for email verification status.
 * @returns void
 */
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_TAG, true);
