/**
 * Security Tests: JWT Token Type Enforcement
 * Verifies that access/refresh tokens are properly typed and
 * cross-use is prevented.
 */

// Set env vars before importing modules that read them at load time
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';

import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyToken,
  decodeToken,
} from '../utils/jwt';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

describe('JWT Token Type Enforcement', () => {
  const userId = '507f1f77bcf86cd799439011';

  describe('generateAccessToken', () => {
    it('should include type=access in payload', () => {
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token) as any;

      expect(decoded.type).toBe('access');
      expect(decoded.id).toBe(userId);
    });
  });

  describe('generateRefreshToken', () => {
    it('should include type=refresh in payload', () => {
      const token = generateRefreshToken(userId);
      const decoded = jwt.decode(token) as any;

      expect(decoded.type).toBe('refresh');
      expect(decoded.id).toBe(userId);
    });

    it('should include a unique tokenId for revocation', () => {
      const token = generateRefreshToken(userId);
      const decoded = jwt.decode(token) as any;

      expect(decoded.tokenId).toBeDefined();
      expect(typeof decoded.tokenId).toBe('string');
      expect(decoded.tokenId.length).toBeGreaterThan(0);
    });

    it('should generate unique tokenIds for each call', () => {
      const token1 = generateRefreshToken(userId);
      const token2 = generateRefreshToken(userId);
      const decoded1 = jwt.decode(token1) as any;
      const decoded2 = jwt.decode(token2) as any;

      expect(decoded1.tokenId).not.toBe(decoded2.tokenId);
    });
  });

  describe('verifyAccessToken', () => {
    it('should accept a valid access token', () => {
      const token = generateAccessToken(userId);
      const decoded = verifyAccessToken(token);

      expect(decoded.id).toBe(userId);
      expect(decoded.type).toBe('access');
    });

    it('should reject a refresh token', () => {
      const token = generateRefreshToken(userId);

      // Refresh tokens use JWT_REFRESH_SECRET, so verification with JWT_SECRET should fail
      // OR if secrets match, the type check should reject it
      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should reject an expired token', () => {
      const token = jwt.sign(
        { id: userId, type: 'access' },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should accept a valid refresh token', () => {
      const token = generateRefreshToken(userId);
      const decoded = verifyRefreshToken(token);

      expect(decoded.id).toBe(userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should reject an access token', () => {
      const token = generateAccessToken(userId);

      // Access tokens use JWT_SECRET, verification with JWT_REFRESH_SECRET should fail
      // OR if secrets match, the type check should reject it
      expect(() => verifyRefreshToken(token)).toThrow();
    });
  });

  describe('verifyToken (legacy)', () => {
    it('should accept an access token', () => {
      const token = generateAccessToken(userId);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(userId);
    });

    it('should accept a legacy token without type field', () => {
      const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(userId);
    });

    it('should reject a refresh token even via the legacy path', () => {
      // Craft a token with type=refresh but signed with the access secret
      const fakeRefresh = jwt.sign(
        { id: userId, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      expect(() => verifyToken(fakeRefresh)).toThrow(/refresh tokens cannot be used/i);
    });
  });

  describe('decodeToken', () => {
    it('should decode without verification', () => {
      const token = generateAccessToken(userId);
      const decoded = decodeToken(token);

      expect(decoded.id).toBe(userId);
      expect(decoded.type).toBe('access');
    });

    it('should decode even an expired token', () => {
      const token = jwt.sign(
        { id: userId, type: 'access' },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      const decoded = decodeToken(token);
      expect(decoded.id).toBe(userId);
    });
  });
});
