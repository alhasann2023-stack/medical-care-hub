import serverless from 'serverless-http';
import { createApiApp } from '../../server';

// Initialize the Express application instance with all API routes, authentication, and services
const app = createApiApp();

// Export the Netlify Serverless Function handler
export const handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream', 'multipart/form-data']
});
