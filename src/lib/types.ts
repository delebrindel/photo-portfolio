export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  siteUrl: string;
  photosBaseUrl: string;
  about: {
    bio: string;
    contact: string;
  };
  social: SocialLink[];
  featuredPhoto: {
    collection: string;
    gallery: string;
    file: string;
  };
}

export interface SocialLink {
  platform: string;
  url: string;
  label: string;
}

export interface Collection {
  title: string;
  slug: string;
  description: string;
  cover: string;
  order: number;
  galleries: Gallery[];
}

export interface Gallery {
  title: string;
  slug: string;
  description: string;
  cover: string;
  order: number;
  photos: Photo[];
  /** Parent collection slug — populated by content loader */
  collectionSlug: string;
}

export interface Photo {
  file: string;
  caption?: string;
}

export type PhotoVariant = 'thumb' | 'medium' | 'full';
