import { storage } from './storage';
import { plaidClient } from './plaid';

export interface PlaidWebhookPayload {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_code: string;
    error_message: string;
    display_message?: string;
  };
  new_transactions?: number;
  removed_transactions?: string[];
  consent_expiration_time?: string;
}

export class PlaidWebhookHandlers {
  static async processWebhook(payload: PlaidWebhookPayload): Promise<void> {
    const { webhook_type, webhook_code, item_id } = payload;

    console.log(`Processing Plaid webhook: ${webhook_type}/${webhook_code} for item ${item_id}`);

    switch (webhook_type) {
      case 'TRANSACTIONS':
        await this.handleTransactionsWebhook(payload);
        break;
      case 'ITEM':
        await this.handleItemWebhook(payload);
        break;
      case 'HOLDINGS':
        console.log('Holdings webhook received (not implemented)');
        break;
      case 'INVESTMENTS_TRANSACTIONS':
        console.log('Investment transactions webhook received (not implemented)');
        break;
      case 'LIABILITIES':
        console.log('Liabilities webhook received (not implemented)');
        break;
      case 'AUTH':
        console.log('Auth webhook received (not implemented)');
        break;
      case 'IDENTITY':
        console.log('Identity webhook received (not implemented)');
        break;
      case 'ASSETS':
        console.log('Assets webhook received (not implemented)');
        break;
      case 'INCOME':
        console.log('Income webhook received (not implemented)');
        break;
      case 'LINK':
        await this.handleLinkWebhook(payload);
        break;
      default:
        console.log(`Unknown webhook type: ${webhook_type}`);
    }
  }

  static async handleTransactionsWebhook(payload: PlaidWebhookPayload): Promise<void> {
    const { webhook_code, item_id } = payload;

    const plaidItem = await storage.getPlaidItemByPlaidId(item_id);
    if (!plaidItem) {
      console.log(`No Plaid item found for item_id: ${item_id}`);
      return;
    }

    switch (webhook_code) {
      case 'SYNC_UPDATES_AVAILABLE':
        console.log(`Sync updates available for item ${item_id}`);
        await this.syncTransactionsForItem(plaidItem);
        break;

      case 'INITIAL_UPDATE':
        console.log(`Initial update received for item ${item_id}`);
        await this.syncTransactionsForItem(plaidItem);
        break;

      case 'HISTORICAL_UPDATE':
        console.log(`Historical update received for item ${item_id}`);
        await this.syncTransactionsForItem(plaidItem);
        break;

      case 'DEFAULT_UPDATE':
        console.log(`Default update received for item ${item_id}`);
        await this.syncTransactionsForItem(plaidItem);
        break;

      case 'TRANSACTIONS_REMOVED':
        console.log(`Transactions removed for item ${item_id}`);
        if (payload.removed_transactions && payload.removed_transactions.length > 0) {
          console.log(`Removed transaction IDs: ${payload.removed_transactions.join(', ')}`);
        }
        break;

      default:
        console.log(`Unknown transactions webhook code: ${webhook_code}`);
    }
  }

  static async handleItemWebhook(payload: PlaidWebhookPayload): Promise<void> {
    const { webhook_code, item_id, error } = payload;

    const plaidItem = await storage.getPlaidItemByPlaidId(item_id);
    if (!plaidItem) {
      console.log(`No Plaid item found for item_id: ${item_id}`);
      return;
    }

    switch (webhook_code) {
      case 'ERROR':
        console.log(`Item error for ${item_id}:`, error);
        if (error) {
          await storage.updatePlaidItemStatus(plaidItem.id, {
            status: 'error',
            errorCode: error.error_code,
            errorMessage: error.error_message || error.display_message || 'Unknown error',
          });
        }
        break;

      case 'LOGIN_REPAIRED':
        console.log(`Login repaired for item ${item_id}`);
        await storage.updatePlaidItemStatus(plaidItem.id, {
          status: 'active',
          errorCode: null,
          errorMessage: null,
        });
        await this.syncTransactionsForItem(plaidItem);
        break;

      case 'PENDING_EXPIRATION':
        console.log(`Pending expiration for item ${item_id}, expires: ${payload.consent_expiration_time}`);
        await storage.updatePlaidItemStatus(plaidItem.id, {
          status: 'login_required',
          errorCode: 'PENDING_EXPIRATION',
          errorMessage: `Access will expire on ${payload.consent_expiration_time}. Please re-authenticate.`,
        });
        break;

      case 'USER_PERMISSION_REVOKED':
        console.log(`User permission revoked for item ${item_id}`);
        await storage.updatePlaidItemStatus(plaidItem.id, {
          status: 'error',
          errorCode: 'USER_PERMISSION_REVOKED',
          errorMessage: 'User has revoked access. Please reconnect the account.',
        });
        break;

      case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
        console.log(`Webhook update acknowledged for item ${item_id}`);
        break;

      default:
        console.log(`Unknown item webhook code: ${webhook_code}`);
    }
  }

