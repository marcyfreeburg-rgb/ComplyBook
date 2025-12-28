import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Normalize and validate Plaid environment
const plaidEnv = (process.env.PLAID_ENV || 'sandbox').trim().toLowerCase();
const validEnvs = ['production', 'development', 'sandbox'];

if (!validEnvs.includes(plaidEnv)) {
  console.error(`[Plaid] Invalid PLAID_ENV "${process.env.PLAID_ENV}". Must be one of: ${validEnvs.join(', ')}`);
}

const plaidBasePath = plaidEnv === 'production' 
  ? PlaidEnvironments.production 
  : plaidEnv === 'development'
  ? PlaidEnvironments.development
  : PlaidEnvironments.sandbox;

// Log Plaid configuration at startup
console.log(`[Plaid] Initializing with environment: ${plaidEnv}`);
console.log(`[Plaid] Base path: ${plaidBasePath}`);
console.log(`[Plaid] Client ID configured: ${!!process.env.PLAID_CLIENT_ID}`);
console.log(`[Plaid] Secret configured: ${!!process.env.PLAID_SECRET}`);

const configuration = new Configuration({
  basePath: plaidBasePath,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
      'Plaid-Version': '2020-09-14',
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
export const plaidEnvironment = plaidEnv;
