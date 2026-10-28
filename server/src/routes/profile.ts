import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { upsertProfile, getProfileById } from '../firestore.js';

export const profileRouter = Router();

// In-memory fallback map for offline dev or environments where PostgreSQL is not running
const memoryProfiles = new Map<string, any>();

/**
 * Verify Google ID token via Google TokenInfo endpoint.
 * Falls back gracefully to the provided googleId/email if offline or tokeninfo is unavailable.
 */
async function verifyGoogleToken(idToken?: string): Promise<{ verified: boolean; email?: string; googleId?: string }> {
  if (!idToken) return { verified: false };
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      return {
        verified: true,
        email: data?.email,
        googleId: data?.sub,
      };
    }
  } catch (err) {
    // Network offline or endpoint unreachable - fallback gracefully
  }
  return { verified: false };
}

function mapRowToUserProfile(row: any): any {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarId: row.avatar_id || 'sultan',
    loginProvider: row.login_provider || 'GOOGLE',
    googleId: row.google_id || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    coins: Number(row.coins) || 0,
    gems: Number(row.gems) || 0,
    level: Number(row.level) || 1,
    xp: Number(row.xp) || 0,
    xpNextLevel: Number(row.xp_next_level) || 500,
    stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : (row.stats || {}),
    friendCode: row.friend_code,
    cloudSyncStatus: 'SYNCED',
    presenceStatus: row.presence_status || 'IN_LOBBY',
    lastSyncedAt: row.updated_at || new Date().toISOString(),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * POST /api/profile/google-auth
 * Authenticates with Google, checks if an existing cloud profile exists,
 * and returns it or registers a fresh profile.
 */
profileRouter.post('/google-auth', async (req: Request, res: Response) => {
  const { idToken, googleId, email, displayName, avatarUrl, localProfile } = req.body;

  if (!email && !googleId) {
    return res.status(400).json({ error: 'Email or Google ID is required' });
  }

  // Verify Google token with lightweight fallback
  let verifiedGoogleId = googleId;
  let verifiedEmail = email;

  if (idToken) {
    const verifyResult = await verifyGoogleToken(idToken);
    if (verifyResult.verified) {
      verifiedGoogleId = verifyResult.googleId || verifiedGoogleId;
      verifiedEmail = verifyResult.email || verifiedEmail;
    }
  }

  const lookupKey = verifiedGoogleId || verifiedEmail;

  try {
    // 1. Try querying PostgreSQL
    const existing = await query(
      `SELECT * FROM profiles 
       WHERE (google_id = $1 AND $1 IS NOT NULL) 
          OR (email = $2 AND $2 IS NOT NULL)
       LIMIT 1`,
      [verifiedGoogleId || null, verifiedEmail || null]
    );

    if (existing && existing.rows && existing.rows.length > 0) {
      const cloudProfile = mapRowToUserProfile(existing.rows[0]);
      await upsertProfile({
        id: cloudProfile.id,
        display_name: cloudProfile.displayName,
        avatar_id: cloudProfile.avatarId,
        friend_code: cloudProfile.friendCode,
        level: cloudProfile.level,
        coins: cloudProfile.coins,
        gems: cloudProfile.gems,
        login_provider: cloudProfile.loginProvider,
        stats: cloudProfile.stats,
      }).catch(() => {});
      return res.json({
        exists: true,
        profile: cloudProfile,
        message: 'Existing cloud profile found.',
      });
    }

    // 2. Not found in DB: create new profile
    const startingCoins = Number(localProfile?.coins) || 10000;
    const startingGems = Number(localProfile?.gems) || 50;
    const startingLevel = Number(localProfile?.level) || 1;
    const startingXp = Number(localProfile?.xp) || 0;
    const startingStats = JSON.stringify(localProfile?.stats || {
      gamesPlayed: 0,
      gamesWon: 0,
      winStreak: 0,
      bestWinStreak: 0,
      totalGins: 0,
      thousandPointRuns: 0,
      totalPointsScored: 0,
    });
    const finalDisplayName = displayName || localProfile?.displayName || 'Player';
    const friendCode = localProfile?.friendCode && localProfile.friendCode.startsWith('HLH-')
      ? localProfile.friendCode
      : `HLH-${Math.floor(10000 + Math.random() * 90000)}`;

    const insertRes = await query(
      `INSERT INTO profiles 
        (display_name, avatar_id, login_provider, google_id, email, coins, gems, level, xp, stats, friend_code)
       VALUES ($1, $2, 'GOOGLE', $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        finalDisplayName,
        localProfile?.avatarId || 'sultan',
        verifiedGoogleId || null,
        verifiedEmail || null,
        startingCoins,
        startingGems,
        startingLevel,
        startingXp,
        startingStats,
        friendCode,
      ]
    );

    const newProfile = mapRowToUserProfile(insertRes.rows[0]);
    await upsertProfile({
      id: newProfile.id,
      display_name: newProfile.displayName,
      avatar_id: newProfile.avatarId,
      friend_code: newProfile.friendCode,
      level: newProfile.level,
      coins: newProfile.coins,
      gems: newProfile.gems,
      login_provider: newProfile.loginProvider,
      stats: newProfile.stats,
    }).catch(() => {});
    return res.json({
      exists: false,
      profile: newProfile,
      message: 'New cloud profile registered.',
    });
  } catch (err: any) {
    // Fallback to in-memory store if DB is unavailable
    console.warn('[Profile Route] Database query failed, using in-memory adapter:', err.message);

    if (memoryProfiles.has(lookupKey)) {
      const p = memoryProfiles.get(lookupKey);
      await upsertProfile({
        id: p.id,
        display_name: p.displayName,
        avatar_id: p.avatarId,
        friend_code: p.friendCode,
        level: p.level,
        coins: p.coins,
        gems: p.gems,
        login_provider: p.loginProvider,
        stats: p.stats,
      }).catch(() => {});
      return res.json({
        exists: true,
        profile: p,
        message: 'Existing profile retrieved from memory adapter.',
      });
    }

    const memoryProfile = {
      id: `usr_${Date.now().toString(36)}`,
      displayName: displayName || localProfile?.displayName || 'Player',
      avatarId: localProfile?.avatarId || 'sultan',
      loginProvider: 'GOOGLE',
      googleId: verifiedGoogleId,
      email: verifiedEmail,
      coins: Number(localProfile?.coins) || 10000,
      gems: Number(localProfile?.gems) || 50,
      level: Number(localProfile?.level) || 1,
      xp: Number(localProfile?.xp) || 0,
      xpNextLevel: 500,
      stats: localProfile?.stats || {
        gamesPlayed: 0,
        gamesWon: 0,
        winStreak: 0,
        bestWinStreak: 0,
        totalGins: 0,
        thousandPointRuns: 0,
        totalPointsScored: 0,
      },
      friendCode: localProfile?.friendCode || `HLH-${Math.floor(10000 + Math.random() * 90000)}`,
      cloudSyncStatus: 'SYNCED',
      presenceStatus: 'IN_LOBBY',
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    memoryProfiles.set(lookupKey, memoryProfile);
    await upsertProfile({
      id: memoryProfile.id,
      display_name: memoryProfile.displayName,
      avatar_id: memoryProfile.avatarId,
      friend_code: memoryProfile.friendCode,
      level: memoryProfile.level,
      coins: memoryProfile.coins,
      gems: memoryProfile.gems,
      login_provider: memoryProfile.loginProvider,
      stats: memoryProfile.stats,
    }).catch(() => {});
    return res.json({
      exists: false,
      profile: memoryProfile,
      message: 'New profile created in memory adapter.',
    });
  }
});

/**
 * POST /api/profile/register
 * Registers or updates any profile (Guest or Authenticated) in Firestore.
 * Guarantees friendCode is immediately discoverable.
 */
profileRouter.post('/register', async (req: Request, res: Response) => {
  const { profile } = req.body;
  if (!profile || !profile.id) {
    return res.status(400).json({ error: 'Valid profile with id is required' });
  }

  try {
    await upsertProfile({
      id: profile.id,
      display_name: profile.displayName || 'Player',
      avatar_id: profile.avatarId || 'sultan',
      friend_code: profile.friendCode || '',
      level: Number(profile.level) || 1,
      coins: Number(profile.coins) || 0,
      gems: Number(profile.gems) || 0,
      login_provider: profile.loginProvider || 'GUEST',
      stats: profile.stats || {},
      presence_status: profile.presenceStatus || 'IN_LOBBY',
    });

    return res.json({ success: true, message: 'Profile registered successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/profile/sync
 * Flushes active progression, coins, stats to PostgreSQL and Google Cloud Firestore.
 */
profileRouter.post('/sync', async (req: Request, res: Response) => {
  const { profile } = req.body;

  if (!profile) {
    return res.status(400).json({ error: 'Profile is required' });
  }

  const lookupKey = profile.googleId || profile.email || profile.id;

  // 1. Always persist to Google Cloud Firestore
  try {
    await upsertProfile({
      id: profile.id,
      display_name: profile.displayName,
      avatar_id: profile.avatarId,
      friend_code: profile.friendCode,
      level: profile.level,
      coins: profile.coins,
      gems: profile.gems,
      login_provider: profile.loginProvider,
      stats: profile.stats,
      presence_status: profile.presenceStatus || 'IN_LOBBY',
    });
  } catch (fsErr: any) {
    console.warn('[Profile Route] Firestore sync warning:', fsErr.message);
  }

  try {
    const statsJson = JSON.stringify(profile.stats || {});
    await query(
      `UPDATE profiles SET
        display_name = $1,
        avatar_id = $2,
        coins = $3,
        gems = $4,
        level = $5,
        xp = $6,
        xp_next_level = $7,
        stats = $8,
        friend_code = $9,
        updated_at = NOW()
       WHERE (google_id = $10 AND $10 IS NOT NULL)
          OR (email = $11 AND $11 IS NOT NULL)
          OR (id::text = $12)`,
      [
        profile.displayName,
        profile.avatarId || 'sultan',
        Number(profile.coins) || 0,
        Number(profile.gems) || 0,
        Number(profile.level) || 1,
        Number(profile.xp) || 0,
        Number(profile.xpNextLevel) || 500,
        statsJson,
        profile.friendCode,
        profile.googleId || null,
        profile.email || null,
        profile.id,
      ]
    );

    return res.json({
      success: true,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    // Save to memory adapter if DB unavailable
    memoryProfiles.set(lookupKey, {
      ...profile,
      lastSyncedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      fallback: true,
    });
  }
});

/**
 * POST /api/profile/resolve-conflict
 * Applies player's choice between Cloud Save and Local Save.
 */
profileRouter.post('/resolve-conflict', async (req: Request, res: Response) => {
  const { choice, mergeChips, cloudProfile, localProfile } = req.body;

  if (!cloudProfile || !localProfile) {
    return res.status(400).json({ error: 'Both cloudProfile and localProfile are required' });
  }

  let finalProfile: any;

  if (choice === 'cloud') {
    finalProfile = { ...cloudProfile };
    if (mergeChips) {
      finalProfile.coins = Number(cloudProfile.coins || 0) + Number(localProfile.coins || 0);
      finalProfile.gems = Number(cloudProfile.gems || 0) + Number(localProfile.gems || 0);
      finalProfile.level = Math.max(Number(cloudProfile.level) || 1, Number(localProfile.level) || 1);
    }
  } else {
    // Keep local profile, attaching the verified Google credentials
    finalProfile = {
      ...localProfile,
      loginProvider: 'GOOGLE',
      googleId: cloudProfile.googleId || localProfile.googleId,
      email: cloudProfile.email || localProfile.email,
    };
  }

  finalProfile.cloudSyncStatus = 'SYNCED';
  finalProfile.lastSyncedAt = new Date().toISOString();

  // Sync chosen profile to DB
  try {
    const statsJson = JSON.stringify(finalProfile.stats || {});
    await query(
      `UPDATE profiles SET
        display_name = $1,
        avatar_id = $2,
        coins = $3,
        gems = $4,
        level = $5,
        xp = $6,
        xp_next_level = $7,
        stats = $8,
        friend_code = $9,
        updated_at = NOW()
       WHERE (google_id = $10 AND $10 IS NOT NULL)
          OR (email = $11 AND $11 IS NOT NULL)
          OR (id::text = $12)`,
      [
        finalProfile.displayName,
        finalProfile.avatarId || 'sultan',
        Number(finalProfile.coins) || 0,
        Number(finalProfile.gems) || 0,
        Number(finalProfile.level) || 1,
        Number(finalProfile.xp) || 0,
        Number(finalProfile.xpNextLevel) || 500,
        statsJson,
        finalProfile.friendCode,
        finalProfile.googleId || null,
        finalProfile.email || null,
        finalProfile.id,
      ]
    );
  } catch (err: any) {
    const key = finalProfile.googleId || finalProfile.email || finalProfile.id;
    memoryProfiles.set(key, finalProfile);
  }

  return res.json({
    success: true,
    profile: finalProfile,
  });
});
