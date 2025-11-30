
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(request: VercelRequest, response: VercelResponse) {
  // Base configuration
  const baseUrl = 'https://resonoteai.vercel.app';
  const lastMod = new Date().toISOString();

  // Define your routes here. 
  // In a real-world dynamic app, you might fetch IDs from a database here.
  const routes = [
    { 
      path: '/', 
      changefreq: 'daily', 
      priority: '1.0' 
    },
    // Example of future expansion:
    // { path: '/about', changefreq: 'monthly', priority: '0.8' }
  ];

  // Construct the XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(route => `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  // Set headers for proper XML serving and caching
  // Cache for 1 hour (3600s), allow serving stale content while revalidating for 24 hours (86400s)
  response.setHeader('Content-Type', 'text/xml');
  response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  
  response.status(200).send(xml);
}
