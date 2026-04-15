/** @type {import('next').NextConfig } */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
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
        hostname: 'pubchem.ncbi.nlm.nih.gov',
        pathname: '/image/**',
      },
    ],
  },
}
export default nextConfig