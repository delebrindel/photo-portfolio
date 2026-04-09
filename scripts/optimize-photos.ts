import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// --- Configuration ---
interface Variant {
  name: string;
  width: number;
}

const VARIANTS: Variant[] = [
  { name: 'thumb', width: 400 },
  { name: 'medium', width: 1200 },
  { name: 'full', width: 2400 },
];

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.tiff', '.webp'];

// --- S3 Client for R2 ---
function createR2Client(): S3Client {
  const endpoint = process.env['R2_ENDPOINT'];
  const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error('Missing R2 credentials in .env (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
    process.exit(1);
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// --- CLI Args ---
function parseArgs(): {
  collection: string;
  gallery: string;
  input: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      flags[key] = value;
      if (value !== 'true') i++;
    }
  }

  if (!flags['collection'] || !flags['gallery'] || !flags['input']) {
    console.error(`
Usage:
  npm run photos:optimize -- --collection <slug> --gallery <slug> --input <dir>

Options:
  --collection   Target collection slug (e.g., dance)
  --gallery      Target gallery slug (e.g., ballet-noir)
  --input        Source directory with original photos
  --dry-run      Show what would be uploaded without uploading
`);
    process.exit(1);
  }

  return {
    collection: flags['collection'],
    gallery: flags['gallery'],
    input: flags['input'],
    dryRun: flags['dry-run'] === 'true',
  };
}

// --- Processing ---
async function processImage(
  inputPath: string,
  variant: Variant,
): Promise<Buffer> {
  const buffer = await sharp(inputPath)
    .resize({ width: variant.width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  return buffer;
}

async function uploadToR2(
  client: S3Client,
  bucket: string,
  key: string,
  buffer: Buffer,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
    }),
  );
}

// --- Main ---
async function main() {
  const { collection, gallery, input, dryRun } = parseArgs();
  const inputDir = path.resolve(input);

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(inputDir)
    .filter((f) => SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.error(`No supported images found in ${inputDir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} images in ${inputDir}`);
  console.log(`Target: ${collection}/${gallery}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const bucket = process.env['R2_BUCKET_NAME'] || 'photos';
  const client = dryRun ? (null as unknown as S3Client) : createR2Client();

  const processedFiles: string[] = [];

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const baseName = file.replace(/\.[^.]+$/, '');

    console.log(`Processing: ${file}`);

    for (const variant of VARIANTS) {
      const r2Key = `${collection}/${gallery}/${variant.name}/${baseName}.webp`;

      if (dryRun) {
        console.log(`  [DRY RUN] Would upload → ${r2Key}`);
      } else {
        const buffer = await processImage(inputPath, variant);
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

        await uploadToR2(client, bucket, r2Key, buffer);

        console.log(`  ✓ ${variant.name} (${variant.width}px) → ${r2Key} [${sizeMB} MB]`);
      }
    }

    processedFiles.push(file);
  }

  console.log(`\n--- Done! Processed ${processedFiles.length} images ---`);
  console.log('\nAdd these to your gallery.yaml:');
  console.log('photos:');
  processedFiles.forEach((f) => {
    console.log(`  - file: "${f}"`);
  });
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
