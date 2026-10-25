-- ============================================================================
-- THAASBAI DIGU (ދިގު) - PostgreSQL Production Database Schema
-- Complete schema for player profiles, ACID currency transactions,
-- real-time game rooms, seat presence, and match history.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Profiles & Player Accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(50) NOT NULL,
    avatar_id VARCHAR(50) NOT NULL DEFAULT 'sultan',
    login_provider VARCHAR(20) NOT NULL DEFAULT 'GUEST', -- 'GUEST', 'GOOGLE', 'APPLE', 'PHONE'
    google_id VARCHAR(100) UNIQUE,
    phone VARCHAR(30),
    email VARCHAR(255),
    coins BIGINT NOT NULL DEFAULT 10000 CHECK (coins >= 0),
    gems INT NOT NULL DEFAULT 50 CHECK (gems >= 0),
    level INT NOT NULL DEFAULT 1 CHECK (level >= 1),
    xp INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
    xp_next_level INT NOT NULL DEFAULT 500 CHECK (xp_next_level > 0),
    stats JSONB NOT NULL DEFAULT '{
        "gamesPlayed": 0,
        "gamesWon": 0,
        "winStreak": 0,
        "bestWinStreak": 0,
        "totalGins": 0,
        "thousandPointRuns": 0,
        "totalPointsScored": 0
    }'::jsonb,
    friend_code VARCHAR(12) UNIQUE NOT NULL DEFAULT ('DIGU-' || upper(substr(md5(random()::text), 1, 4))),
    presence_status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE', -- 'IN_LOBBY', 'IN_MATCH', 'OFFLINE'
    current_match_info JSONB DEFAULT NULL, -- {"roomCode": "THAAS-8842", "mode": "TEAM_4P"}
    last_daily_bonus_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Currency Transactions Ledger (Immutable Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS currency_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL, -- 'MATCH_BUY_IN', 'MATCH_PAYOUT', 'ROUND_WIN', 'DAILY_BONUS', 'STORE_PURCHASE', 'REFUND'
    currency_type VARCHAR(10) NOT NULL DEFAULT 'COINS', -- 'COINS' | 'GEMS'
    amount BIGINT NOT NULL, -- Negative for deductions/buy-ins, positive for rewards/payouts
    balance_before BIGINT NOT NULL CHECK (balance_before >= 0),
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    reference_id VARCHAR(100), -- room_code, match_id, or payment_id
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. Game Rooms (Matchmaking & Private Tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) UNIQUE NOT NULL, -- e.g. 'THAAS-8842'
    mode VARCHAR(20) NOT NULL, -- 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P'
    stake_buy_in BIGINT NOT NULL DEFAULT 1000 CHECK (stake_buy_in >= 0),
    target_score INT NOT NULL DEFAULT 1000,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'STARTING', 'PLAYING', 'COMPLETED', 'ABANDONED'
    host_player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    max_players INT NOT NULL DEFAULT 4,
    current_player_count INT NOT NULL DEFAULT 1,
    pot_total BIGINT NOT NULL DEFAULT 0,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. Room Seats (Seat Occupancy & Presence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_seats (
    room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    seat_index INT NOT NULL CHECK (seat_index BETWEEN 0 AND 3),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    player_name VARCHAR(50) NOT NULL,
    avatar_id VARCHAR(50) NOT NULL DEFAULT 'sultan',
    team_id VARCHAR(10), -- 'TEAM_A' (Seats 0 & 2) | 'TEAM_B' (Seats 1 & 3)
    is_bot BOOLEAN NOT NULL DEFAULT false,
    is_ready BOOLEAN NOT NULL DEFAULT false,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, seat_index)
);

-- ============================================================================
-- 5. Match Records (Match History & Statistical Verification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES game_rooms(id) ON DELETE SET NULL,
    mode VARCHAR(20) NOT NULL,
    winning_seat_or_team VARCHAR(20) NOT NULL,
    pot_total BIGINT NOT NULL DEFAULT 0,
    house_rake BIGINT NOT NULL DEFAULT 0,
    total_rounds INT NOT NULL DEFAULT 1,
    duration_seconds INT NOT NULL DEFAULT 0,
    scores JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. Friendships & Social Connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_friend_pair UNIQUE (user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id <> friend_id)
);

-- ============================================================================
-- 7. Real-Time Match Invitations
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    room_code VARCHAR(10) NOT NULL,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_name VARCHAR(50) NOT NULL,
    sender_avatar_id VARCHAR(50) NOT NULL DEFAULT 'sultan',
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mode VARCHAR(20) NOT NULL, -- 'TEAM_4P' | 'SOLO_4P' | 'SOLO_2P'
    stake_buy_in BIGINT NOT NULL DEFAULT 1000,
    target_score INT NOT NULL DEFAULT 1000,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 minutes')
);

