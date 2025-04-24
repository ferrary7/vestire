/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['replicate.delivery', 'lh3.googleusercontent.com'], // Allow images from Replicate API and Google Auth
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // Increase API response timeout for AI processing
  experimental: {
    // Remove serverComponentsExternalPackages from here
  },
  // Properly configure external packages according to Next.js update
  serverExternalPackages: ['@anthropic-ai/sdk'],
  // Configure webpack for @imgly/background-removal WASM support
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // Make sure Next.js correctly handles WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
};

export default nextConfig;
