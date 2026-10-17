import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useAnimationStore } from '../store/useAnimationStore';
import { DiguAI, Card } from '@game/core';
import { playGinSlamImpactSound } from '../utils/audioEffects';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const RANK_LABELS: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
};

const SUIT_SYMBOLS: Record<string, string> = {
  SPADES: '♠',
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
};

function formatCard(card: Card): string {
  const rank = RANK_LABELS[card.rank] || card.rank.toString();
  const suit = SUIT_SYMBOLS[card.suit] || '';
  return `${rank}${suit}`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * useAITurnController:
 * Automates autonomous AI bot turns with realistic human pacing and physical card animations:
 * 1. Deliberate thinking pause (850ms - 1150ms)
 * 2. Visual card flight from stock/discard to the bot avatar chip (~380ms)
 * 3. Store executeBotDraw commits
 * 4. Melds analysis pause (950ms - 1300ms)
 * 5. Visual card flight from bot avatar chip to discard pile (~380ms)
 * 6. Store executeBotAction commits with readable discard reveal
 */
export function useAITurnController() {
  const phase = useGameStore(state => state.gameState.phase);
  const activePlayerIndex = useGameStore(state => state.gameState.activePlayerIndex);
  const isAI = useGameStore(
    state => state.gameState.players[state.gameState.activePlayerIndex]?.isAI ?? false
  );
  const isDealingOpeningAnimation = useGameStore(state => state.isDealingOpeningAnimation);
  const executeBotDraw = useGameStore(state => state.executeBotDraw);
  const executeBotAction = useGameStore(state => state.executeBotAction);
  const initiateReshuffleFromDiscards = useGameStore(state => state.initiateReshuffleFromDiscards);
  const setAiThoughtMessage = useGameStore(state => state.setAiThoughtMessage);
  const triggerReaction = useGameStore(state => state.triggerReaction);
  const startFlight = useAnimationStore(state => state.startFlight);

  const turnIdRef = useRef<number>(0);

  useEffect(() => {
    // Only autonomous AI bots execute here; Seat 0 is the human player (isAI: false)
    if (!isAI || isDealingOpeningAnimation) {
      return;
    }

    if (phase !== 'AWAIT_DRAW' && phase !== 'AWAIT_ACTION') {
      return;
    }

    const currentTurnId = ++turnIdRef.current;
    const isCancelled = () => turnIdRef.current !== currentTurnId;

    const runTurnStep = async () => {
      try {
        if (phase === 'AWAIT_DRAW') {
          // Step 1: Pre-turn Table Orientation Pause (lets human register active seat)
          const orientationDelay = 500 + Math.floor(Math.random() * 250);
          await sleep(orientationDelay);
          if (isCancelled()) return;

          setAiThoughtMessage({
            seatIndex: activePlayerIndex,
            message: 'Evaluating board...',
          });

          // Fetch fresh state from store
          const currentGameState = useGameStore.getState().gameState;
          const currentBot = currentGameState.players[activePlayerIndex];
          if (!currentBot) return;

          // Step 2: Determine draw choice with human-like deliberation
          const topDiscard =
            currentGameState.discardPile.length > 0
              ? currentGameState.discardPile[currentGameState.discardPile.length - 1]
              : null;

          const shouldDrawDiscard = DiguAI.shouldDrawDiscard(
            currentBot.hand,
            topDiscard,
            currentGameState.rules
          );

          // Pondering pause: brisk if taking discard, thoughtful if considering stock
          const thinkDelay = shouldDrawDiscard
            ? 800 + Math.floor(Math.random() * 300)
            : 950 + Math.floor(Math.random() * 350);
          await sleep(thinkDelay);
          if (isCancelled()) return;

          if (shouldDrawDiscard && topDiscard) {
            setAiThoughtMessage({
              seatIndex: activePlayerIndex,
              message: `Taking ${formatCard(topDiscard)} from Discard`,
            });

            // 40% chance to drop banter on discard steal
            if (Math.random() < 0.4) {
              triggerReaction(activePlayerIndex, 'Shukuriyaa! 🙏', '🔥');
            }

            // Animate card flying from discard pile to bot avatar
            await startFlight({
              card: topDiscard,
              fromAnchor: 'anchor-discard-pile',
              toAnchor: `anchor-seat-${activePlayerIndex}`,
              isFaceDown: false,
              durationMs: 520,
            });
          } else {
            // If draw pile is 0, bot initiates reshuffle of played discard cards
            if (currentGameState.stockPile.length === 0 && currentGameState.discardPile.length > 0) {
              setAiThoughtMessage({
                seatIndex: activePlayerIndex,
                message: 'Shuffling played cards...',
              });

              if (topDiscard) {
                await startFlight({
                  card: topDiscard,
                  fromAnchor: 'anchor-discard-pile',
                  toAnchor: 'anchor-stock-pile',
                  isFaceDown: false,
                  flipToFaceUp: false,
                  durationMs: 440,
                });
              }

              initiateReshuffleFromDiscards();
              await sleep(450);
              if (isCancelled()) return;
            }

            const freshState = useGameStore.getState().gameState;
            const hasStock = freshState.stockPile.length > 0;
            const topStockCard = hasStock
              ? freshState.stockPile[freshState.stockPile.length - 1]
              : topDiscard;

            setAiThoughtMessage({
              seatIndex: activePlayerIndex,
              message: hasStock ? 'Drawing from Stock...' : `Taking ${topDiscard ? formatCard(topDiscard) : 'Discard'}`,
            });

            if (topStockCard) {
              await startFlight({
                card: topStockCard,
                fromAnchor: hasStock ? 'anchor-stock-pile' : 'anchor-discard-pile',
                toAnchor: `anchor-seat-${activePlayerIndex}`,
                isFaceDown: hasStock,
                durationMs: 540,
              });
            }
          }

          if (isCancelled()) return;

          // Short settle pause so draw settles into hand before action phase
          await sleep(350);
          if (isCancelled()) return;

          // Step 3: Commit bot draw in store
          executeBotDraw(activePlayerIndex);

        } else if (phase === 'AWAIT_ACTION') {
          // Step 4: Hand Analysis & Meld Reorganization Pause
          setAiThoughtMessage({
            seatIndex: activePlayerIndex,
            message: 'Arranging melds...',
          });

          // Thoughtful human-like arrangement deliberation (~1.1s)
          const analysisDelay = 950 + Math.floor(Math.random() * 350);
          await sleep(analysisDelay);
          if (isCancelled()) return;

          // Fetch fresh state from store
          const currentGameState = useGameStore.getState().gameState;
          const currentBot = currentGameState.players[activePlayerIndex];
          if (!currentBot || currentBot.hand.length !== 11) {
            return;
          }

          const botHand = currentBot.hand;
          const decision = DiguAI.chooseBestAction(botHand);
          const discardCard =
            botHand.find(c => c.id === decision.cardId) || botHand[botHand.length - 1];
          const isGinSlam = decision.action === 'GIN_SLAM';

          // Step 5: Animate card flying from bot avatar to discard pile or finish slot
          if (isGinSlam) {
            setAiThoughtMessage({
              seatIndex: activePlayerIndex,
              message: '⚡ GIN SLAM!',
            });
            triggerReaction(activePlayerIndex, 'Gin vejje! 🏆', '😎');

            await startFlight({
              card: discardCard,
              fromAnchor: `anchor-seat-${activePlayerIndex}`,
              toAnchor: 'center-slam-slot',
              isFaceDown: false,
              flipToFaceDown: true,
              isGinSlam: true,
              durationMs: 580,
            });

            // Immediately place face-down card into finish slot upon arrival
            const slammedCard: Card = { ...discardCard, isFaceDown: true };
            useGameStore.setState(state => ({
              gameState: {
                ...state.gameState,
                finishSlotCard: slammedCard,
              },
              isSlammingFinish: true,
            }));

            playGinSlamImpactSound();
            try {
              Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
            } catch {}

            // Theatrical pause for table felt shockwaves and banner
            await sleep(1200);
            if (isCancelled()) return;

            // Commit bot action and resolve round
            executeBotAction(activePlayerIndex);
            return;
          } else {
            setAiThoughtMessage({
              seatIndex: activePlayerIndex,
              message: `Discarding ${formatCard(discardCard)}`,
            });

            await startFlight({
              card: discardCard,
              fromAnchor: `anchor-seat-${activePlayerIndex}`,
              toAnchor: 'anchor-discard-pile',
              isFaceDown: false,
              durationMs: 480,
            });
          }

          if (isCancelled()) return;

          // Post-discard reveal pause: let players read the discarded card on the table
          await sleep(700);
          if (isCancelled()) return;

          // Step 6: Commit bot action in store
          executeBotAction(activePlayerIndex);
        }
      } catch (err: any) {
        console.error('Turn controller error in runTurnStep:', err);
        // Fallback recovery: ensure game loop never freezes
        if (!isCancelled()) {
          const fresh = useGameStore.getState().gameState;
          if (fresh.activePlayerIndex === activePlayerIndex) {
            if (fresh.phase === 'AWAIT_DRAW') {
              executeBotDraw(activePlayerIndex);
            } else if (fresh.phase === 'AWAIT_ACTION') {
              executeBotAction(activePlayerIndex);
            }
          }
        }
      }
    };

    runTurnStep();

    return () => {
      turnIdRef.current++;
    };
  }, [
    phase,
    activePlayerIndex,
    isAI,
    executeBotDraw,
    executeBotAction,
    initiateReshuffleFromDiscards,
    setAiThoughtMessage,
    startFlight,
  ]);
}
