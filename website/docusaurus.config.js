import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'NOAA Bathymetry UI',
  tagline: 'Browser-based interface for NOAA bathymetric data',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://pgeleg.github.io',
  baseUrl: '/noaabathymetry-browser/',

  organizationName: 'pgeleg',
  projectName: 'noaabathymetry-browser',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'NOAA Bathymetry UI',
        logo: {
          alt: 'NOAA Logo',
          src: 'img/NOAA-2.png',
        },
        items: [
          {
            href: 'https://github.com/noaa-ocs-hydrography/noaabathymetry-ui',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `CC0-1.0 — National Oceanic and Atmospheric Administration`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
