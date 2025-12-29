/**
 * PaySera Payment Service
 *
 * Handles payment processing for non-EU Balkan countries:
 * - Serbia (RS)
 * - Albania (AL)
 * - Bosnia and Herzegovina (BA)
 * - North Macedonia (MK)
 * - Montenegro (ME)
 * - Kosovo (XK)
 *
 * PaySera API Documentation: https://developers.paysera.com/
 */

import crypto from 'crypto';

// PaySera API endpoints
const PAYSERA_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://bank.paysera.com/pay/'
  : 'https://sandbox.paysera.com/pay/';

const PAYSERA_API_VERSION = '1.6';

export interface PayseraConfig {
  projectId: string;
  signPassword: string;
  acceptUrl: string;
  cancelUrl: string;
  callbackUrl: string;
}

export interface PayseraPaymentRequest {
  orderId: string;
  amount: number; // Amount in cents
  currency: string;
  country: string;
  description: string;
  email: string;
  userId: string;
  productId: string;
  planName: string;
  planInterval: string;
  firstName?: string;
  lastName?: string;
  language?: string;
}

export interface PayseraPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  orderId?: string;
  error?: string;
}

export interface PayseraCallbackData {
  projectid: string;
  orderid: string;
  payamount: number;
  paycurrency: string;
  status: number; // 0 = not executed, 1 = executed, 2 = accepted but not executed, 3 = additional info needed
  requestid: string;
  test: number;
  payment: string;
  country: string;
  paytext?: string;
  name?: string;
  surename?: string;
  payer?: string;
}

/**
 * PaySera Payment Service Class
 */
class PayseraService {
  private config: PayseraConfig;

