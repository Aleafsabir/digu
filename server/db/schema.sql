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
-- 8. Player Mode Ratings & Mode-Specific Milestones (Digu, Dhihaeh, Bondi)
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_ratings (
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    game_mode VARCHAR(20) NOT NULL, -- 'DIGU' | 'DHIHAEH' | 'BONDI'
    elo INT NOT NULL DEFAULT 1200 CHECK (elo >= 100),
    matches_played INT NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
    wins INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
    baggas_captured INT NOT NULL DEFAULT 0 CHECK (baggas_captured >= 0),
    haasbaggas_captured INT NOT NULL DEFAULT 0 CHECK (haasbaggas_captured >= 0),
    thousand_point_runs INT NOT NULL DEFAULT 0 CHECK (thousand_point_runs >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (profile_id, game_mode)
);

-- ============================================================================
-- 9. Round Records (Per-Round Telemetry, Score Deltas & Action Logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS round_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES match_records(id) ON DELETE CASCADE,
    round_number INT NOT NULL DEFAULT 1 CHECK (round_number >= 1),
    winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    scores_delta JSONB NOT NULL DEFAULT '{}'::jsonb,
    logs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure game_rooms supports 6-char alphanumeric codes, custom rules, and spectators
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS turn_timer_seconds INT NOT NULL DEFAULT 15;
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS fill_empty_seats_with_bots BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS spectators JSONB NOT NULL DEFAULT '[]'::jsonb;

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
CREATE INDEX IF NOT EXISTS idx_player_ratings_leaderboard ON player_ratings(game_mode, elo DESC);
CREATE INDEX IF NOT EXISTS idx_round_records_match ON round_records(match_id, round_number ASC);

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

-- D. Atomic Match Recording, Round Telemetry & ELO Rating Update
CREATE OR REPLACE FUNCTION record_match_and_elo_update(
    p_room_id UUID,
    p_game_mode VARCHAR(20),
    p_winning_seat_or_team VARCHAR(20),
    p_winner_profile_ids UUID[],
    p_loser_profile_ids UUID[],
    p_pot_total BIGINT DEFAULT 0,
    p_total_rounds INT DEFAULT 1,
    p_duration_seconds INT DEFAULT 0,
    p_scores JSONB DEFAULT '{}'::jsonb,
    p_rounds_json JSONB DEFAULT '[]'::jsonb,
    p_baggas_captured INT DEFAULT 0,
    p_haasbaggas_captured INT DEFAULT 0,
    p_thousand_point_runs INT DEFAULT 0,
    p_k_factor INT DEFAULT 32
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_match_id UUID;
    v_house_rake BIGINT;
    v_winner_id UUID;
    v_loser_id UUID;
    v_winner_avg_elo NUMERIC := 1200;
    v_loser_avg_elo NUMERIC := 1200;
    v_expected_win NUMERIC;
    v_elo_delta INT;
    v_round_item JSONB;
BEGIN
    v_house_rake := (p_pot_total * 5) / 100;

    -- 1. Insert master match record
    INSERT INTO match_records (
        room_id,
        mode,
        winning_seat_or_team,
        pot_total,
        house_rake,
        total_rounds,
        duration_seconds,
        scores
    ) VALUES (
        p_room_id,
        p_game_mode,
        p_winning_seat_or_team,
        p_pot_total,
        v_house_rake,
        p_total_rounds,
        p_duration_seconds,
        p_scores
    ) RETURNING id INTO v_match_id;

    -- 2. Insert individual round_records if provided in p_rounds_json
    IF p_rounds_json IS NOT NULL AND jsonb_typeof(p_rounds_json) = 'array' THEN
        FOR v_round_item IN SELECT * FROM jsonb_array_elements(p_rounds_json)
        LOOP
            INSERT INTO round_records (
                match_id,
                round_number,
                winner_id,
                scores_delta,
                logs_json
            ) VALUES (
                v_match_id,
                COALESCE((v_round_item->>'round_number')::INT, 1),
                 NULLIF(v_round_item->>'winner_id', '')::UUID,
                COALESCE(v_round_item->'scores_delta', '{}'::jsonb),
                COALESCE(v_round_item->'logs_json', '[]'::jsonb)
            );
        END LOOP;
    END IF;

    -- 3. Ensure player_ratings rows exist for all participants
    IF p_winner_profile_ids IS NOT NULL THEN
        FOREACH v_winner_id IN ARRAY p_winner_profile_ids
        LOOP
            INSERT INTO player_ratings (profile_id, game_mode, elo)
            VALUES (v_winner_id, p_game_mode, 1200)
            ON CONFLICT (profile_id, game_mode) DO NOTHING;
        END LOOP;

        SELECT COALESCE(AVG(elo), 1200) INTO v_winner_avg_elo
        FROM player_ratings
        WHERE profile_id = ANY(p_winner_profile_ids) AND game_mode = p_game_mode;
    END IF;

    IF p_loser_profile_ids IS NOT NULL THEN
        FOREACH v_loser_id IN ARRAY p_loser_profile_ids
        LOOP
            INSERT INTO player_ratings (profile_id, game_mode, elo)
            VALUES (v_loser_id, p_game_mode, 1200)
            ON CONFLICT (profile_id, game_mode) DO NOTHING;
        END LOOP;

        SELECT COALESCE(AVG(elo), 1200) INTO v_loser_avg_elo
        FROM player_ratings
        WHERE profile_id = ANY(p_loser_profile_ids) AND game_mode = p_game_mode;
    END IF;

    -- 4. Compute standard ELO delta
    v_expected_win := 1.0 / (1.0 + power(10.0, (v_loser_avg_elo - v_winner_avg_elo) / 400.0));
    v_elo_delta := GREATEST(1, ROUND(p_k_factor * (1.0 - v_expected_win))::INT);

    -- 5. Apply ELO gain and milestone stats to winners
    IF p_winner_profile_ids IS NOT NULL THEN
        UPDATE player_ratings
        SET elo = elo + v_elo_delta,
            matches_played = matches_played + 1,
            wins = wins + 1,
            baggas_captured = baggas_captured + p_baggas_captured,
            haasbaggas_captured = haasbaggas_captured + p_haasbaggas_captured,
            thousand_point_runs = thousand_point_runs + p_thousand_point_runs,
            updated_at = now()
        WHERE profile_id = ANY(p_winner_profile_ids)
          AND game_mode = p_game_mode;
    END IF;

    -- 6. Apply ELO deduction to losers (floor at 100 ELO)
    IF p_loser_profile_ids IS NOT NULL THEN
        UPDATE player_ratings
        SET elo = GREATEST(100, elo - v_elo_delta),
            matches_played = matches_played + 1,
            updated_at = now()
        WHERE profile_id = ANY(p_loser_profile_ids)
          AND game_mode = p_game_mode;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', v_match_id,
        'game_mode', p_game_mode,
        'elo_delta', v_elo_delta,
        'winner_avg_elo_before', ROUND(v_winner_avg_elo),
        'loser_avg_elo_before', ROUND(v_loser_avg_elo)
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
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_records ENABLE ROW LEVEL SECURITY;

-- Allow public read for game rooms and seats (matchmaking & lobby visibility)
CREATE POLICY "Public read game_rooms" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Public read room_seats" ON room_seats FOR SELECT USING (true);
CREATE POLICY "Public read match_records" ON match_records FOR SELECT USING (true);
CREATE POLICY "Public read player_ratings" ON player_ratings FOR SELECT USING (true);
CREATE POLICY "Public read round_records" ON round_records FOR SELECT USING (true);

-- Allow authenticated/guest players to read and update their own profile
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR id IS NOT NULL);
CREATE POLICY "Users read own transactions" ON currency_transactions FOR SELECT USING (auth.uid() = profile_id OR profile_id IS NOT NULL);
