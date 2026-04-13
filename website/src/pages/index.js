import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const features = [
  {
    title: 'Explore',
    description: 'Browse on an interactive map',
    link: '/docs/features/explore-map',
  },
  {
    title: 'Fetch',
    description: 'Download tiles to your machine',
    link: '/docs/features/fetch-tiles',
  },
  {
    title: 'Mosaic',
    description: 'Merge into unified rasters',
    link: '/docs/features/build-mosaics',
  },
  {
    title: 'Export',
    description: 'Package and share your project',
    link: '/docs/features/export-projects',
  },
];

const platforms = [
  {
    label: 'macOS (Apple Silicon)',
    url: 'https://github.com/noaa-ocs-hydrography/noaabathymetry-ui/releases/latest/download/noaabathymetry-macOS-ARM.zip',
  },
  {
    label: 'macOS (Intel)',
    url: 'https://github.com/noaa-ocs-hydrography/noaabathymetry-ui/releases/latest/download/noaabathymetry-macOS-Intel.zip',
  },
  {
    label: 'Windows',
    url: 'https://github.com/noaa-ocs-hydrography/noaabathymetry-ui/releases/latest/download/noaabathymetry.exe',
  },
];

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className="container">
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <img src={require('@site/static/img/NOAA-1.png').default} alt="NOAA" className={styles.heroLogo} />
            <p className={styles.heroLabel}>National Bathymetric Source</p>
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Feature({title, description, link, isLast}) {
  return (
    <>
      <Link className={styles.featureCard} to={link}>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </Link>
      {!isLast && <div className={styles.featureConnector}><div className={styles.connectorDot} /><div className={styles.connectorLine} /><div className={styles.connectorArrow} /></div>}
    </>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresGrid}>
          {features.map((props, idx) => (
            <Feature key={idx} isLast={idx === features.length - 1} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Downloads() {
  return (
    <section className={styles.downloads}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>Download</Heading>
        <p className={styles.sectionSubtitle}>
          No installation or Python environment required. Just download and run.
        </p>
        <div className={styles.downloadCards}>
          {platforms.map((p, idx) => (
            <a key={idx} className={styles.downloadCard} href={p.url}>
              <span className={styles.downloadLabel}>{p.label}</span>
              <span className={styles.downloadAction}>Download &darr;</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function DataSources() {
  return (
    <section className={styles.dataSources}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>Supported Data Sources</Heading>
        <p className={styles.sectionSubtitle}>
          Access multiple NBS data formats from a single interface.
        </p>
        <div className={styles.sourceGrid}>
          {[
            { name: 'BlueTopo', desc: 'GeoTIFF compilations of the best available public bathymetric data' },
            { name: 'Modeling', desc: 'GeoTIFF compilations of the best available public bathymetric data on a low water datum' },
            { name: 'BAG', desc: 'Bathymetric Attributed Grid files' },
            { name: 'S-102 v2.1', desc: 'IHO S-102 version 2.1' },
            { name: 'S-102 v2.2', desc: 'IHO S-102 version 2.2' },
            { name: 'S-102 v3.0', desc: 'IHO S-102 version 3.0' },
          ].map((s, idx) => (
            <div key={idx} className={styles.sourceItem}>
              <strong>{s.name}</strong>
              <span>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <Features />
        <DataSources />
        <Downloads />
      </main>
    </Layout>
  );
}
