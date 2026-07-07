import { z } from 'zod';

import { nameSchema, zodSafeString } from '../../common.zod';
import {
  preferredWorkSettingSchema,
  salaryExpectationSchema,
  yearsOfExperienceSchema,
} from './common';

const schema = z.object({
  name: zodSafeString.pipe(nameSchema.optional()),
  email: z.never('Email cannot be updated'),
  yearsOfExperience: zodSafeString.pipe(yearsOfExperienceSchema.optional()),
  preferredWorkSetting: preferredWorkSettingSchema.optional(),
  salaryExpectation: zodSafeString.pipe(salaryExpectationSchema.optional()),
});

export type IUpdateUserDto = z.infer<typeof schema>;

export default schema;
