import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Region-only client construction, relying on the SDK's default credential
// provider chain (@aws-sdk/credential-provider-node) — no explicit access
// keys in code, matching the pattern already used by other AWS SDK clients
// in this app (lib/logging/alarms.ts, lib/services/authService.ts).
//
// Uses NEXT_PUBLIC_AWS_REGION (not AWS_REGION, which lib/logging/alarms.ts
// uses) because that's the region var actually set in amplify.yml and used
// by authService.ts for Cognito — the closer sibling for this app-config
// purpose than the monitoring/alarms code.
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
});

// Read the bucket name per-call, not into a module-level constant — keeps
// this testable (env vars can be changed between tests) without relying on
// jest.resetModules() gymnastics, and avoids capturing a stale value.
function getBucket(): string {
  const bucket = process.env.AWS_S3_EVENT_PHOTOS_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_EVENT_PHOTOS_BUCKET is not configured');
  }
  return bucket;
}

export async function uploadEventPhoto(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function deleteEventPhoto(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
}

export function getEventPhotoPublicUrl(key: string): string {
  const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
  return `https://${getBucket()}.s3.${region}.amazonaws.com/${key}`;
}

export function buildEventPhotoKey(eventId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  return `event-photos/${eventId}/${timestamp}-${sanitized}`;
}