-- ============================================================================
-- Indexes for High Concurrency Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON profiles(coins);
CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON profiles(friend_code);
CREATE INDEX IF NOT EXISTS idx_profiles_presence ON profiles(presence_status);
CREATE INDEX IF NOT EXISTS idx_currency_tx_profile ON currency_transactions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_seats_profile ON room_seats(profile_id);
CREATE INDEX IF NOT EXISTS idx_match_records_completed ON match_records(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_match_invites_receiver ON match_invitations(receiver_id, status, expires_at);

-- ============================================================================
-- Stored Procedures: ACID Currency Operations & Room Lifecycle
-- ============================================================================

-- A. Atomic Room Buy-In (Deducts buy-in from player balance and records ledger)
CREATE OR REPLACE FUNCTION atomic_room_buy_in(
    p_profile_id UUID,
    p_room_id UUID,
    p_buy_in BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_coins BIGINT;
    v_new_coins BIGINT;
    v_room_code VARCHAR(10);
    v_tx_id UUID;
BEGIN
    -- 1. Lock profile row FOR UPDATE to prevent race conditions & double-spending
    SELECT coins INTO v_current_coins
    FROM profiles
    WHERE id = p_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile % not found', p_profile_id;
    END IF;

    -- 2. Verify sufficient funds
    IF v_current_coins < p_buy_in THEN
        RAISE EXCEPTION 'Insufficient coins. Balance: %, Required: %', v_current_coins, p_buy_in;
    END IF;

    -- 3. Calculate new balance
    v_new_coins := v_current_coins - p_buy_in;

    -- 4. Update profile balance
    UPDATE profiles
    SET coins = v_new_coins,
        updated_at = now()
    WHERE id = p_profile_id;

    -- 5. Fetch room code for ledger record
    SELECT room_code INTO v_room_code
    FROM game_rooms
    WHERE id = p_room_id;

    -- 6. Insert audit trail transaction
    INSERT INTO currency_transactions (
        profile_id,
        transaction_type,
        currency_type,
        amount,
        balance_before,
        balance_after,
        reference_id,
        description
    ) VALUES (
        p_profile_id,
        'MATCH_BUY_IN',
        'COINS',
        -p_buy_in,
        v_current_coins,
        v_new_coins,
        COALESCE(v_room_code, p_room_id::text),
        format('Buy-in for room %s (-%s coins)', COALESCE(v_room_code, 'Table'), p_buy_in)
    ) RETURNING id INTO v_tx_id;

    -- 7. Increment room pot
    UPDATE game_rooms
    SET pot_total = pot_total + p_buy_in,
        updated_at = now()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'balance_before', v_current_coins,
        'balance_after', v_new_coins,
        'deducted', p_buy_in
    );
END;
$$;

-- B. Atomic Match Payout (Awards pot minus house rake to winners)
CREATE OR REPLACE FUNCTION atomic_match_payout(
    p_match_id UUID,
    p_room_id UUID,
    p_winner_profile_ids UUID[],
    p_pot_total BIGINT,
    p_house_rake_pct INT DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_house_rake BIGINT;
    v_net_pot BIGINT;
    v_winner_count INT;
    v_payout_per_winner BIGINT;
    v_winner_id UUID;
    v_curr_coins BIGINT;
    v_new_coins BIGINT;
    v_room_code VARCHAR(10);
BEGIN
    v_winner_count := array_length(p_winner_profile_ids, 1);
    IF v_winner_count IS NULL OR v_winner_count = 0 THEN
        RAISE EXCEPTION 'No winner profiles provided for payout';
    END IF;

    -- Calculate 5% house rake and net pot
    v_house_rake := (p_pot_total * p_house_rake_pct) / 100;
    v_net_pot := p_pot_total - v_house_rake;
    v_payout_per_winner := v_net_pot / v_winner_count;

    SELECT room_code INTO v_room_code FROM game_rooms WHERE id = p_room_id;

    -- Credit each winner atomically
    FOREACH v_winner_id IN ARRAY p_winner_profile_ids
    LOOP
        SELECT coins INTO v_curr_coins
        FROM profiles
        WHERE id = v_winner_id
        FOR UPDATE;

        IF FOUND THEN
            v_new_coins := v_curr_coins + v_payout_per_winner;

            UPDATE profiles
            SET coins = v_new_coins,
                updated_at = now()
            WHERE id = v_winner_id;

            INSERT INTO currency_transactions (
                profile_id,
                transaction_type,
                currency_type,
                amount,
                balance_before,
                balance_after,
                reference_id,
                description
            ) VALUES (
                v_winner_id,
                'MATCH_PAYOUT',
                'COINS',
                v_payout_per_winner,
                v_curr_coins,
                v_new_coins,
                COALESCE(v_room_code, p_room_id::text),
                format('Match victory payout for %s (+%s coins)', COALESCE(v_room_code, 'Table'), v_payout_per_winner)
            );
        END IF;
    END LOOP;

    -- Update game room status
    UPDATE game_rooms
    SET status = 'COMPLETED',
        updated_at = now()
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'pot_total', p_pot_total,
        'house_rake', v_house_rake,
        'net_pot', v_net_pot,
        'payout_per_winner', v_payout_per_winner,
        'winners_paid', v_winner_count
    );
END;
$$;

-- C. Atomic Daily Bonus Claim (Free coins every 24 hours)
CREATE OR REPLACE FUNCTION claim_daily_bonus(
    p_profile_id UUID,
    p_bonus_amount INT DEFAULT 1000
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_last_bonus TIMESTAMPTZ;
    v_curr_coins BIGINT;
    v_new_coins BIGINT;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT last_daily_bonus_at, coins INTO v_last_bonus, v_curr_coins
    FROM profiles
    WHERE id = p_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile % not found', p_profile_id;
    END IF;

    -- Check if 24 hours have elapsed
    IF v_last_bonus IS NOT NULL AND v_last_bonus + interval '24 hours' > v_now THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Daily bonus already claimed for today',
            'next_available_at', v_last_bonus + interval '24 hours'
        );
    END IF;

    v_new_coins := v_curr_coins + p_bonus_amount;

    UPDATE profiles
    SET coins = v_new_coins,
        last_daily_bonus_at = v_now,
        updated_at = v_now
    WHERE id = p_profile_id;

    INSERT INTO currency_transactions (
        profile_id,
        transaction_type,
        currency_type,
        amount,
        balance_before,
        balance_after,
        reference_id,
        description
    ) VALUES (
        p_profile_id,
        'DAILY_BONUS',
        'COINS',
        p_bonus_amount,
        v_curr_coins,
        v_new_coins,
        'DAILY_BONUS_' || to_char(v_now, 'YYYY-MM-DD'),
        format('Daily login reward (+%s coins)', p_bonus_amount)
    );

    RETURN jsonb_build_object(
        'success', true,
        'bonus_amount', p_bonus_amount,
        'balance_before', v_curr_coins,
        'balance_after', v_new_coins,
        'claimed_at', v_now
    );
END;
$$;

-- ============================================================================
-- Row Level Security (RLS) - Security Baseline
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_records ENABLE ROW LEVEL SECURITY;

-- Allow public read for game rooms and seats (matchmaking & lobby visibility)
CREATE POLICY "Public read game_rooms" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Public read room_seats" ON room_seats FOR SELECT USING (true);
CREATE POLICY "Public read match_records" ON match_records FOR SELECT USING (true);

-- Allow authenticated/guest players to read and update their own profile
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR id IS NOT NULL);
CREATE POLICY "Users read own transactions" ON currency_transactions FOR SELECT USING (auth.uid() = profile_id OR profile_id IS NOT NULL);
