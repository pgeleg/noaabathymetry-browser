import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const features = [
  {
    title: 'Explore',
    icon: '🗺',
    description:
      'Browse NBS data on an interactive map. Switch between BlueTopo, Modeling, BAG, and S-102 sources. Toggle the NBS Source layer to view tile metadata and coverage.',
    link: '/docs/features/explore-map',
  },
  {
    title: 'Fetch',
    icon: '📥',
    description:
      'Draw your area of interest or import geometry, then download tiles directly from the NBS S3 bucket to a local project folder. Filter by resolution and track progress in real time.',
    link: '/docs/features/fetch-tiles',
  },
  {
    title: 'Mosaic',
    icon: '🧩',
    description:
      'Merge downloaded tiles into per-UTM-zone VRT mosaics. Generate hillshade overlays, control resolution, and parallelize across zones.',
    link: '/docs/features/build-mosaics',
  },
  {
    title: 'Export',
    icon: '📦',
    description:
      'Verify data integrity and package your project into a portable ZIP. Recipients can simply use the files or even continue the project where you left off.',
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
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            <div className={styles.heroButtons}>
              <Link className="button button--primary button--lg" to="/docs/getting-started">
                Get Started
              </Link>
              <Link className="button button--outline button--lg" to="/docs/installation">
                Download
              </Link>
            </div>
          </div>
          <div className={styles.heroImage}>
            <img src={require('@site/static/img/noaabathymetry_ui.png').default} alt="NOAA Bathymetry UI screenshot" />
          </div>
        </div>
      </div>
    </header>
  );
}

function Feature({title, icon, description, link}) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
      <p className={styles.featureDescription}>{description}</p>
      <Link className={styles.featureLink} to={link}>
        Learn more &rarr;
      </Link>
    </div>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>Features</Heading>
        <p className={styles.sectionSubtitle}>
          Everything you need to work with NBS bathymetric data.
        </p>
        <div className={styles.featuresGrid}>
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
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
