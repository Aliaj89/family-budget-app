const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { User } = require('../models');

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/spreadsheets']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        // Update tokens if user exists
        user.accessToken = accessToken;
        user.refreshToken = refreshToken || user.refreshToken; // Only update if provided
        await user.save();
        return done(null, user);
      }
      
      // Create new user if doesn't exist
      user = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0].value,
        accessToken,
        refreshToken
      });
      
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Configure JWT Strategy for API authentication
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.userId);
    
    if (!user) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
}));

// Extract JWT from cookies as well (for web app)
passport.use('jwt-cookie', new JwtStrategy({
  jwtFromRequest: (req) => {
    let token = null;
    if (req && req.cookies) {
      token = req.cookies['token'];
    }
    return token;
  },
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.userId);
    
    if (!user) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
}));

// Serialize user to store in the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
