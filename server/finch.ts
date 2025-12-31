import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { isAuthenticated } from './replitAuth';
import { encryptField, decryptField, isFieldEncrypted } from './encryption';

const router = Router();

const FINCH_CLIENT_ID = process.env.FINCH_CLIENT_ID;
const FINCH_CLIENT_SECRET = process.env.FINCH_CLIENT_SECRET;
const FINCH_API_BASE = 'https://api.tryfinch.com';
const FINCH_SANDBOX = process.env.NODE_ENV === 'production' ? undefined : 'finch';

const PROVIDER_NAMES: Record<string, string> = {
  'adp_workforce_now': 'ADP Workforce Now',
  'gusto': 'Gusto',
  'bamboo_hr': 'BambooHR',
  'paychex': 'Paychex',
  'paylocity': 'Paylocity',
  'quickbooks': 'QuickBooks',
  'rippling': 'Rippling',
  'square_payroll': 'Square Payroll',
  'trinet': 'TriNet',
  'workday': 'Workday',
  'zenefits': 'Zenefits',
  'justworks': 'Justworks',
  'deel': 'Deel',
  'finch': 'Finch Sandbox',
};

function getRedirectUri(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/api/finch/callback`;
}

router.post('/create-session/:organizationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!FINCH_CLIENT_ID || !FINCH_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Finch credentials not configured' });
    }

    const userRole = await storage.getUserRole(userId, parseInt(organizationId));
    if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
      return res.status(403).json({ error: 'Only organization owners and admins can connect payroll providers' });
    }

    const org = await storage.getOrganization(parseInt(organizationId));
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const sessionPayload: any = {
      customer_id: `org_${organizationId}`,
      customer_name: org.name,
      products: ['company', 'directory', 'individual', 'employment', 'payment', 'pay_statement'],
      redirect_uri: getRedirectUri(req),
    };

    if (FINCH_SANDBOX) {
      sessionPayload.sandbox = FINCH_SANDBOX;
    }

    console.log('[Finch] Creating connect session for org:', organizationId);
    
    const sessionResponse = await fetch(`${FINCH_API_BASE}/connect/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${FINCH_CLIENT_ID}:${FINCH_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify(sessionPayload),
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.text();
      console.error('[Finch] Session creation failed:', errorData);
      return res.status(500).json({ error: 'Failed to create Finch connect session' });
    }

    const sessionData = await sessionResponse.json() as {
      session_id: string;
      connect_url: string;
    };

    console.log('[Finch] Session created, session_id:', sessionData.session_id.substring(0, 8) + '...');

    (req.session as any).finchState = {
      organizationId: parseInt(organizationId),
      userId,
      sessionId: sessionData.session_id,
      timestamp: Date.now(),
    };

    res.json({ 
      connectUrl: sessionData.connect_url,
      sessionId: sessionData.session_id 
    });
  } catch (error: any) {
    console.error('[Finch] Create session error:', error);
    res.status(500).json({ error: 'Failed to create connect session' });
  }
});

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, error, error_description } = req.query;

    if (error) {
      console.error('[Finch] OAuth error:', error, error_description);
      return res.redirect(`/payroll?finch_error=${encodeURIComponent(String(error_description || error))}`);
    }

    if (!code) {
      return res.redirect('/payroll?finch_error=Missing%20authorization%20code');
    }

    const finchState = (req.session as any).finchState;
    if (!finchState) {
      return res.redirect('/payroll?finch_error=Session%20expired%20-%20please%20try%20again');
    }

    if (Date.now() - finchState.timestamp > 15 * 60 * 1000) {
      return res.redirect('/payroll?finch_error=Authorization%20expired');
    }

    console.log('[Finch] Exchanging code for token...');

    const tokenResponse = await fetch(`${FINCH_API_BASE}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${FINCH_CLIENT_ID}:${FINCH_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        code: String(code),
        redirect_uri: getRedirectUri(req),
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Finch] Token exchange failed:', errorData);
      return res.redirect('/payroll?finch_error=Token%20exchange%20failed');
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      company_id: string;
      connection_id: string;
      provider_id: string;
      products: string[];
    };

    console.log('[Finch] Token exchange successful');
    console.log('[Finch] connection_id:', tokenData.connection_id);
    console.log('[Finch] company_id:', tokenData.company_id);
    console.log('[Finch] provider_id:', tokenData.provider_id);

    const providerName = PROVIDER_NAMES[tokenData.provider_id] || tokenData.provider_id;

    const existingConnection = await storage.getFinchConnectionByConnectionId(tokenData.connection_id);
    if (existingConnection) {
      await storage.updateFinchConnection(existingConnection.id, {
        accessToken: encryptField(tokenData.access_token),
        status: 'active',
        errorMessage: null,
        products: tokenData.products,
      });
      console.log('[Finch] Updated existing connection');
    } else {
      await storage.createFinchConnection({
        organizationId: finchState.organizationId,
        connectionId: tokenData.connection_id,
        companyId: tokenData.company_id,
        providerId: tokenData.provider_id,
        providerName,
        accessToken: encryptField(tokenData.access_token),
        products: tokenData.products,
        status: 'active',
        createdBy: finchState.userId,
      });
      console.log('[Finch] Created new connection');
    }

    delete (req.session as any).finchState;
    res.redirect('/payroll?finch_success=true');
  } catch (error: any) {
    console.error('[Finch] Callback error:', error);
    res.redirect('/payroll?finch_error=Connection%20failed');
  }
});

router.get('/connection/:organizationId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userRole = await storage.getUserRole(userId, parseInt(organizationId));
    if (!userRole) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const connections = await storage.getFinchConnectionsByOrganization(parseInt(organizationId));
    
    const sanitizedConnections = connections.map(conn => ({
      id: conn.id,
      connectionId: conn.connectionId,
      companyId: conn.companyId,
      providerId: conn.providerId,
      providerName: conn.providerName,
      products: conn.products,
      status: conn.status,
      errorMessage: conn.errorMessage,
      lastSyncedAt: conn.lastSyncedAt,
      createdAt: conn.createdAt,
    }));

    res.json(sanitizedConnections);
  } catch (error: any) {
    console.error('[Finch] Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

router.get('/company/:connectionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const connection = await storage.getFinchConnectionByConnectionId(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const userRole = await storage.getUserRole(userId, connection.organizationId);
    if (!userRole) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let accessToken = connection.accessToken;
    if (isFieldEncrypted(accessToken)) {
      accessToken = decryptField(accessToken);
    }

    const companyResponse = await fetch(`${FINCH_API_BASE}/employer/company`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!companyResponse.ok) {
      const errorData = await companyResponse.text();
      console.error('[Finch] Company fetch failed:', errorData);
      return res.status(500).json({ error: 'Failed to fetch company data' });
    }

    const companyData = await companyResponse.json();
    res.json(companyData);
  } catch (error: any) {
    console.error('[Finch] Get company error:', error);
    res.status(500).json({ error: 'Failed to get company data' });
  }
});

router.get('/directory/:connectionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const connection = await storage.getFinchConnectionByConnectionId(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const userRole = await storage.getUserRole(userId, connection.organizationId);
    if (!userRole) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let accessToken = connection.accessToken;
    if (isFieldEncrypted(accessToken)) {
      accessToken = decryptField(accessToken);
    }

    console.log('[Finch] Fetching directory for connection:', connectionId);

    const directoryResponse = await fetch(`${FINCH_API_BASE}/employer/directory`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!directoryResponse.ok) {
      const errorData = await directoryResponse.text();
      console.error('[Finch] Directory fetch failed:', errorData);
      return res.status(500).json({ error: 'Failed to fetch employee directory' });
    }

    const directoryData = await directoryResponse.json();
    
    await storage.updateFinchConnection(connection.id, {
      lastSyncedAt: new Date(),
    });

    res.json(directoryData);
  } catch (error: any) {
    console.error('[Finch] Get directory error:', error);
    res.status(500).json({ error: 'Failed to get employee directory' });
  }
});

router.delete('/disconnect/:connectionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = (req as any).user?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const connection = await storage.getFinchConnectionByConnectionId(connectionId);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const userRole = await storage.getUserRole(userId, connection.organizationId);
    if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
      return res.status(403).json({ error: 'Only organization owners and admins can disconnect providers' });
    }

    let accessToken = connection.accessToken;
    if (isFieldEncrypted(accessToken)) {
      accessToken = decryptField(accessToken);
    }

    console.log('[Finch] Disconnecting connection:', connectionId);

    try {
      await fetch(`${FINCH_API_BASE}/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
    } catch (e) {
      console.log('[Finch] Disconnect API call failed (may already be disconnected):', e);
    }

    await storage.deleteFinchConnection(connection.id);

    console.log('[Finch] Connection deleted successfully');
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Finch] Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;
