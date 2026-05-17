import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  s3Region: z.string(),
  bucket: z.string(),
});

export interface IAWSConfig extends z.infer<typeof schema> {}

export default registerAs('aws', () => {
  return schema.parse({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Region: process.env.AWS_S3_REGION,
    bucket: process.env.AWS_S3_BUCKET,
  });
});
