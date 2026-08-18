import { z } from 'zod';

const schema = z.object({
  otp: z
    .string()
    .regex(/^[0-9]{6}$/g)
    .transform((value) => Number(value)),
});

export type IVerificationOtpDto = z.infer<typeof schema>;

export default schema;
