export interface AppConfig {
  databaseUrl: string;
  appUrl: string;
}

let config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!config) {
    config = {
      databaseUrl: process.env.DATABASE_URL || './data/starting-six.db',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    };
  }
  return config;
}