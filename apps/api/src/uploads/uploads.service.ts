import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const accountId = process.env['R2_ACCOUNT_ID'];
    const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
    const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
    this.bucket = process.env['R2_BUCKET'] ?? 'tara-dev';
    this.publicUrl = process.env['R2_PUBLIC_URL'] ?? '';

    if (accountId && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.client = null;
      this.logger.warn({ event: 'uploads.disabled', reason: 'R2 credentials not set' });
    }
  }

  async presignUpload(params: {
    key: string;
    contentType: string;
    contentLength: number;
  }): Promise<{ uploadUrl: string; publicUrl: string }> {
    if (!this.client) {
      throw new ServiceUnavailableException('Image uploads are not configured');
    }

    if (!ALLOWED_TYPES.includes(params.contentType)) {
      throw new Error(`Unsupported image type: ${params.contentType}`);
    }
    if (params.contentLength > MAX_BYTES) {
      throw new Error('Image must be under 10 MB');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });
    const publicUrl = `${this.publicUrl}/${params.key}`;

    return { uploadUrl, publicUrl };
  }
}
