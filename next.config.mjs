/** @type {import('next').NextConfig } */
const nextConfig = {
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