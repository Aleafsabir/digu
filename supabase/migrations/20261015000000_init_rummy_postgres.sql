-- Supabase Migration: 20261015000000_init_rummy_postgres.sql
-- Direct migration identical to server/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(50) NOT NULL,
    avatar_id VARCHAR(50) NOT NULL DEFAULT 'sultan',
    login_provider VARCHAR(20) NOT NULL DEFAULT 'GUEST',
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
    last_daily_bonus_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS currency_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL,
    currency_type VARCHAR(10) NOT NULL DEFAULT 'COINS',
    amount BIGINT NOT NULL,
    balance_before BIGINT NOT NULL CHECK (balance_before >= 0),
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    reference_id VARCHAR(100),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    mode VARCHAR(20) NOT NULL,
    stake_buy_in BIGINT NOT NULL DEFAULT 1000 CHECK (stake_buy_in >= 0),
    target_score INT NOT NULL DEFAULT 1000,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    host_player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    max_players INT NOT NULL DEFAULT 4,
    current_player_count INT NOT NULL DEFAULT 1,
    pot_total BIGINT NOT NULL DEFAULT 0,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_seats (
    room_id UUID NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    seat_index INT NOT NULL CHECK (seat_index BETWEEN 0 AND 3),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    player_name VARCHAR(50) NOT NULL,
    avatar_id VARCHAR(50) NOT NULL DEFAULT 'sultan',
    team_id VARCHAR(10),
    is_bot BOOLEAN NOT NULL DEFAULT false,
    is_ready BOOLEAN NOT NULL DEFAULT false,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, seat_index)
);

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

CREATE INDEX IF NOT EXISTS idx_profiles_coins ON profiles(coins);
CREATE INDEX IF NOT EXISTS idx_currency_tx_profile ON currency_transactions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_seats_profile ON room_seats(profile_id);
CREATE INDEX IF NOT EXISTS idx_match_records_completed ON match_records(completed_at DESC);