  static async handleLinkWebhook(payload: PlaidWebhookPayload): Promise<void> {
    const { webhook_code, item_id } = payload;

    console.log(`Link webhook: ${webhook_code} for item ${item_id}`);

    const plaidItem = await storage.getPlaidItemByPlaidId(item_id);
    if (!plaidItem) {
      console.log(`No Plaid item found for item_id: ${item_id}`);
      return;
    }

    switch (webhook_code) {
      case 'EVENTS':
        console.log('Link events received');
        break;
      case 'SESSION_FINISHED':
        console.log('Link session finished');
        break;
      default:
        console.log(`Unknown link webhook code: ${webhook_code}`);
    }
  }

  static async syncTransactionsForItem(plaidItem: any): Promise<void> {
    try {
      console.log(`Syncing transactions for item ${plaidItem.itemId}...`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: plaidItem.accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          count: 500,
          offset: 0,
        },
      });

      for (const account of transactionsResponse.data.accounts) {
        await storage.updatePlaidAccountBalances(
          account.account_id,
          account.balances.current?.toString() || '0',
          account.balances.available?.toString() || '0'
        );
      }

      let imported = 0;
      for (const plaidTx of transactionsResponse.data.transactions) {
        const existingTxs = await storage.getTransactionsByDateRange(
          plaidItem.organizationId,
          new Date(plaidTx.date),
          new Date(plaidTx.date)
        );

        const isDuplicate = existingTxs.some(tx => 
          tx.description === (plaidTx.name || plaidTx.merchant_name || 'Unknown Transaction') &&
          Math.abs(parseFloat(tx.amount) - Math.abs(plaidTx.amount)) < 0.01
        );

        if (!isDuplicate) {
          const isIncome = plaidTx.amount < 0;
          const txDescription = plaidTx.name || plaidTx.merchant_name || 'Unknown Transaction';
          const importNote = plaidItem.institutionName ? ` (${plaidItem.institutionName})` : '';
          await storage.createTransaction({
            organizationId: plaidItem.organizationId,
            description: txDescription + importNote,
            amount: Math.abs(plaidTx.amount).toFixed(2),
            type: isIncome ? 'income' : 'expense',
            date: new Date(plaidTx.date),
            categoryId: null,
            vendorId: null,
            createdBy: plaidItem.createdBy,
          });
          imported++;
        }
      }

      await storage.updatePlaidItemStatus(plaidItem.id, {
        status: 'active',
        lastSyncedAt: new Date(),
        errorCode: null,
        errorMessage: null,
      });

      console.log(`Synced ${imported} new transactions for item ${plaidItem.itemId}`);
    } catch (error: any) {
      console.error(`Error syncing transactions for item ${plaidItem.itemId}:`, error);

      if (error.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
        await storage.updatePlaidItemStatus(plaidItem.id, {
          status: 'login_required',
          errorCode: 'ITEM_LOGIN_REQUIRED',
          errorMessage: 'Please log in to your bank account again to continue syncing.',
        });
      } else {
        await storage.updatePlaidItemStatus(plaidItem.id, {
          status: 'error',
          errorCode: error.response?.data?.error_code || 'UNKNOWN_ERROR',
          errorMessage: error.message || 'An error occurred while syncing transactions.',
        });
      }
    }
  }
}
