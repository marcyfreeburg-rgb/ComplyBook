// Feature Gating Middleware
// Checks user subscription tier to control access to premium features

import type { Request, Response, NextFunction } from 'express';
import { SUBSCRIPTION_TIERS, type SubscriptionTier, type TierFeatures } from '@shared/schema';
import { storage } from './storage';

// Get features for a given subscription tier
export function getTierFeatures(tier: SubscriptionTier): TierFeatures {
  return SUBSCRIPTION_TIERS[tier]?.features || SUBSCRIPTION_TIERS.free.features;
}

// Get limits for a given subscription tier
export function getTierLimits(tier: SubscriptionTier) {
  const config = SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS.free;
  return {
    maxOrganizations: config.maxOrganizations,
    maxUsers: config.maxUsers,
    maxTransactionsPerMonth: config.maxTransactionsPerMonth,
    supportLevel: config.supportLevel,
  };
}

// Check if a feature is available for a subscription tier
export function hasFeature(tier: SubscriptionTier, feature: keyof TierFeatures): boolean {
  const features = getTierFeatures(tier);
  return features[feature] === true;
}

// Middleware to require a specific feature
export function requireFeature(feature: keyof TierFeatures) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const tier = user.subscriptionTier as SubscriptionTier || 'free';
      
      if (!hasFeature(tier, feature)) {
        const tierName = SUBSCRIPTION_TIERS[tier].name;
        return res.status(403).json({
          message: `This feature requires an upgraded subscription`,
          feature,
          currentTier: tier,
          currentTierName: tierName,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error('Feature gating error:', error);
      res.status(500).json({ message: 'Error checking feature access' });
    }
  };
}

// Middleware to require a specific subscription tier
export function requireTier(minimumTier: SubscriptionTier) {
  const tierOrder: SubscriptionTier[] = ['free', 'core', 'professional', 'growth', 'enterprise'];
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const userTier = user.subscriptionTier as SubscriptionTier || 'free';
      const userTierIndex = tierOrder.indexOf(userTier);
      const requiredTierIndex = tierOrder.indexOf(minimumTier);
      
      if (userTierIndex < requiredTierIndex) {
        return res.status(403).json({
          message: `This feature requires ${SUBSCRIPTION_TIERS[minimumTier].name} or higher`,
          currentTier: userTier,
          requiredTier: minimumTier,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error('Tier requirement error:', error);
      res.status(500).json({ message: 'Error checking subscription tier' });
    }
  };
}

// Middleware to check organization limits before creating new organization
export function checkOrganizationLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const tier = user.subscriptionTier as SubscriptionTier || 'free';
      const limits = getTierLimits(tier);
      
      // Get user's current organization count using existing storage method
      const organizations = await storage.getOrganizations(userId);
      const ownedOrgs = organizations.filter(org => org.userRole === 'owner').length;
      
      if (limits.maxOrganizations !== null && ownedOrgs >= limits.maxOrganizations) {
        return res.status(403).json({
          message: `You've reached the maximum of ${limits.maxOrganizations} organizations for your ${SUBSCRIPTION_TIERS[tier].name} plan`,
          currentCount: ownedOrgs,
          limit: limits.maxOrganizations,
          currentTier: tier,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error('Organization limit check error:', error);
      res.status(500).json({ message: 'Error checking organization limits' });
    }
  };
}

// Middleware to check user limits per organization before adding team member
export function checkUserLimit(organizationId: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Get organization members using existing storage method
      const teamMembers = await storage.getTeamMembers(organizationId);
      const owner = teamMembers.find(m => m.role === 'owner');
      
      if (!owner) {
        return res.status(400).json({ message: 'Organization owner not found' });
      }

      const ownerUser = await storage.getUser(owner.userId);
      if (!ownerUser) {
        return res.status(400).json({ message: 'Owner user not found' });
      }

      const tier = ownerUser.subscriptionTier as SubscriptionTier || 'free';
      const limits = getTierLimits(tier);
      
      const currentMemberCount = teamMembers.length;
      
      if (limits.maxUsers !== null && currentMemberCount >= limits.maxUsers) {
        return res.status(403).json({
          message: `This organization has reached its team member limit of ${limits.maxUsers} for the ${SUBSCRIPTION_TIERS[tier].name} plan`,
          currentCount: currentMemberCount,
          limit: limits.maxUsers,
          currentTier: tier,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      console.error('User limit check error:', error);
      res.status(500).json({ message: 'Error checking user limits' });
    }
  };
}

// Utility to get user subscription info
export async function getUserSubscriptionInfo(userId: string) {
  const user = await storage.getUser(userId);
  if (!user) {
    return null;
  }

  const tier = user.subscriptionTier as SubscriptionTier || 'free';
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  
  return {
    tier,
    tierName: tierConfig.name,
    features: tierConfig.features,
    limits: getTierLimits(tier),
    status: user.subscriptionStatus || 'active',
    currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
    billingInterval: user.billingInterval,
  };
}

// API endpoint handler to get subscription status
export async function getSubscriptionStatus(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const info = await getUserSubscriptionInfo(userId);
    if (!info) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(info);
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ message: 'Error getting subscription status' });
  }
}
