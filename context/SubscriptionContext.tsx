/**
 * Subscription Context
 * Manages RevenueCat subscription state globally
 */

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import {
  REVENUECAT_API_KEY_ANDROID as ENV_REVENUECAT_API_KEY_ANDROID,
  REVENUECAT_API_KEY_IOS as ENV_REVENUECAT_API_KEY_IOS,
} from '@env';

const FALLBACK_REVENUECAT_API_KEY_IOS = 'appl_zsiWtbAlioBfBUbGcIPxuDigslN';

const DEV_MODE_KEY = '@notif_dev_mode';
const DEV_PASSWORD = 'claude-code';

export const FREE_ARTICLE_LIMIT = 10;

const getRevenueCatApiKey = (): string | null => {
  const envKey = Platform.OS === 'ios'
    ? ENV_REVENUECAT_API_KEY_IOS
    : ENV_REVENUECAT_API_KEY_ANDROID;
  const fallbackKey = Platform.OS === 'ios'
    ? FALLBACK_REVENUECAT_API_KEY_IOS
    : undefined;
  const apiKey = (envKey || fallbackKey || '').trim();

  if (!apiKey || apiKey.includes('YOUR_') || apiKey.includes('your_')) {
    return null;
  }

  return apiKey;
};

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  isDevMode: boolean;
  currentOffering: PurchasesPackage | null;
  customerInfo: CustomerInfo | null;
  purchasePremium: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<boolean>;
  enableDevMode: (password: string) => Promise<boolean>;
  disableDevMode: () => Promise<void>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPremiumState, setIsPremiumState] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasesConfigured, setIsPurchasesConfigured] = useState(false);
  const [currentOffering, setCurrentOffering] = useState<PurchasesPackage | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Combined premium status (either paid or dev mode)
  const isPremium = isPremiumState || isDevMode;

  const checkDevMode = useCallback(async () => {
    try {
      const devMode = await AsyncStorage.getItem(DEV_MODE_KEY);
      if (devMode === 'true') {
        setIsDevMode(true);
        console.log('[SubscriptionContext] Dev mode enabled');
      }
    } catch (error) {
      console.error('[SubscriptionContext] Error checking dev mode:', error);
    }
  }, []);

  const enableDevMode = async (password: string): Promise<boolean> => {
    if (password === DEV_PASSWORD) {
      try {
        await AsyncStorage.setItem(DEV_MODE_KEY, 'true');
        setIsDevMode(true);
        console.log('[SubscriptionContext] Dev mode enabled successfully');
        return true;
      } catch (error) {
        console.error('[SubscriptionContext] Error enabling dev mode:', error);
        return false;
      }
    }
    return false;
  };

  const disableDevMode = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(DEV_MODE_KEY);
      setIsDevMode(false);
      console.log('[SubscriptionContext] Dev mode disabled');
    } catch (error) {
      console.error('[SubscriptionContext] Error disabling dev mode:', error);
    }
  };

  const initializePurchases = useCallback(async () => {
    try {
      const apiKey = getRevenueCatApiKey();
      if (!apiKey) {
        console.warn('[SubscriptionContext] RevenueCat API key missing, skipping purchase setup');
        return;
      }

      // Configure RevenueCat
      await Purchases.configure({ apiKey });
      setIsPurchasesConfigured(true);

      // Get customer info
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      // Check if user has premium entitlement
      const hasPremium = info.entitlements.active['premium'] !== undefined;
      setIsPremiumState(hasPremium);

      // Get offerings (available products)
      const offerings = await Purchases.getOfferings();
      if (offerings.current?.monthly) {
        setCurrentOffering(offerings.current.monthly);
      } else if (offerings.current?.availablePackages?.[0]) {
        setCurrentOffering(offerings.current.availablePackages[0]);
      }

      // Listen for customer info updates (e.g., subscription status changes)
      Purchases.addCustomerInfoUpdateListener((info) => {
        setCustomerInfo(info);
        setIsPremiumState(info.entitlements.active['premium'] !== undefined);
      });

      console.log('[SubscriptionContext] Initialized, isPremium:', hasPremium);
    } catch (error) {
      setIsPurchasesConfigured(false);
      console.error('[SubscriptionContext] Error initializing purchases:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializePurchases();
    checkDevMode();
  }, [initializePurchases, checkDevMode]);

  const checkSubscriptionStatus = async (): Promise<boolean> => {
    if (!isPurchasesConfigured) {
      console.warn('[SubscriptionContext] Purchases not configured, skipping status check');
      return isPremiumState;
    }

    try {
      const info = await Purchases.getCustomerInfo();
      const hasPremium = info.entitlements.active['premium'] !== undefined;
      setIsPremiumState(hasPremium);
      setCustomerInfo(info);
      return hasPremium;
    } catch (error) {
      console.error('[SubscriptionContext] Error checking subscription:', error);
      return false;
    }
  };

  const purchasePremium = async (): Promise<boolean> => {
    if (!currentOffering) {
      console.error('[SubscriptionContext] No offering available');
      return false;
    }

    try {
      console.log('[SubscriptionContext] Purchasing package:', currentOffering.identifier);
      const { customerInfo } = await Purchases.purchasePackage(currentOffering);
      const hasPremium = customerInfo.entitlements.active['premium'] !== undefined;
      setIsPremiumState(hasPremium);
      setCustomerInfo(customerInfo);
      console.log('[SubscriptionContext] Purchase successful, isPremium:', hasPremium);
      return hasPremium;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('[SubscriptionContext] Purchase error:', error);
      } else {
        console.log('[SubscriptionContext] Purchase cancelled by user');
      }
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!isPurchasesConfigured) {
      console.warn('[SubscriptionContext] Purchases not configured, skipping restore');
      return false;
    }

    try {
      console.log('[SubscriptionContext] Restoring purchases...');
      const info = await Purchases.restorePurchases();
      const hasPremium = info.entitlements.active['premium'] !== undefined;
      setIsPremiumState(hasPremium);
      setCustomerInfo(info);
      console.log('[SubscriptionContext] Restore complete, isPremium:', hasPremium);
      return hasPremium;
    } catch (error) {
      console.error('[SubscriptionContext] Restore error:', error);
      return false;
    }
  };

  return (
    <SubscriptionContext.Provider value={{
      isPremium,
      isLoading,
      isDevMode,
      currentOffering,
      customerInfo,
      purchasePremium,
      restorePurchases,
      checkSubscriptionStatus,
      enableDevMode,
      disableDevMode,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};
