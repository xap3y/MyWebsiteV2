import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'call.xap3y.eu',
                port: '',
                pathname: '/v1/**',
                search: '',
            },
        ],
    },
};

export default nextConfig;
