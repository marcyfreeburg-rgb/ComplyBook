import { db } from './db';
import { plaidItems } from '../shared/schema';
import { encryptAccessToken, isTokenEncrypted } from './encryption';
import { eq } from 'drizzle-orm';

async function migrateAccessTokens() {
  console.log('Starting access token encryption migration...');
  
  try {
    const items = await db.select().from(plaidItems);
    console.log(`Found ${items.length} Plaid items to check`);
    
    let encrypted = 0;
    let alreadyEncrypted = 0;
    let errors = 0;
    
    for (const item of items) {
      try {
        if (isTokenEncrypted(item.accessToken)) {
          alreadyEncrypted++;
          console.log(`Item ${item.id}: Already encrypted, skipping`);
          continue;
        }
        
        const encryptedToken = encryptAccessToken(item.accessToken);
        
        await db.update(plaidItems)
          .set({ accessToken: encryptedToken })
          .where(eq(plaidItems.id, item.id));
        
        encrypted++;
        console.log(`Item ${item.id}: Successfully encrypted`);
      } catch (error) {
        errors++;
        console.error(`Item ${item.id}: Failed to encrypt`, error);
      }
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`Total items: ${items.length}`);
    console.log(`Newly encrypted: ${encrypted}`);
    console.log(`Already encrypted: ${alreadyEncrypted}`);
    console.log(`Errors: ${errors}`);
    
    if (errors > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAccessTokens();
