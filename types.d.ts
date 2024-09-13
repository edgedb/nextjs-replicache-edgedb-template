declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_REPLICACHE_LICENSE_KEY: string;
      NODE_ENV: 'development' | 'production';
    }
  }
}

export { }