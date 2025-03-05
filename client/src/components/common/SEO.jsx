import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  ogImage = '/logo192.png', // Default image path
  twitterCard = 'summary_large_image',
}) => {
  // Base title with brand name
  const fullTitle = title
    ? `${title} | Project Tree Generator`
    : 'Project Tree Generator - Generate Project Structures Easily';

  // Default description if none provided
  const metaDescription =
    description ||
    'Generate project tree structures from GitHub repositories or build empty project structures from tree files. A simple tool for developers and project managers.';

  // Default keywords if none provided
  const metaKeywords =
    keywords ||
    'project tree, directory structure, folder structure, project structure, github, code visualization';

  // Site URL from env or default
  const siteUrl =
    process.env.REACT_APP_SITE_URL ||
    'https://project-tree-generator.netlify.app/';

  // Canonical URL
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : siteUrl;

  // Full image URL
  const imageUrl = `${siteUrl}${ogImage}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Project Tree Generator" />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={imageUrl} />

      {/* Additional SEO meta tags */}
      <meta name="robots" content="index, follow" />
      <html lang="en" />
    </Helmet>
  );
};

export default SEO;
