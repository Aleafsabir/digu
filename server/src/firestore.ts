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
  avatar_id: string;
  friend_code: string;
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

/**
 * Normalizes friend code to standard uppercase with prefix handling
 */
export function normalizeFriendCode(code: string): string {
  if (!code) return '';
  const clean = code.trim().toUpperCase();
  const digits = clean.replace(/[^0-9]/g, '');
  return digits ? `HLH-${digits}` : clean;
}

/**
 * Upserts a player profile into Firestore and maintains the O(1) friend_codes index.
 */
export async function upsertProfile(profile: Partial<StoredProfile> & { id: string }): Promise<void> {
  const friendCode = normalizeFriendCode(profile.friend_code || '');
  const now = new Date().toISOString();

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

  if (profile.coins !== undefined) docData.coins = Number(profile.coins);
  if (profile.gems !== undefined) docData.gems = Number(profile.gems);
  if (profile.login_provider) docData.login_provider = profile.login_provider;
  if (profile.stats) docData.stats = profile.stats;
  if (profile.current_match_info) docData.current_match_info = profile.current_match_info;

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

        // Also index raw digits for ultra-friendly matching (e.g. "95257")
        const digits = friendCode.replace('HLH-', '');
        if (digits) {
          await firestoreInstance.collection('friend_codes').doc(digits).set({
            friendCode,
            profileId: profile.id,
            displayName: docData.display_name,
            avatarId: docData.avatar_id,
            level: docData.level,
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
 * Retrieves a player profile by their Friend Code (using the O(1) index).
 */
export async function getProfileByFriendCode(inputCode: string): Promise<StoredProfile | null> {
  if (!inputCode) return null;
  const cleanCode = inputCode.trim().toUpperCase();
  const digitsOnly = cleanCode.replace(/[^0-9]/g, '');
  const standardCode = digitsOnly ? `HLH-${digitsOnly}` : cleanCode;

  if (firestoreInstance) {
    try {
      // Check standard code index
      let indexDoc = await firestoreInstance.collection('friend_codes').doc(standardCode).get();
      if (!indexDoc.exists && digitsOnly) {
        indexDoc = await firestoreInstance.collection('friend_codes').doc(digitsOnly).get();
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
      const snap = await firestoreInstance
        .collection('profiles')
        .where('friend_code', 'in', [standardCode, cleanCode, digitsOnly])
        .limit(1)
        .get();

      if (!snap.empty) {
        return snap.docs[0].data() as StoredProfile;
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
