import type { PhotoVariant } from './types';

/**
 * Build the public URL for a photo variant in R2.
 *
 * Pattern: {baseUrl}/{collection}/{gallery}/{variant}/{filename}.webp
 */
export function getPhotoUrl(
  baseUrl: string,
  collection: string,
  gallery: string,
  file: string,
  variant: PhotoVariant = 'medium',
): string {
  const baseName = file.replace(/\.[^.]+$/, '');
  return `${baseUrl}/${collection}/${gallery}/${variant}/${baseName}.webp`;
}

/**
 * Generate a srcset string for responsive images.
 * Returns thumb (400w), medium (1200w), and full (2400w) variants.
 */
export function getSrcSet(
  baseUrl: string,
  collection: string,
  gallery: string,
  file: string,
): string {
  const variants: { variant: PhotoVariant; width: number }[] = [
    { variant: 'thumb', width: 400 },
    { variant: 'medium', width: 1200 },
    { variant: 'full', width: 2400 },
  ];

  return variants
    .map(({ variant, width }) => {
      const url = getPhotoUrl(baseUrl, collection, gallery, file, variant);
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Get a placeholder data URL for blur-up loading.
 * Returns a tiny inline SVG with the dark theme background color.
 */
export function getPlaceholder(): string {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23161616" width="400" height="300"/%3E%3C/svg%3E';
}
