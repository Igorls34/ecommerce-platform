import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

const SITE_URL = 'https://thessarasemijoias.com.br';

function xmlUrl(loc: string, changefreq: string, priority: string, lastmod?: string) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export const getSitemap = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { visible: true },
      select: { id: true, updatedAt: true },
      orderBy: { id: 'desc' },
    });

    const categories = await prisma.category.findMany({
      where: { visible: true },
      select: { id: true, name: true, updatedAt: true },
      orderBy: { id: 'asc' },
    });

type SitemapUrl = { loc: string; changefreq: string; priority: string; lastmod?: string };

    const staticPages: SitemapUrl[] = [
      { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
      { loc: `${SITE_URL}/produtos`, changefreq: 'daily', priority: '0.9' },
      { loc: `${SITE_URL}/sobre`, changefreq: 'monthly', priority: '0.7' },
      { loc: `${SITE_URL}/privacidade`, changefreq: 'yearly', priority: '0.4' },
      { loc: `${SITE_URL}/termos`, changefreq: 'yearly', priority: '0.4' },
    ];

    const productUrls: SitemapUrl[] = products.map((p) => ({
      loc: `${SITE_URL}/produtos/${p.id}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: p.updatedAt.toISOString().split('T')[0],
    }));

    const categoryUrls: SitemapUrl[] = categories.map((c) => ({
      loc: `${SITE_URL}/produtos?categoryId=${c.id}`,
      changefreq: 'weekly',
      priority: '0.7',
      lastmod: c.updatedAt.toISOString().split('T')[0],
    }));

    const allUrls = [...staticPages, ...categoryUrls, ...productUrls];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...allUrls.map((u) => xmlUrl(u.loc, u.changefreq, u.priority, u.lastmod)),
      '</urlset>',
    ].join('\n');

    res.type('application/xml');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('[sitemap] erro ao gerar:', error);
    return res.status(500).send('Erro ao gerar sitemap');
  }
};
