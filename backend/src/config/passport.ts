import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback } from 'passport-google-oauth20';
// @ts-ignore - passport-apple doesn't have TypeScript definitions
import AppleStrategy from 'passport-apple';
import User from '../models/User';

// Track which strategies are enabled
export const oauthStrategies = {
  google: false,
  apple: false,
};

// Helper function to get high-resolution Google profile picture
const getGoogleAvatarUrl = (photoUrl: string | undefined): string | undefined => {
  if (!photoUrl) return undefined;
  // Google URLs end with =s96-c (96px) by default. Replace with larger size.
  // Remove the size parameter to get the original, or set a larger size
  return photoUrl.replace(/=s\d+-c$/, '=s400-c');
};

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthStrategies.google = true;
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) => {
        try {
          // Check if user already exists
          let user = await User.findOne({
            provider: 'google',
            providerId: profile.id
          });

          // Get high-resolution avatar URL
          const avatarUrl = getGoogleAvatarUrl(profile.photos?.[0]?.value);

          if (user) {
            // Update avatar if user doesn't have one or if it's a Google URL (refresh it)
            if (avatarUrl && (!user.avatarUrl || user.avatarUrl.includes('googleusercontent.com'))) {
              user.avatarUrl = avatarUrl;
              await user.save();
            }
            return done(null, user);
          }

          // Check if user exists with same email but different provider
          const existingUser = await User.findOne({ email: profile.emails?.[0]?.value });
          if (existingUser) {
            // Link the Google account to existing user
            existingUser.provider = 'google';
            existingUser.providerId = profile.id;
            existingUser.isEmailVerified = true;
            if (avatarUrl && !existingUser.avatarUrl) {
              existingUser.avatarUrl = avatarUrl;
            }
            await existingUser.save();
            return done(null, existingUser);
          }

          // Create new user with initialized stats
          user = await User.create({
            email: profile.emails?.[0]?.value,
            name: profile.displayName || profile.name?.givenName || 'User',
            provider: 'google',
            providerId: profile.id,
            isEmailVerified: true,
            avatarUrl: avatarUrl,
            role: 'buyer',
            stats: {
              totalViews: 0,
              totalSaves: 0,
              totalInquiries: 0,
              propertiesSold: 0,
              totalSalesValue: 0,
              lastUpdated: new Date()
            }
          });

          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
}

// Apple OAuth Strategy
if (
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_PRIVATE_KEY_PATH
) {
  oauthStrategies.apple = true;
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/apple/callback`,
        scope: ['name', 'email'],
      },
      async (accessToken: any, refreshToken: any, idToken: any, profile: any, done: any) => {
        try {
          // Check if user already exists
          let user = await User.findOne({
            provider: 'apple',
            providerId: profile.id
          });

          if (user) {
            return done(null, user);
          }

          // Check if user exists with same email but different provider
          const existingUser = await User.findOne({ email: profile.email });
          if (existingUser) {
            // Link the Apple account to existing user
            existingUser.provider = 'apple';
            existingUser.providerId = profile.id;
            existingUser.isEmailVerified = true;
            await existingUser.save();
            return done(null, existingUser);
          }

          // Create new user with initialized stats
          user = await User.create({
            email: profile.email,
            name: `${profile.name?.firstName || ''} ${profile.name?.lastName || ''}`.trim() || 'User',
            provider: 'apple',
            providerId: profile.id,
            isEmailVerified: true,
            role: 'buyer',
            stats: {
              totalViews: 0,
              totalSaves: 0,
              totalInquiries: 0,
              propertiesSold: 0,
              totalSalesValue: 0,
              lastUpdated: new Date()
            }
          });

          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
}

// Serialize user for the session
passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
