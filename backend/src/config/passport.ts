import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from 'passport-facebook';
// @ts-ignore - passport-apple doesn't have TypeScript definitions
import AppleStrategy from 'passport-apple';
import User from '../models/User';

// Track which strategies are enabled
export const oauthStrategies = {
  google: false,
  facebook: false,
  apple: false,
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

          if (user) {
            return done(null, user);
          }

          // Check if user exists with same email but different provider
          const existingUser = await User.findOne({ email: profile.emails?.[0]?.value });
          if (existingUser) {
            // Link the Google account to existing user
            existingUser.provider = 'google';
            existingUser.providerId = profile.id;
            existingUser.isEmailVerified = true;
            if (profile.photos?.[0]?.value && !existingUser.avatarUrl) {
              existingUser.avatarUrl = profile.photos[0].value;
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
            avatarUrl: profile.photos?.[0]?.value,
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

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  oauthStrategies.facebook = true;
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      },
      async (accessToken: string, refreshToken: string, profile: FacebookProfile, done: VerifyCallback) => {
        try {
          // Check if user already exists
          let user = await User.findOne({
            provider: 'facebook',
            providerId: profile.id
          });

          if (user) {
            return done(null, user);
          }

          // Check if user exists with same email but different provider
          const existingUser = await User.findOne({ email: profile.emails?.[0]?.value });
          if (existingUser) {
            // Link the Facebook account to existing user
            existingUser.provider = 'facebook';
            existingUser.providerId = profile.id;
            existingUser.isEmailVerified = true;
            if (profile.photos?.[0]?.value && !existingUser.avatarUrl) {
              existingUser.avatarUrl = profile.photos[0].value;
            }
            await existingUser.save();
            return done(null, existingUser);
          }

          // Create new user with initialized stats
          user = await User.create({
            email: profile.emails?.[0]?.value,
            name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 'User',
            provider: 'facebook',
            providerId: profile.id,
            isEmailVerified: true,
            avatarUrl: profile.photos?.[0]?.value,
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