  constructor() {
    this.config = {
      projectId: process.env.PAYSERA_PROJECT_ID || '',
      signPassword: process.env.PAYSERA_SIGN_PASSWORD || '',
      acceptUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
      cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
      callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/payments/paysera/webhook`,
    };
  }

  /**
   * Encode data to base64 URL-safe format (PaySera requirement)
   */
  private base64UrlEncode(data: string): string {
    return Buffer.from(data)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  /**
   * Decode base64 URL-safe format
   */
  private base64UrlDecode(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Generate MD5 signature for PaySera request
   */
  private generateSignature(encodedData: string): string {
    return crypto
      .createHash('md5')
      .update(encodedData + this.config.signPassword)
      .digest('hex');
  }

  /**
   * Verify callback signature from PaySera
   */
  public verifySignature(data: string, ss1: string): boolean {
    const expectedSignature = this.generateSignature(data);
    return expectedSignature === ss1;
  }

  /**
   * Create a payment URL for PaySera checkout
   */
  public async createPayment(request: PayseraPaymentRequest): Promise<PayseraPaymentResponse> {
    try {
      if (!this.config.projectId || !this.config.signPassword) {
        throw new Error('PaySera configuration missing. Please set PAYSERA_PROJECT_ID and PAYSERA_SIGN_PASSWORD');
      }

      // Build request parameters
      const params: Record<string, string> = {
        projectid: this.config.projectId,
        orderid: request.orderId,
        accepturl: this.config.acceptUrl + `?provider=paysera&order_id=${request.orderId}`,
        cancelurl: this.config.cancelUrl + `?provider=paysera&order_id=${request.orderId}`,
        callbackurl: this.config.callbackUrl,
        version: PAYSERA_API_VERSION,
        amount: String(request.amount), // Amount in cents
        currency: request.currency,
        country: request.country,
        test: process.env.NODE_ENV === 'production' ? '0' : '1',
        p_email: request.email,
        p_firstname: request.firstName || '',
        p_lastname: request.lastName || '',
        lang: this.mapLanguage(request.language || 'en'),
        paytext: request.description,
        // Custom metadata for webhook processing
        personcode: request.userId, // Using personcode to pass userId
        payment: 'card,wallet,bank', // Allow all payment methods
      };

      // Add metadata as encoded JSON in paytext
      const metadata = {
        userId: request.userId,
        productId: request.productId,
        planName: request.planName,
        planInterval: request.planInterval,
      };
      params.paytext = `${request.description} | META:${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

      // Encode parameters
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      const encodedData = this.base64UrlEncode(queryString);
      const signature = this.generateSignature(encodedData);

      // Build payment URL
      const paymentUrl = `${PAYSERA_API_URL}?data=${encodedData}&sign=${signature}`;

      console.log(`✅ PaySera payment URL created for order ${request.orderId}`);

      return {
        success: true,
        paymentUrl,
        orderId: request.orderId,
      };
    } catch (error: any) {
      console.error('❌ PaySera payment creation failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse and verify callback data from PaySera
   */
  public parseCallback(data: string, ss1: string): { valid: boolean; data?: PayseraCallbackData; metadata?: any } {
    try {
      // Verify signature
      if (!this.verifySignature(data, ss1)) {
        console.error('❌ PaySera callback signature verification failed');
        return { valid: false };
      }

      // Decode data
      const decodedData = this.base64UrlDecode(data);
      const params = new URLSearchParams(decodedData);

      const callbackData: PayseraCallbackData = {
        projectid: params.get('projectid') || '',
        orderid: params.get('orderid') || '',
        payamount: parseInt(params.get('payamount') || '0', 10),
        paycurrency: params.get('paycurrency') || 'EUR',
        status: parseInt(params.get('status') || '0', 10),
        requestid: params.get('requestid') || '',
        test: parseInt(params.get('test') || '0', 10),
        payment: params.get('payment') || '',
        country: params.get('country') || '',
        paytext: params.get('paytext') || '',
        name: params.get('name') || '',
        surename: params.get('surename') || '',
        payer: params.get('payer') || '',
      };

      // Extract metadata from paytext if present
      let metadata = null;
      const paytext = callbackData.paytext || '';
      const metaMatch = paytext.match(/META:([A-Za-z0-9+/=]+)/);
      if (metaMatch) {
        try {
          metadata = JSON.parse(Buffer.from(metaMatch[1], 'base64').toString('utf-8'));
        } catch {
          console.warn('Failed to parse PaySera metadata');
        }
      }

      console.log(`✅ PaySera callback parsed for order ${callbackData.orderid}, status: ${callbackData.status}`);

      return {
        valid: true,
        data: callbackData,
        metadata,
      };
    } catch (error: any) {
      console.error('❌ PaySera callback parsing failed:', error);
      return { valid: false };
    }
  }

  /**
   * Map language code to PaySera supported languages
   */
  private mapLanguage(lang: string): string {
    const languageMap: Record<string, string> = {
      en: 'ENG',
      sq: 'ENG', // Albanian - fallback to English
      bs: 'ENG', // Bosnian - fallback to English
      bg: 'ENG', // Bulgarian - fallback to English
      hr: 'ENG', // Croatian - fallback to English
      el: 'ENG', // Greek - fallback to English
      mk: 'ENG', // Macedonian - fallback to English
      me: 'ENG', // Montenegrin - fallback to English
      ro: 'ENG', // Romanian - fallback to English
      sr: 'ENG', // Serbian - fallback to English
      lt: 'LIT', // Lithuanian
      lv: 'LAV', // Latvian
      et: 'EST', // Estonian
      ru: 'RUS', // Russian
      pl: 'POL', // Polish
      de: 'GER', // German
    };
    return languageMap[lang.toLowerCase()] || 'ENG';
  }

  /**
   * Check if PaySera is configured
   */
  public isConfigured(): boolean {
    return !!(this.config.projectId && this.config.signPassword);
  }

  /**
   * Get supported countries for PaySera
   */
  public getSupportedCountries(): string[] {
    return ['RS', 'AL', 'BA', 'MK', 'ME', 'XK'];
  }

  /**
   * Check if a country is supported by PaySera (for our use case)
   */
  public isCountrySupported(countryCode: string): boolean {
    return this.getSupportedCountries().includes(countryCode.toUpperCase());
  }
}

// Export singleton instance
export const payseraService = new PayseraService();
export default payseraService;
