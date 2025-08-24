export interface Config {
  API_URL: string;
  WS_URL: string;
  APP_NAME: string;
  VERSION: string;
  ENCRYPTION_ENABLED: boolean;
  DEBUG: boolean;
  SENTRY_DSN?: string;
  ANALYTICS_ID?: string;
}

const config: Config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000',
  APP_NAME: process.env.REACT_APP_APP_NAME || 'RemoteSync',
  VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  ENCRYPTION_ENABLED: process.env.REACT_APP_ENCRYPTION === 'true',
  DEBUG: process.env.NODE_ENV === 'development',
  SENTRY_DSN: process.env.REACT_APP_SENTRY_DSN,
  ANALYTICS_ID: process.env.REACT_APP_ANALYTICS_ID,
};

// Validate required environment variables
const requiredVars = ['API_URL', 'WS_URL'];
const missingVars = requiredVars.filter(varName => !config[varName as keyof Config]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export default config;