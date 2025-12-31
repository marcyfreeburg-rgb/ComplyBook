import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { isAuthenticated } from './replitAuth';
import { encryptField, decryptField } from './encryption';

const router = Router();

const GUSTO_CLIENT_ID = process.env.GUSTO_CLIENT_ID;
const GUSTO_CLIENT_SECRET = process.env.GUSTO_CLIENT_SECRET;
const GUSTO_API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://api.gusto.com' 
  : 'https://api.gusto-demo.com';

function getRedirectUri(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/api/gusto/callback`;
}

router.get('/authorize/:organizationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!GUSTO_CLIENT_ID) {
      return res.status(500).json({ error: 'Gusto client ID not configured' });
    }

    const userRole = await storage.getUserRole(userId, parseInt(organizationId));
    if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
      return res.status(403).json({ error: 'Only organization owners and admins can connect Gusto' });
    }

    const state = Buffer.from(JSON.stringify({ 
      organizationId: parseInt(organizationId), 
      userId,
      timestamp: Date.now() 
    })).toString('base64');

    const authUrl = new URL(`${GUSTO_API_BASE}/oauth/authorize`);
    authUrl.searchParams.set('client_id', GUSTO_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', getRedirectUri(req));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    res.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Gusto authorize error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('Gusto OAuth error:', error, error_description);
      return res.redirect(`/?gusto_error=${encodeURIComponent(String(error_description || error))}`);
    }

    if (!code || !state) {
      return res.redirect('/?gusto_error=Missing%20authorization%20code');
    }

    let stateData: { organizationId: number; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(String(state), 'base64').toString());
    } catch {
      return res.redirect('/?gusto_error=Invalid%20state%20parameter');
    }

    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return res.redirect('/?gusto_error=Authorization%20expired');
    }

    const tokenResponse = await fetch(`${GUSTO_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GUSTO_CLIENT_ID,
        client_secret: GUSTO_CLIENT_SECRET,
        redirect_uri: getRedirectUri(req),
        code: String(code),
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Gusto token exchange failed:', errorData);
      return res.redirect('/?gusto_error=Token%20exchange%20failed');
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      company_uuid: string;
    };

    console.log('[Gusto] Token exchange successful for company_uuid:', tokenData.company_uuid);

    const companyResponse = await fetch(`${GUSTO_API_BASE}/v1/companies/${tokenData.company_uuid}`, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });

    let companyName = null;
    if (companyResponse.ok) {
      const companyData = await companyResponse.json() as { name?: string };
      companyName = companyData.name || null;
    }

    const existingConnection = await storage.getGustoConnectionByCompanyUuid(tokenData.company_uuid);
    if (existingConnection) {
      await storage.updateGustoConnection(existingConnection.id, {
        accessToken: encryptField(tokenData.access_token),
        refreshToken: encryptField(tokenData.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        status: 'active',
        errorMessage: null,
        companyName,
      });
    } else {
      await storage.createGustoConnection({
        organizationId: stateData.organizationId,
        companyUuid: tokenData.company_uuid,
        companyName,
        accessToken: encryptField(tokenData.access_token),
        refreshToken: encryptField(tokenData.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        status: 'active',
        createdBy: stateData.userId,
      });
    }

    res.redirect('/settings?gusto_connected=true');
  } catch (error: any) {
    console.error('Gusto callback error:', error);
    res.redirect('/?gusto_error=Connection%20failed');
  }
});

async function refreshGustoToken(connectionId: number): Promise<string | null> {
  const connection = await storage.getGustoConnectionById(connectionId);
  if (!connection) return null;

  const refreshToken = decryptField(connection.refreshToken);

  const response = await fetch(`${GUSTO_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GUSTO_CLIENT_ID,
      client_secret: GUSTO_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('Gusto token refresh failed');
    await storage.updateGustoConnection(connectionId, {
      status: 'error',
      errorMessage: 'Token refresh failed',
    });
    return null;
  }

  const tokenData = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await storage.updateGustoConnection(connectionId, {
    accessToken: encryptField(tokenData.access_token),
    refreshToken: encryptField(tokenData.refresh_token),
    tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    status: 'active',
    errorMessage: null,
  });

  return tokenData.access_token;
}

async function getValidAccessToken(connectionId: number): Promise<string | null> {
  const connection = await storage.getGustoConnectionById(connectionId);
  if (!connection) return null;

  if (new Date() >= new Date(connection.tokenExpiresAt.getTime() - 60000)) {
    return refreshGustoToken(connectionId);
  }

  return decryptField(connection.accessToken);
}

router.get('/connection/:organizationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const connection = await storage.getGustoConnection(parseInt(organizationId));
    
    if (!connection) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      companyName: connection.companyName,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt,
    });
  } catch (error: any) {
    console.error('Error fetching Gusto connection:', error);
    res.status(500).json({ error: 'Failed to fetch connection status' });
  }
});

router.delete('/disconnect/:organizationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userRole = await storage.getUserRole(userId, parseInt(organizationId));
    if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
      return res.status(403).json({ error: 'Only organization owners and admins can disconnect Gusto' });
    }

    const connection = await storage.getGustoConnection(parseInt(organizationId));
    if (!connection) {
      return res.status(404).json({ error: 'No Gusto connection found' });
    }

    await storage.deleteGustoConnection(connection.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting Gusto:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

router.get('/employees/:organizationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const connection = await storage.getGustoConnection(parseInt(organizationId));
    
    if (!connection) {
      return res.status(404).json({ error: 'No Gusto connection found' });
    }

    const accessToken = await getValidAccessToken(connection.id);
    if (!accessToken) {
      return res.status(401).json({ error: 'Failed to get valid access token' });
    }

    const response = await fetch(`${GUSTO_API_BASE}/v1/companies/${connection.companyUuid}/employees`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gusto employees fetch failed:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch employees from Gusto' });
    }

    const employees = await response.json();
    res.json(employees);
  } catch (error: any) {
    console.error('Error fetching Gusto employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.get('/payrolls/:organizationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const connection = await storage.getGustoConnection(parseInt(organizationId));
    
    if (!connection) {
      return res.status(404).json({ error: 'No Gusto connection found' });
    }

    const accessToken = await getValidAccessToken(connection.id);
    if (!accessToken) {
      return res.status(401).json({ error: 'Failed to get valid access token' });
    }

    const response = await fetch(`${GUSTO_API_BASE}/v1/companies/${connection.companyUuid}/payrolls`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gusto payrolls fetch failed:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch payrolls from Gusto' });
    }

    const payrolls = await response.json();
    res.json(payrolls);
  } catch (error: any) {
    console.error('Error fetching Gusto payrolls:', error);
    res.status(500).json({ error: 'Failed to fetch payrolls' });
  }
});

router.get('/company/:organizationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const connection = await storage.getGustoConnection(parseInt(organizationId));
    
    if (!connection) {
      return res.status(404).json({ error: 'No Gusto connection found' });
    }

    const accessToken = await getValidAccessToken(connection.id);
    if (!accessToken) {
      return res.status(401).json({ error: 'Failed to get valid access token' });
    }

    const response = await fetch(`${GUSTO_API_BASE}/v1/companies/${connection.companyUuid}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gusto company fetch failed:', errorText);
      return res.status(response.status).json({ error: 'Failed to fetch company from Gusto' });
    }

    const company = await response.json();
    res.json(company);
  } catch (error: any) {
    console.error('Error fetching Gusto company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

export default router;
