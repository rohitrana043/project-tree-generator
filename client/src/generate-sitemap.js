const fs = require('fs');
const path = require('path');

// Configure your site URL here
const SITE_URL =
  process.env.REACT_APP_SITE_URL ||
  'https://project-tree-generator.netlify.app';

// Define your routes
const routes = [
  {
    path: '/',
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    path: '/generate-tree',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/generate-structure',
    priority: '0.8',
    changefreq: 'weekly',
  },
];

// Generate sitemap XML content
const generateSitemap = () => {
  const today = new Date().toISOString().split('T')[0];

  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  routes.forEach((route) => {
    sitemap += '  <url>\n';
    sitemap += `    <loc>${SITE_URL}${route.path}</loc>\n`;
    sitemap += `    <lastmod>${today}</lastmod>\n`;
    sitemap += `    <changefreq>${route.changefreq}</changefreq>\n`;
    sitemap += `    <priority>${route.priority}</priority>\n`;
    sitemap += '  </url>\n';
  });

  sitemap += '</urlset>';

  return sitemap;
};

// Write sitemap to file
const writeSitemap = () => {
  const sitemap = generateSitemap();
  const publicDir = path.resolve(__dirname, 'public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log('Sitemap generated successfully at public/sitemap.xml');
};

writeSitemap();
