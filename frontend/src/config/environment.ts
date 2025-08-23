export const config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000',
  APP_NAME: process.env.REACT_APP_APP_NAME || 'RemoteSync',
  VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  ENCRYPTION_ENABLED: process.env.REACT_APP_ENCRYPTION === 'true',
  DEBUG: process.env.NODE_ENV === 'development',
  SENTRY_DSN: process.env.REACT_APP_SENTRY_DSN,
  ANALYTICS_ID: process.env.REACT_APP_ANALYTICS_ID,
};

export default config;