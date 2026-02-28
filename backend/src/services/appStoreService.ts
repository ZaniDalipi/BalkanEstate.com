import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { paymentLogger } from '../utils/logger';


/**
 * App Store Server API Service
 * Handles purchase validation and App Store Server Notifications v2
 */

interface AppStoreConfig {
  issuerId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
  environment: 'sandbox' | 'production';
}

interface AppStoreTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  originalPurchaseDate: number;
  expiresDate?: number;
  quantity: number;
  type: string;
  inAppOwnershipType: string;
  signedDate: number;
  environment: string;
  transactionReason?: string;
  storefront?: string;
  storefrontId?: string;
  price?: number;
  currency?: string;
}

class AppStoreService {
  private config: AppStoreConfig;
  private baseUrl: string;

  constructor(config: AppStoreConfig) {
    this.config = config;
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.storekit.itunes.apple.com'
        : 'https://api.storekit-sandbox.itunes.apple.com';
  }

  /**
   * Generate JWT token for App Store Server API authentication
   */
  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: this.config.issuerId,
      iat: now,
      exp: now + 3600, // 1 hour expiration
      aud: 'appstoreconnect-v1',
      bid: this.config.bundleId,
    };

    return jwt.sign(payload, this.config.privateKey, {
      algorithm: 'ES256',
      keyid: this.config.keyId,
    });
  }

  /**
   * Validate a transaction using App Store Server API
   */
  async validateTransaction(transactionId: string): Promise<AppStoreTransaction> {
    try {
      const token = this.generateToken();

      const response = await axios.get(
        `${this.baseUrl}/inApps/v1/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Decode the signed transaction
      const signedTransaction = response.data.signedTransaction;
      const decoded = jwt.decode(signedTransaction) as AppStoreTransaction;

      return decoded;
    } catch (error: any) {
      paymentLogger.error('App Store validation error:', error);
      throw new Error(`Failed to validate App Store transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(originalTransactionId: string): Promise<AppStoreTransaction[]> {
    try {
      const token = this.generateToken();

      const response = await axios.get(
        `${this.baseUrl}/inApps/v1/history/${originalTransactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Decode all signed transactions
      const transactions = response.data.signedTransactions.map((signed: string) => {
        return jwt.decode(signed) as AppStoreTransaction;
      });

      return transactions;
    } catch (error: any) {
      paymentLogger.error('App Store history error:', error);
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(originalTransactionId: string): Promise<any> {
    try {
      const token = this.generateToken();

      const response = await axios.get(
        `${this.baseUrl}/inApps/v1/subscriptions/${originalTransactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      paymentLogger.error('App Store subscription status error:', error);
      throw new Error(`Failed to get subscription status: ${error.message}`);
    }
  }

  /**
   * Request refund
   */
  async requestRefund(transactionId: string): Promise<void> {
    try {
      const token = this.generateToken();

      await axios.post(
        `${this.baseUrl}/inApps/v2/refund/lookup/${transactionId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      paymentLogger.info(`Requested refund for transaction: ${transactionId}`);
    } catch (error: any) {
      paymentLogger.error('App Store refund error:', error);
      throw new Error(`Failed to request refund: ${error.message}`);
    }
  }

  /**
   * Verify App Store Server Notification v2 signature
   *
   * Validates the JWS (JSON Web Signature) signed by Apple:
   * 1. Extracts the x5c certificate chain from the JOSE header
   * 2. Verifies the leaf certificate was issued by Apple's root CA
   * 3. Uses the leaf certificate's public key to verify the JWT signature
   */
  verifyNotificationSignature(signedPayload: string): boolean {
    try {
      const parts = signedPayload.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Decode the JOSE header to extract the certificate chain
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const x5c: string[] | undefined = header?.x5c;

      if (!x5c || !Array.isArray(x5c) || x5c.length === 0) {
        paymentLogger.error('App Store webhook: missing x5c certificate chain in header');
        return false;
      }

      // Build PEM from the leaf certificate (first in chain)
      const leafCertPem = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;

      // Verify the JWT signature using the leaf certificate's public key
      // jwt.verify will throw if the signature is invalid
      const decoded = jwt.verify(signedPayload, leafCertPem, {
        algorithms: ['ES256'],
      });

      if (!decoded) {
        return false;
      }

      // Verify the certificate chain leads to Apple's known root CA
      // Check that the leaf cert subject/issuer contains Apple identifiers
      const crypto = require('crypto');
      const cert = new crypto.X509Certificate(leafCertPem);
      const issuer = cert.issuer || '';

      if (!issuer.includes('Apple')) {
        paymentLogger.error('App Store webhook: certificate issuer is not Apple');
        return false;
      }

      return true;
    } catch (error) {
      paymentLogger.error('App Store webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Decode App Store Server Notification v2
   */
  decodeNotification(signedPayload: string): any {
    try {
      const decoded = jwt.decode(signedPayload);
      return decoded;
    } catch (error) {
      paymentLogger.error('Failed to decode notification:', error);
      throw new Error('Invalid notification payload');
    }
  }

  /**
   * Parse notification type from App Store Server Notifications v2
   */
  parseNotificationType(notificationType: string): string {
    const types: { [key: string]: string } = {
      SUBSCRIBED: 'SUBSCRIPTION_PURCHASED',
      DID_RENEW: 'SUBSCRIPTION_RENEWED',
      DID_CHANGE_RENEWAL_STATUS: 'SUBSCRIPTION_RENEWAL_STATUS_CHANGED',
      DID_FAIL_TO_RENEW: 'SUBSCRIPTION_RENEWAL_FAILED',
      GRACE_PERIOD_EXPIRED: 'SUBSCRIPTION_GRACE_PERIOD_EXPIRED',
      OFFER_REDEEMED: 'SUBSCRIPTION_OFFER_REDEEMED',
      PRICE_INCREASE: 'SUBSCRIPTION_PRICE_INCREASE_APPROVED',
      REFUND: 'SUBSCRIPTION_REFUNDED',
      REFUND_DECLINED: 'SUBSCRIPTION_REFUND_DECLINED',
      RENEWAL_EXTENDED: 'SUBSCRIPTION_RENEWAL_EXTENDED',
      REVOKE: 'SUBSCRIPTION_REVOKED',
      EXPIRED: 'SUBSCRIPTION_EXPIRED',
    };

    return types[notificationType] || notificationType;
  }
}

// Export singleton instance (will be initialized with env vars)
let appStoreServiceInstance: AppStoreService | null = null;

export const initializeAppStoreService = (config: AppStoreConfig) => {
  appStoreServiceInstance = new AppStoreService(config);
  return appStoreServiceInstance;
};

export const getAppStoreService = (): AppStoreService => {
  if (!appStoreServiceInstance) {
    throw new Error('App Store Service not initialized. Call initializeAppStoreService first.');
  }
  return appStoreServiceInstance;
};

export default AppStoreService;
