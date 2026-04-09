import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import type { SiteConfig, Collection, Gallery } from './types';

const CONTENT_DIR = path.resolve(process.cwd(), 'content');

function readYaml<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parse(raw) as T;
}

/**
 * Load the site-level configuration from content/site.yaml.
 */
export function getSiteConfig(): SiteConfig {
  return readYaml<SiteConfig>(path.join(CONTENT_DIR, 'site.yaml'));
}

/**
 * Load all collections with their galleries populated.
 * Sorted by the `order` field.
 */
export function getCollections(): Collection[] {
  const collectionsDir = path.join(CONTENT_DIR, 'collections');
  const collectionSlugs = fs
    .readdirSync(collectionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const collections: Collection[] = collectionSlugs.map((slug) => {
    const collectionPath = path.join(collectionsDir, slug);
    const meta = readYaml<Omit<Collection, 'galleries'>>(
      path.join(collectionPath, 'collection.yaml'),
    );

    const galleries = getGalleries(slug);

    return {
      ...meta,
      slug,
      galleries,
    };
  });

  return collections.sort((a, b) => a.order - b.order);
}

/**
 * Load all galleries for a given collection slug.
 * Sorted by the `order` field.
 */
export function getGalleries(collectionSlug: string): Gallery[] {
  const collectionDir = path.join(CONTENT_DIR, 'collections', collectionSlug);
  const gallerySlugs = fs
    .readdirSync(collectionDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const galleries: Gallery[] = gallerySlugs.map((slug) => {
    const galleryPath = path.join(collectionDir, slug, 'gallery.yaml');
    const meta = readYaml<Omit<Gallery, 'collectionSlug'>>(galleryPath);
    return {
      ...meta,
      slug,
      collectionSlug,
    };
  });

  return galleries.sort((a, b) => a.order - b.order);
}

/**
 * Load a single gallery by collection and gallery slug.
 */
export function getGallery(
  collectionSlug: string,
  gallerySlug: string,
): Gallery {
  const galleryPath = path.join(
    CONTENT_DIR,
    'collections',
    collectionSlug,
    gallerySlug,
    'gallery.yaml',
  );
  const meta = readYaml<Omit<Gallery, 'collectionSlug'>>(galleryPath);
  return {
    ...meta,
    slug: gallerySlug,
    collectionSlug,
  };
}

/**
 * Find a collection by slug.
 */
export function getCollection(slug: string): Collection {
  const collectionPath = path.join(CONTENT_DIR, 'collections', slug);
  const meta = readYaml<Omit<Collection, 'galleries'>>(
    path.join(collectionPath, 'collection.yaml'),
  );
  const galleries = getGalleries(slug);
  return { ...meta, slug, galleries };
}
