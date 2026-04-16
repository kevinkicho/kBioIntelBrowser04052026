/** @type {import('next').NextConfig } */
const nextConfig = {
  env: {
    OLLAMA_HOST: process.env.OLLAMA_HOST,
  },
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pubchem.ncbi.nlm.nih.gov',
      },
      {
        protocol: 'https',
        hostname: 'reactome.org',
      },
      {
        protocol: 'https',
        hostname: 'www.wikipathways.org',
      },
      {
        protocol: 'https',
        hostname: 'alphafold.ebi.ac.uk',
      },
      {
        protocol: 'https',
        hostname: 'www.ebi.ac.uk',
      },
      {
        protocol: 'https',
        hostname: 'string-db.org',
      },
      {
        protocol: 'https',
        hostname: 'stitch.embl.de',
      },
      {
        protocol: 'https',
        hostname: 'www.ncbi.nlm.nih.gov',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'files.rcsb.org',
      },
    ],
  },
}
export default nextConfig