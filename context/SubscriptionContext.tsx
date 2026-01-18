/**
 * Subscription Context
 * Manages RevenueCat subscription state globally
 */

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

// RevenueCat API keys from dashboard
const REVENUECAT_API_KEY_IOS = 'appl_zsiWtbAlioBfBUbGcIPxuDigslN';
const REVENUECAT_API_KEY_ANDROID = 'goog_YOUR_ANDROID_API_KEY'; // Add Android key when ready

export const FREE_ARTICLE_LIMIT = 10;

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  currentOffering: PurchasesPackage | null;
  customerInfo: CustomerInfo | null;
  purchasePremium: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<boolean>;
}

export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesPackage | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    initializePurchases();
  }, []);

  const initializePurchases = async () => {
    try {
      const apiKey = Platform.OS === 'ios'
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID;

      // Configure RevenueCat
      await Purchases.configure({ apiKey });

      // Get customer info
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      // Check if user has premium entitlement
      const hasPremium = info.entitlements.active['premium'] !== undefined;
      setIsPremium(hasPremium);

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
        setIsPremium(info.entitlements.active['premium'] !== undefined);
      });

      console.log('[SubscriptionContext] Initialized, isPremium:', hasPremium);
    } catch (error) {
      console.error('[SubscriptionContext] Error initializing purchases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscriptionStatus = async (): Promise<boolean> => {
    try {
      const info = await Purchases.getCustomerInfo();
      const hasPremium = info.entitlements.active['premium'] !== undefined;
      setIsPremium(hasPremium);
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
      setIsPremium(hasPremium);
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
    try {
      console.log('[SubscriptionContext] Restoring purchases...');
      const info = await Purchases.restorePurchases();
      const hasPremium = info.entitlements.active['premium'] !== undefined;
      setIsPremium(hasPremium);
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
      currentOffering,
      customerInfo,
      purchasePremium,
      restorePurchases,
      checkSubscriptionStatus,
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
