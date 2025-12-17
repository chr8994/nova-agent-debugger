/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@newhomestar/chat-ui'],
  
  // Rewrite /icons/* requests to the API proxy
  // This allows the chat-ui to request agent icons using relative paths
  async rewrites() {
    return [
      {
        source: '/icons/:path*',
        destination: '/api/icons/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
