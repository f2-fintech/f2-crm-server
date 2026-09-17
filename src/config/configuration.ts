export default () => ({
  app: {
    name: process.env.APP_NAME || 'CRM Server',
    port: Number(process.env.PORT) || 5000,
    env: process.env.NODE_ENV || 'development',
  },

  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/crm',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'f2crm_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});