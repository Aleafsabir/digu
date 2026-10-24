---
name: digu-state-sync
description: >
  Turn synchronization, optimistic UI reconciliation, mobile app lifecycle resilience,
  and state serialization specifications for Digu multiplayer and solo modes.
---

# Digu State Synchronization & Lifecycle Resilience

This skill specifies state management, network synchronization protocols, optimistic local UI execution, and mobile lifecycle resilience for **Digu**.

---

## 1. Network & Authority Architecture

Digu utilizes an **Authoritative Server / Optimistic Client** model:
- The server (Supabase Realtime / WebSocket engine) is the sole authority for:
  1. Deck order and card draws.
  2. Discard validations.
  3. Official score resolution and Gin verification.
- **Client Information Masking (Anti-Cheat)**:
  - Clients receive full data *only* for their own hand and face-up table cards (discard pile top, melded cards on table).
  - Opponents' hands are transmitted strictly as masked arrays:
    ```typescript
    interface MaskedOpponentState {
      seatIndex: number;
      handCount: number; // e.g. 10 or 11
      isConnected: boolean;
      consecutiveGins: number;
      cumulativeScore: number;
    }
    ```
  - Unrevealed stock deck cards and opponents' private hand cards must **never** be sent over the wire prior to round reveal.

---

## 2. Action Ordering & Monotonic Versioning

To prevent race conditions (such as double-tapping the draw deck, rapid spam discards, or dropped WebSocket packets):

### 2.1 State Monotonic Sequence Counter
Every action dispatched by a player includes:
```typescript
interface GameActionPayload {
  actionId: string;       // UUIDv4
  roundId: string;
  turnSequence: number;   // Strictly monotonically increasing integer (1, 2, 3...)
  playerId: string;
  type: 'DRAW_STOCK' | 'DRAW_DISCARD' | 'DISCARD' | 'DECLARE_GIN' | 'REORDER_HAND';
  payload: any;
  timestamp: number;
}
```

### 2.2 Client-Side Action Queue & Optimistic Execution
1. **Immediate Optimistic Update**:
   - When the user draws or discards, the local Zustand store renders the visual transition immediately (instant touch feedback).
   - The action is pushed to `pendingActionQueue`.
2. **Reconciliation**:
   - If the server accepts the action with matching `turnSequence`, the action is dequeued.
   - If the server rejects the action (e.g., turn expired or card already taken), the client rolls back to `lastAuthoritativeState` and displays a non-blocking toast warning.
3. **Double-Tap Lock**:
   - While an action is in flight (`isActionPending === true`), duplicate touch events on interactive game zones are ignored for $350\text{ms}$.

---

## 3. Disconnect Grace Windows & Reconnection Buffers

Mobile networks fluctuate frequently (switching between 5G, Wi-Fi, and cellular dead spots):

### 3.1 45-Second Disconnect Grace Buffer
- When a client loses socket connection during their active turn:
  1. The server flags `player.isConnected = false`.
  2. A **45-second Disconnect Grace Window** initiates.
  3. The active turn timer is paused or extended by up to $15\text{s}$ to allow network handshake.
  4. Table peers see an "Opponent Reconnecting..." subtle amber badge.
  5. If the player reconnects within $45\text{s}$, the full authoritative snapshot is sent and state resumes seamlessly.
  6. If $45\text{s}$ elapses without recovery, the seat is transitioned to an AI Bot controller (`isBotAssigned: true`), which finishes the turn and plays according to standard basic strategy until the match completes.

---

## 4. Mobile Lifecycle & Instant State Serialization

Mobile OS environments (iOS and Android via Capacitor) aggressively background and terminate idle webviews.

### 4.1 Lifecycle Hooks
We bind to both DOM and Capacitor lifecycle events:
```typescript
import { App as CapacitorApp } from '@capacitor/app';

// 1. Web visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    serializeGameStateToStorage();
  } else {
    reconcileGameStateFromStorage();
  }
});

// 2. Capacitor native app state
CapacitorApp.addListener('appStateChange', ({ isActive }) => {
  if (!isActive) {
    serializeGameStateToStorage();
  } else {
    revalidateServerSync();
  }
});
```

### 4.2 Local Persistence Key Scheme
- Save active match snapshot to `localStorage` / `@capacitor/preferences` under `digu_active_match_session`:
  ```typescript
  interface CachedMatchSession {
    matchId: string;
    roundIndex: number;
    playerHand: Card[];
    discardPile: Card[];
    dealerSeat: number;
    activeSeat: number;
    turnPhase: GamePhase;
    cachedAt: number;
  }
  ```
- On relaunch or wake:
  - If `Date.now() - cachedAt < 300_000` (within 5 minutes), attempt auto-reconnect to room.
  - If match is already closed, clean cache and route back to lobby.
