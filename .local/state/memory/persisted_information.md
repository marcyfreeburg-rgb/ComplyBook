# Persisted Information - Render Deployment Compatibility

## Session Summary (December 15, 2025)

### All Fixes Completed for Render Deployment

1. **Brand Settings Update (invoice-settings route)** - Fixed TypeScript typing issue
2. **Logout Redirect** - Fixed to redirect to "/" instead of showing JSON
3. **Logo Upload Fallback** - Added local filesystem storage (uploads/logos/)
4. **Local File Serving** - Added /uploads/* route for non-Replit environments
5. **ObjectStorageService Guards** - Protected all routes that use Replit object storage
6. **Super Admin Access** - admin@complybook.net and marcy.freeburg@gmail.com now have admin access to all organizations via special handling in:
   - `storage.getOrganizations()` - Returns all orgs with 'admin' role for super admins
   - `storage.getUserRole()` - Returns synthetic admin role with full_access permissions
7. **Logo ACL Fix** - Added missing `owner` field to ACL policy when uploading logos

### Key Environment Detection
```typescript
const isReplitEnvironment = !!(process.env.REPLIT_DOMAINS && process.env.REPL_ID);
```

### Super Admin User IDs
- admin@complybook.net → user_id: `local_admin_default`
- marcy.freeburg@gmail.com → user_id: `local_admin_marcy`

### Super Admin Logic Location
File: `server/storage.ts`
- Lines ~1184-1194: getOrganizations() special handling
- Lines ~1262-1275: getUserRole() special handling

### User Info
- Render URL: https://www.complybook.net
- Uses local auth on Render
- Render persistent disks are a paid feature

### Status
- All code changes complete
- User needs to push to GitHub and redeploy on Render
- Logo uploads work but won't persist across restarts without paid persistent disk on Render
