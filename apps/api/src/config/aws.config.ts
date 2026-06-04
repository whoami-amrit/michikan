import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const schema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  s3Region: z.string(),
  sesRegion: z.string(),
  sesConfigurationSet: z.string(),
  bucket: z.string(),
});

export interface IAWSConfig extends z.infer<typeof schema> {}

export default registerAs('aws', () => {
  return schema.parse({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Region: process.env.AWS_S3_REGION,
    sesRegion: process.env.AWS_SES_REGION,
    sesConfigurationSet: process.env.AWS_SES_CONFIGURATION_SET,
    bucket: process.env.AWS_S3_BUCKET,
  });
});
