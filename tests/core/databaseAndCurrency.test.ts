import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseService } from '../../src/services/databaseService';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useGameStore } from '../../src/store/useGameStore';
import { DEFAULT_GUEST_PROFILE } from '../../src/services/cloudSyncService';

describe('Database & Currency Ledger Suite', () => {
  beforeEach(() => {
    useAuthStore.setState({
      profile: {
        ...DEFAULT_GUEST_PROFILE,
        coins: 10000,
        gems: 50,
        lastDailyBonusAt: null,
      },
      transactions: [],
    });
  });

  it('records atomic buy-in deduction in ledger', () => {
    const auth = useAuthStore.getState();
    const success = auth.executeBuyIn(1000, 'Test Buy-In', 'THAAS-1234');
    
    expect(success).toBe(true);
    expect(useAuthStore.getState().profile.coins).toBe(9000);

    const txs = useAuthStore.getState().transactions;
    expect(txs.length).toBeGreaterThan(0);
    expect(txs[0].type).toBe('MATCH_BUY_IN');
    expect(txs[0].amount).toBe(-1000);
    expect(txs[0].balanceBefore).toBe(10000);
    expect(txs[0].balanceAfter).toBe(9000);
    expect(txs[0].referenceId).toBe('THAAS-1234');
  });

  it('rejects buy-in when player has insufficient coins', () => {
    useAuthStore.setState({
      profile: {
        ...DEFAULT_GUEST_PROFILE,
        coins: 500,
      },
    });

    const success = useAuthStore.getState().executeBuyIn(1000, 'High Roller Table');
    expect(success).toBe(false);
    expect(useAuthStore.getState().profile.coins).toBe(500);
  });

  it('awards pot payout and credits ledger', () => {
    const auth = useAuthStore.getState();
    auth.awardPayout(3800, 'Championship Victory', 'THAAS-1234');

    expect(useAuthStore.getState().profile.coins).toBe(13800);
    const txs = useAuthStore.getState().transactions;
    expect(txs[0].type).toBe('MATCH_PAYOUT');
    expect(txs[0].amount).toBe(3800);
    expect(txs[0].balanceAfter).toBe(13800);
  });

  it('claims daily bonus once every 24 hours', () => {
    const auth = useAuthStore.getState();
    const res1 = auth.claimDailyBonus();
    expect(res1.success).toBe(true);
    expect(res1.bonusAmount).toBe(1000);
    expect(useAuthStore.getState().profile.coins).toBe(11000);

    // Second claim immediately should be rejected
    const res2 = auth.claimDailyBonus();
    expect(res2.success).toBe(false);
    expect(res2.message).toContain('available in');
    expect(useAuthStore.getState().profile.coins).toBe(11000);
  });

  it('creates and joins game rooms with valid 6-digit codes', async () => {
    const hostProfile = useAuthStore.getState().profile;
    const room = await DatabaseService.createRoom(hostProfile, 'TEAM_4P', 1000, 1000, true);

    expect(room.roomCode).toMatch(/^THAAS-\d{4}$/);
    expect(room.seats.length).toBe(4);
    expect(room.seats[0].playerName).toBe(hostProfile.displayName);
    expect(room.seats[0].isReady).toBe(true);
    expect(room.currentPlayerCount).toBe(1);

    // Join room
    const joiningProfile = {
      ...hostProfile,
      id: 'player_2_id',
      displayName: 'Mariyam Didi',
      coins: 5000,
    };

    const joinRes = await DatabaseService.joinRoom(room.roomCode, joiningProfile);
    expect(joinRes.success).toBe(true);
    expect(joinRes.room?.currentPlayerCount).toBe(2);
    expect(joinRes.room?.seats[1].playerName).toBe('Mariyam Didi');
  });

  it('calculates 5% house rake and table pot correctly upon game launch', () => {
    const game = useGameStore.getState();
    game.updatePendingRules({
      mode: 'TEAM_4P',
      buyIn: 1000,
      targetScore: 1000,
    });

    game.confirmAndStartMatch();

    expect(useGameStore.getState().tablePot).toBe(4000);
    expect(useGameStore.getState().tableBuyIn).toBe(1000);
    expect(useAuthStore.getState().profile.coins).toBe(9000); // 10000 - 1000
  });
});
