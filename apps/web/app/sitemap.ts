import type { MetadataRoute } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

type Property = { slug: string; updatedAt?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let properties: Property[] = [];
  try {
    const res = await fetch(`${API_URL}/properties`, { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as { data: Property[] };
      properties = json.data;
    }
  } catch {
    // return static pages only
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${WEB_URL}/en`, changeFrequency: 'daily', priority: 1 },
    { url: `${WEB_URL}/tl`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${WEB_URL}/en/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${WEB_URL}/en/privacy`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const propertyPages: MetadataRoute.Sitemap = properties.flatMap((p) => [
    {
      url: `${WEB_URL}/en/properties/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${WEB_URL}/tl/properties/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ]);

  return [...staticPages, ...propertyPages];
}
