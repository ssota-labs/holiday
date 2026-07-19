/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // after() is used by the fax webhook for best-effort processing without
    // delaying the SOLAPI 5s ack.
  },
};

export default nextConfig;
