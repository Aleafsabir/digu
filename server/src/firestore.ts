import { Firestore, FieldValue } from '@google-cloud/firestore';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'holhuashi-digu';

let firestoreInstance: Firestore | null = null;
let isFirestoreAvailable = false;

// Initialize Firestore with graceful fallback
try {
  firestoreInstance = new Firestore({
    projectId,
    databaseId: '(default)',
  });
  isFirestoreAvailable = true;
  console.log(`[Firestore] Initialized client for project: ${projectId}`);
} catch (err: any) {
  console.warn(`[Firestore] Could not initialize Firestore: ${err.message}. Using in-memory fallback.`);
  isFirestoreAvailable = false;
}

export function getFirestore(): Firestore | null {
  return firestoreInstance;
}

export async function checkFirestoreHealth(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  if (!firestoreInstance) {
    return { connected: false, error: 'Firestore client not initialized' };
  }
  const start = Date.now();
  try {
    // Light read test on metadata collection
    await firestoreInstance.collection('system').doc('healthcheck').set(
      { lastPing: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { connected: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}

// ============================================================================
// PROFILES & FRIEND CODE INDEX
// ============================================================================

export interface StoredProfile {
  id: string;
  display_name: string;
  username?: string;
  username_lower?: string;
  avatar_id: string;
  friend_code: string;
  google_id?: string;
  email?: string;
  level: number;
  coins?: number;
  gems?: number;
  presence_status: string;
  current_match_info?: any;
  last_active_at: string;
  login_provider?: string;
  stats?: any;
  updated_at?: string;
}

export function normalizeHandle(raw: string): { username: string; usernameLower: string } | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^@+/, '');
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) return null;
  return {
    username: trimmed,
    usernameLower: trimmed.toLowerCase(),
  };
}

/**
 * Normalizes friend code to standard uppercase with HLH- prefix handling
 * while preserving both numeric (HLH-95257) and alphanumeric (HLH-84K2M) codes.
 */
export function normalizeFriendCode(code: string): string {
  if (!code) return '';
  const clean = code.trim().toUpperCase();
  if (clean.startsWith('HLH-')) {
    const suffix = clean.slice(4).replace(/[^A-Z0-9]/g, '');
    return suffix ? `HLH-${suffix}` : clean;
  }
  const stripped = clean.replace(/[^A-Z0-9]/g, '');
  if (/^[0-9]{4,10}$/.test(stripped) || /^[A-Z0-9]{4,8}$/.test(stripped)) {
    return `HLH-${stripped}`;
  }
  return clean;
}

/**
 * Upserts a player profile into Firestore and maintains O(1) friend_codes & handles indexes.
 */
export async function upsertProfile(profile: Partial<StoredProfile> & { id: string }): Promise<void> {
  const friendCode = normalizeFriendCode(profile.friend_code || '');
  const now = new Date().toISOString();
  const parsedHandle = profile.username ? normalizeHandle(profile.username) : null;

  const docData: Record<string, any> = {
    id: profile.id,
    display_name: profile.display_name || 'Player',
    avatar_id: profile.avatar_id || 'sultan',
    friend_code: friendCode,
    level: Number(profile.level) || 1,
    presence_status: profile.presence_status || 'IN_LOBBY',
    last_active_at: now,
    updated_at: now,
  };

  if (parsedHandle) {
    docData.username = parsedHandle.username;
    docData.username_lower = parsedHandle.usernameLower;
  }
  if (profile.google_id) docData.google_id = profile.google_id;
  if (profile.email) docData.email = profile.email;
  if (profile.coins !== undefined) docData.coins = Number(profile.coins);
  if (profile.gems !== undefined) docData.gems = Number(profile.gems);
  if (profile.login_provider) docData.login_provider = profile.login_provider;
  if (profile.stats) docData.stats = profile.stats;
  if (profile.current_match_info !== undefined) docData.current_match_info = profile.current_match_info;

  if (firestoreInstance) {
    try {
      // 1. Save Profile document
      await firestoreInstance.collection('profiles').doc(profile.id).set(docData, { merge: true });

      // 2. Maintain Fast Friend Code Index
      if (friendCode) {
        await firestoreInstance.collection('friend_codes').doc(friendCode).set({
          friendCode,
          profileId: profile.id,
          displayName: docData.display_name,
          avatarId: docData.avatar_id,
          level: docData.level,
          updatedAt: now,
        }, { merge: true });

        // Also index suffix without HLH- prefix for ultra-friendly matching
        const suffix = friendCode.replace(/^HLH-/, '');
        if (suffix && suffix !== friendCode) {
          await firestoreInstance.collection('friend_codes').doc(suffix).set({
            friendCode,
            profileId: profile.id,
            displayName: docData.display_name,
            avatarId: docData.avatar_id,
            level: docData.level,
            updatedAt: now,
          }, { merge: true });
        }
      }

      // 3. Maintain Fast Handle Index if provided and unowned by another user
      if (parsedHandle) {
        const handleRef = firestoreInstance.collection('handles').doc(parsedHandle.usernameLower);
        const existing = await handleRef.get();
        if (!existing.exists || existing.data()?.profileId === profile.id) {
          await handleRef.set({
            username: parsedHandle.username,
            usernameLower: parsedHandle.usernameLower,
            profileId: profile.id,
            updatedAt: now,
          }, { merge: true });
        }
      }
    } catch (err: any) {
      console.warn(`[Firestore] Failed to upsert profile ${profile.id}:`, err.message);
    }
  }
}

/**
 * Checks whether a normalized handle is free (or already owned by excludeProfileId).
 */
export async function isHandleAvailableInFirestore(
  usernameLower: string,
  excludeProfileId?: string
): Promise<boolean> {
  if (!firestoreInstance) return true;
  try {
    const doc = await firestoreInstance.collection('handles').doc(usernameLower).get();
    if (!doc.exists) return true;
    return Boolean(excludeProfileId && doc.data()?.profileId === excludeProfileId);
  } catch (err: any) {
    console.warn(`[Firestore] isHandleAvailable error:`, err.message);
    return true;
  }
}

/**
 * Atomically claims a unique @handle for a profile in Firestore, releasing any previous handle.
 */
export async function updateProfileHandle(
  profileId: string,
  rawHandle: string
): Promise<{ ok: boolean; username?: string; usernameLower?: string; error?: string }> {
  const parsed = normalizeHandle(rawHandle);
  if (!parsed) {
    return {
      ok: false,
      error: 'Handle must be 3-20 characters using letters, numbers, or underscores.',
    };
  }

  if (!firestoreInstance) {
    return { ok: true, username: parsed.username, usernameLower: parsed.usernameLower };
  }

  try {
    const now = new Date().toISOString();
    const profileRef = firestoreInstance.collection('profiles').doc(profileId);
    const newHandleRef = firestoreInstance.collection('handles').doc(parsed.usernameLower);

    const outcome = await firestoreInstance.runTransaction(async (tx) => {
      const [profileSnap, handleSnap] = await Promise.all([
        tx.get(profileRef),
        tx.get(newHandleRef),
      ]);

      if (handleSnap.exists && handleSnap.data()?.profileId !== profileId) {
        return { ok: false, error: 'HANDLE_TAKEN' };
      }

      const oldLower = (profileSnap.data()?.username_lower as string | undefined)?.toLowerCase();
      if (oldLower && oldLower !== parsed.usernameLower) {
        const oldHandleRef = firestoreInstance.collection('handles').doc(oldLower);
        const oldSnap = await tx.get(oldHandleRef);
        if (oldSnap.exists && oldSnap.data()?.profileId === profileId) {
          tx.delete(oldHandleRef);
        }
      }

      tx.set(newHandleRef, {
        username: parsed.username,
        usernameLower: parsed.usernameLower,
        profileId,
        updatedAt: now,
      });

      tx.set(profileRef, {
        id: profileId,
        username: parsed.username,
        username_lower: parsed.usernameLower,
        updated_at: now,
      }, { merge: true });

      return { ok: true, username: parsed.username, usernameLower: parsed.usernameLower };
    });

    return outcome;
  } catch (err: any) {
    console.warn(`[Firestore] updateProfileHandle error for ${profileId}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Retrieves a player profile by their @handle (case-insensitive).
 */
export async function getProfileByHandle(inputHandle: string): Promise<StoredProfile | null> {
  if (!inputHandle || !firestoreInstance) return null;
  const cleaned = inputHandle.trim().replace(/^@+/, '').toLowerCase();
  if (!cleaned) return null;

  try {
    const handleDoc = await firestoreInstance.collection('handles').doc(cleaned).get();
    if (handleDoc.exists) {
      const pid = handleDoc.data()?.profileId;
      if (pid) {
        const profile = await getProfileById(pid);
        if (profile) return profile;
      }
    }

    const snap = await firestoreInstance
      .collection('profiles')
      .where('username_lower', '==', cleaned)
      .limit(1)
      .get();
    if (!snap.empty) {
      return snap.docs[0].data() as StoredProfile;
    }
  } catch (err: any) {
    console.warn(`[Firestore] getProfileByHandle error for ${inputHandle}:`, err.message);
  }
  return null;
}

/**
 * Retrieves a player profile by their Friend Code (using the O(1) index).
 */
export async function getProfileByFriendCode(inputCode: string): Promise<StoredProfile | null> {
  if (!inputCode) return null;
  const cleanCode = inputCode.trim().toUpperCase();
  const suffix = cleanCode.startsWith('HLH-')
    ? cleanCode.slice(4).replace(/[^A-Z0-9]/g, '')
    : cleanCode.replace(/[^A-Z0-9]/g, '');
  const standardCode = suffix ? `HLH-${suffix}` : cleanCode;

  if (firestoreInstance) {
    try {
      // Check standard code index
      let indexDoc = await firestoreInstance.collection('friend_codes').doc(standardCode).get();
      if (!indexDoc.exists && suffix) {
        indexDoc = await firestoreInstance.collection('friend_codes').doc(suffix).get();
      }
      if (!indexDoc.exists && cleanCode !== standardCode) {
        indexDoc = await firestoreInstance.collection('friend_codes').doc(cleanCode).get();
      }

      if (indexDoc.exists) {
        const indexData = indexDoc.data();
        if (indexData?.profileId) {
          const profileDoc = await firestoreInstance.collection('profiles').doc(indexData.profileId).get();
          if (profileDoc.exists) {
            return profileDoc.data() as StoredProfile;
          }
        }
      }

      // Fallback query if index wasn't populated
      const candidates = Array.from(new Set([standardCode, cleanCode, suffix].filter(Boolean)));
      if (candidates.length > 0) {
        const snap = await firestoreInstance
          .collection('profiles')
          .where('friend_code', 'in', candidates)
          .limit(1)
          .get();

        if (!snap.empty) {
          return snap.docs[0].data() as StoredProfile;
        }
      }
    } catch (err: any) {
      console.warn(`[Firestore] Failed to find profile by code ${inputCode}:`, err.message);
    }
  }

  return null;
}

/**
 * Retrieves a player profile by UID.
 */
export async function getProfileById(profileId: string): Promise<StoredProfile | null> {
  if (!profileId || !firestoreInstance) return null;
  try {
    const doc = await firestoreInstance.collection('profiles').doc(profileId).get();
    return doc.exists ? (doc.data() as StoredProfile) : null;
  } catch (err: any) {
    console.warn(`[Firestore] getProfileById error for ${profileId}:`, err.message);
    return null;
  }
}

/**
 * Looks up a stored profile in Firestore by google_id or email.
 */
export async function getProfileByGoogleOrEmail(
  googleId?: string,
  email?: string
): Promise<StoredProfile | null> {
  if (!firestoreInstance) return null;
  try {
    if (googleId) {
      const snap = await firestoreInstance
        .collection('profiles')
        .where('google_id', '==', googleId)
        .limit(1)
        .get();
      if (!snap.empty) return snap.docs[0].data() as StoredProfile;
    }
    if (email) {
      const snap = await firestoreInstance
        .collection('profiles')
        .where('email', '==', email)
        .limit(1)
        .get();
      if (!snap.empty) return snap.docs[0].data() as StoredProfile;
    }
  } catch (err: any) {
    console.warn('[Firestore] getProfileByGoogleOrEmail error:', err.message);
  }
  return null;
}

// ============================================================================
// FRIENDSHIPS & REQUESTS
// ============================================================================

export interface StoredFriendship {
  id: string;
  user_id: string;
  friend_id: string;
  sender_id: string;
  status: 'PENDING' | 'ACCEPTED';
  created_at: string;
  updated_at?: string;
}

/**
 * Creates or retrieves a friend request.
 */
export async function createFriendRequest(senderId: string, receiverId: string): Promise<StoredFriendship | null> {
  const friendshipId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const record: StoredFriendship = {
    id: friendshipId,
    user_id: senderId,
    friend_id: receiverId,
    sender_id: senderId,
    status: 'PENDING',
    created_at: now,
    updated_at: now,
  };

  if (firestoreInstance) {
    try {
      // Check if already friends or pending
      const existingSnap = await firestoreInstance
        .collection('friendships')
        .where('user_id', 'in', [senderId, receiverId])
        .get();

      for (const d of existingSnap.docs) {
        const data = d.data() as StoredFriendship;
        if (
          (data.user_id === senderId && data.friend_id === receiverId) ||
          (data.user_id === receiverId && data.friend_id === senderId)
        ) {
          return data; // Existing request or friendship
        }
      }

      await firestoreInstance.collection('friendships').doc(friendshipId).set(record);
      return record;
    } catch (err: any) {
      console.warn('[Firestore] Failed to create friendship:', err.message);
    }
  }

  return record;
}

/**
 * Fetches accepted friends for a profile.
 */
export async function getAcceptedFriends(profileId: string): Promise<any[]> {
  if (!profileId || !firestoreInstance) return [];

  try {
    const friendsList: any[] = [];
    const q1 = await firestoreInstance.collection('friendships')
      .where('user_id', '==', profileId)
      .where('status', '==', 'ACCEPTED')
      .get();

    const q2 = await firestoreInstance.collection('friendships')
      .where('friend_id', '==', profileId)
      .where('status', '==', 'ACCEPTED')
      .get();

    const friendIds = new Set<string>();
    const friendshipMap = new Map<string, any>();

    for (const doc of [...q1.docs, ...q2.docs]) {
      const data = doc.data() as StoredFriendship;
      const otherId = data.user_id === profileId ? data.friend_id : data.user_id;
      friendIds.add(otherId);
      friendshipMap.set(otherId, {
        friendshipId: data.id,
        friendsSince: data.created_at,
      });
    }

    for (const friendId of friendIds) {
      const p = await getProfileById(friendId);
      if (p) {
        const meta = friendshipMap.get(friendId);
        friendsList.push({
          friendshipId: meta?.friendshipId || friendId,
          friendsSince: meta?.friendsSince || new Date().toISOString(),
          friendId: p.id,
          displayName: p.display_name,
          username: p.username || '',
          avatarId: p.avatar_id,
          level: p.level,
          friendCode: p.friend_code,
          presenceStatus: p.presence_status || 'OFFLINE',
          currentMatchInfo: p.current_match_info,
          lastActiveAt: p.last_active_at,
        });
      }
    }

    return friendsList;
  } catch (err: any) {
    console.warn('[Firestore] getAcceptedFriends error:', err.message);
    return [];
  }
}

/**
 * Fetches pending incoming and outgoing requests for a profile.
 */
export async function getFriendRequests(profileId: string): Promise<{ incoming: any[]; outgoing: any[] }> {
  if (!profileId || !firestoreInstance) return { incoming: [], outgoing: [] };

  try {
    const incomingSnap = await firestoreInstance.collection('friendships')
      .where('friend_id', '==', profileId)
      .where('status', '==', 'PENDING')
      .get();

    const outgoingSnap = await firestoreInstance.collection('friendships')
      .where('user_id', '==', profileId)
      .where('status', '==', 'PENDING')
      .get();

    const incoming: any[] = [];
    for (const doc of incomingSnap.docs) {
      const data = doc.data() as StoredFriendship;
      const sender = await getProfileById(data.sender_id);
      incoming.push({
        requestId: data.id,
        createdAt: data.created_at,
        senderId: data.sender_id,
        displayName: sender?.display_name || 'Player',
        username: sender?.username || '',
        avatarId: sender?.avatar_id || 'sultan',
        level: sender?.level || 1,
        friendCode: sender?.friend_code || '',
      });
    }

    const outgoing: any[] = [];
    for (const doc of outgoingSnap.docs) {
      const data = doc.data() as StoredFriendship;
      const receiver = await getProfileById(data.friend_id);
      outgoing.push({
        requestId: data.id,
        createdAt: data.created_at,
        receiverId: data.friend_id,
        displayName: receiver?.display_name || 'Player',
        username: receiver?.username || '',
        avatarId: receiver?.avatar_id || 'sultan',
        level: receiver?.level || 1,
        friendCode: receiver?.friend_code || '',
      });
    }

    return { incoming, outgoing };
  } catch (err: any) {
    console.warn('[Firestore] getFriendRequests error:', err.message);
    return { incoming: [], outgoing: [] };
  }
}

/**
 * Accepts or declines a friend request.
 */
export async function respondToRequest(requestId: string, accept: boolean): Promise<boolean> {
  if (!requestId || !firestoreInstance) return false;
  try {
    if (accept) {
      await firestoreInstance.collection('friendships').doc(requestId).update({
        status: 'ACCEPTED',
        updated_at: new Date().toISOString(),
      });
    } else {
      await firestoreInstance.collection('friendships').doc(requestId).delete();
    }
    return true;
  } catch (err: any) {
    console.warn(`[Firestore] respondToRequest error for ${requestId}:`, err.message);
    return false;
  }
}

/**
 * Cancels an outgoing pending friend request owned by senderId.
 */
export async function cancelFriendRequest(requestId: string, senderId: string): Promise<boolean> {
  if (!requestId || !senderId || !firestoreInstance) return false;
  try {
    const docRef = firestoreInstance.collection('friendships').doc(requestId);
    const snap = await docRef.get();
    if (!snap.exists) return false;
    const data = snap.data() as StoredFriendship;
    if (data.status !== 'PENDING' || data.sender_id !== senderId) {
      return false;
    }
    await docRef.delete();
    return true;
  } catch (err: any) {
    console.warn(`[Firestore] cancelFriendRequest error for ${requestId}:`, err.message);
    return false;
  }
}

/**
 * Removes an accepted (or pending) friendship between profileId and friendId.
 */
export async function removeFriendship(profileId: string, friendId: string): Promise<boolean> {
  if (!profileId || !friendId || !firestoreInstance) return false;
  try {
    const q1 = await firestoreInstance.collection('friendships')
      .where('user_id', '==', profileId)
      .where('friend_id', '==', friendId)
      .get();
    const q2 = await firestoreInstance.collection('friendships')
      .where('user_id', '==', friendId)
      .where('friend_id', '==', profileId)
      .get();

    const docs = [...q1.docs, ...q2.docs];
    if (docs.length === 0) return false;
    await Promise.all(docs.map((d) => d.ref.delete()));
    return true;
  } catch (err: any) {
    console.warn(`[Firestore] removeFriendship error for ${profileId} <-> ${friendId}:`, err.message);
    return false;
  }
}

// ============================================================================
// MATCH INVITATIONS
// ============================================================================

export interface StoredMatchInvitation {
  id: string;
  sender_id: string;
  receiver_id: string;
  room_code: string;
  mode: string;
  format?: string;
  stake: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
  updated_at?: string;
}

export async function saveMatchInvitation(invitation: StoredMatchInvitation): Promise<void> {
  if (!invitation?.id || !firestoreInstance) return;
  try {
    await firestoreInstance.collection('match_invitations').doc(invitation.id).set({
      ...invitation,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn(`[Firestore] saveMatchInvitation error for ${invitation.id}:`, err.message);
  }
}

export async function getMatchInvitation(invitationId: string): Promise<StoredMatchInvitation | null> {
  if (!invitationId || !firestoreInstance) return null;
  try {
    const doc = await firestoreInstance.collection('match_invitations').doc(invitationId).get();
    return doc.exists ? (doc.data() as StoredMatchInvitation) : null;
  } catch (err: any) {
    console.warn(`[Firestore] getMatchInvitation error for ${invitationId}:`, err.message);
    return null;
  }
}

export async function updateMatchInvitationStatus(
  invitationId: string,
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
): Promise<void> {
  if (!invitationId || !firestoreInstance) return;
  try {
    await firestoreInstance.collection('match_invitations').doc(invitationId).set({
      status,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn(`[Firestore] updateMatchInvitationStatus error for ${invitationId}:`, err.message);
  }
}

// ============================================================================
// ROOMS PERSISTENCE
// ============================================================================

export async function saveRoom(room: any): Promise<void> {
  if (!room?.id || !firestoreInstance) return;
  try {
    await firestoreInstance.collection('rooms').doc(room.id).set({
      ...room,
      updated_at: new Date().toISOString(),
    }, { merge: true });

    if (room.roomCode) {
      await firestoreInstance.collection('room_codes').doc(String(room.roomCode)).set({
        roomId: room.id,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err: any) {
    console.warn(`[Firestore] Failed to save room ${room.id}:`, err.message);
  }
}

export async function getRoomByCode(roomCode: string): Promise<any | null> {
  if (!roomCode || !firestoreInstance) return null;
  try {
    const codeDoc = await firestoreInstance.collection('room_codes').doc(String(roomCode)).get();
    if (codeDoc.exists) {
      const roomId = codeDoc.data()?.roomId;
      if (roomId) {
        const roomDoc = await firestoreInstance.collection('rooms').doc(roomId).get();
        if (roomDoc.exists) {
          return roomDoc.data();
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Firestore] getRoomByCode error for ${roomCode}:`, err.message);
  }
  return null;
}
