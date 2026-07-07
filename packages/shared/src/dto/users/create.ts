import { z } from 'zod';

import { emailSchema, nameSchema } from '../../common.zod';
import {
  preferredWorkSettingSchema,
  salaryExpectationSchema,
  yearsOfExperienceSchema,
} from './common';

const schema = z.object({
  name: nameSchema,
  email: emailSchema,
  yearsOfExperience: yearsOfExperienceSchema,
  preferredWorkSetting: preferredWorkSettingSchema,
  salaryExpectation: salaryExpectationSchema,
});

export type ICreateUserDto = z.infer<typeof schema>;

export { schema as CreateUserDto };
