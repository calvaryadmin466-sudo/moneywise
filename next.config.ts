import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_NHOST_SUBDOMAIN: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'wxtreqbjcljlcoobxoea',
    NEXT_PUBLIC_NHOST_REGION: process.env.NEXT_PUBLIC_NHOST_REGION || 'eu-central-1',
    NEXT_PUBLIC_NHOST_AUTH_URL: process.env.NEXT_PUBLIC_NHOST_AUTH_URL || 'https://wxtreqbjcljlcoobxoea.auth.eu-central-1.nhost.run/v1',
    NEXT_PUBLIC_NHOST_GRAPHQL_URL: process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL || 'https://wxtreqbjcljlcoobxoea.graphql.eu-central-1.nhost.run/v1',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
