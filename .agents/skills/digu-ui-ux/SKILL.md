---
name: digu-ui-ux
description: >
  Mobile Landscape UI/UX design, touch ergonomics, and sensory feedback specifications for Digu (Maldivian Rummy).
  Covers landscape viewport zoning, card fanning geometry, safe area handling, drag-to-play thresholds, and micro-interactions.
---

# Digu Mobile Landscape UI/UX & Touch Ergonomics

This skill governs the interface architecture, touch ergonomics, motion choreography, and game feel ("juice") for **Digu (Maldivian Rummy)** running exclusively in **Landscape Orientation** on mobile devices (iOS, Android, and web).

---

## 1. Landscape Viewport Architecture (844×390 / 932×430 / 16:9 to 20:9)

In landscape, screen width is generous while vertical height is constrained. The table must be partitioned into an authentic 4-seat card table layout:

```
+----------------------------------------------------------------------------------------------------+
| [Safe-L]  TOP TABLE RIM (14% Height): Room Pot, Round Trophy, North Seat (Partner), Menu   [Safe-R]|
+-------------------+----------------------------------------------------+---------------------------+
| WEST FLANK (16%W) | CENTER FELT PLAYFIELD (68% Width, 48% Height)      | EAST FLANK (16% Width)    |
| - Seat 1 (Ali)    | - Team A vs Team B Live Meld Trays                 | - Seat 3 (Hassan)         |
| - 10-Card Fan Back| - Stock Draw Deck (3D perspective felt stack)      | - 10-Card Fan Back        |
| - Status & Emote  | - Discard Pile (face-up top card)                  | - Status & Emote          |
| - Chat Trigger    | - Finish Slot: Dedicated Face-Down Gin Slam Target | - Reaction Trigger        |
+-------------------+----------------------------------------------------+---------------------------+
| SOUTH SEAT: PLAYER SANCTUARY (38% Height)                                                          |
| - Over-Hand HUD Bar: [Sort Runs] [Deadwood 0/10 • GIN READY] [Turn Timer Ring] [Sort Sets]         |
| - Wide Radial Hand Fan: 10–13 cards with parabolic thumb arc and gentle ±12° radial tilt           |
| - Thumb-zone Contextual Action Buttons: [Discard] / [⚡ FACE-DOWN GIN SLAM]                        |
| [Safe-L]                                       [Home Gesture Pill Safe Area]               [Safe-R]|
+----------------------------------------------------------------------------------------------------+
```

### 1.1 Landscape Safe Areas & Cutout Insets
- **Horizontal Insets (Crucial)**:
  - Phone notches, Dynamic Islands, and speaker punch holes sit on the **left or right** edge when held horizontally.
  - Left edge elements (West opponent, Menu, Quick Chat) must be offset by `max(env(safe-area-inset-left), 16px)`.
  - Right edge elements (East opponent, Score history, Emoji trigger) must be offset by `max(env(safe-area-inset-right), 16px)`.
- **Bottom Safe Area**:
  - The iOS Home Indicator pill spans horizontally across the bottom center.
  - Hand card anchors must preserve `max(env(safe-area-inset-bottom), 10px)` clearance so thumb swipes do not trigger OS task switching.

---

## 2. Touch Ergonomics & Two-Thumb Reach Zones

Mobile landscape gaming naturally relies on **two-thumb control ergonomics**:

### 2.1 Two-Thumb Ergonomic Map
- **Left Thumb Arc**:
  - Reaches Left Hand Cards (indices $0 \dots 4$).
  - Reaches Sort Hand by Runs button.
  - Reaches In-Game Menu & Quick Chat trigger.
- **Right Thumb Arc**:
  - Reaches Right Hand Cards (indices $6 \dots 10/11$).
  - Reaches Sort Hand by Sets button.
  - Reaches Primary Action Trigger: Contextual Discard & Face-Down Gin Slam.
- **Center Table (Swipe/Drag Domain)**:
  - Accessible via upward swipe gestures from either thumb.

### 2.2 Dual Interaction Paradigm in Landscape
1. **Tap-to-Select & Act**:
   - Tapping an unselected card elevates it vertically by **14–18 dp** with an amber/gold halo ring (`ring-2 ring-amber-400`).
   - The right-thumb Action Button immediately illuminates with "Discard" or "⚡ SLAM GIN".
   - Tapping the discard pile or finish slot drops the card into position.
2. **Drag-to-Play**:
   - **Activation Threshold**: Finger movement must exceed **30 dp** (`dragDistance > 30px`) before a drag gesture initiates, preventing accidental plays when shifting grip.
   - **Upward Discard Drag**: Dragging a card upwards past the top boundary of the hand ($y < -60\text{px}$) activates the discard snap.
   - **Target Proximity**: Dragging directly toward the Discard Pile or Finish Slot provides visual magnetic attraction.

---

## 3. Landscape Dynamic Card Fanning Geometry

In landscape, cards have ample horizontal width. Card proportions must be carefully tuned so they don't consume the central felt:

### 3.1 Landscape Dimensions & Mathematics
- **Card Size**: Hand cards use `w-[62px] h-[92px]` to `w-[68px] h-[102px]` on standard mobile viewports (e.g. 844×390).
- **Fan Arc & Spacing**:
  Given $N$ cards ($N \in [10, 13]$) and current card index $i \in [0, N-1]$:
  $$\text{normalizedIndex} = i - \frac{N - 1}{2}$$
  $$\text{spacingPx} = \text{clamp}\left(48 - (N - 10) \times 4.5, 34\text{px}, 52\text{px}\right)$$
  $$\text{rotationAngle} = \text{normalizedIndex} \times \left(\frac{22^\circ}{\max(N, 1)}\right) \quad (\text{clamped between } -12^\circ \text{ and } +12^\circ)$$
  $$\text{horizontalOffset} = \text{normalizedIndex} \times \text{spacingPx}$$
  $$\text{parabolicDrop} = \left(\frac{2 \times |\text{normalizedIndex}|}{N}\right)^2 \times 9\text{px}$$

- **11th Drawn Card Slot**:
  - The 11th card sits with an intentional $+18\text{px}$ visual gap on the right flank of the hand, tagged with a subtle `"11TH"` badge so the player instantly spots their drawn card.

---

## 4. Game Feel, Juice & Sensory Feedback in Landscape

### 4.1 Haptic Feedback Profiles
- **Card Tap/Select**: Light tactile impulse ($10\text{ms}$).
- **Card Fling/Discard**: Medium crisp release ($20\text{ms}$).
- **Meld Lock**: Satisfying double-click ($15\text{ms}$ pause $20\text{ms}$).
- **Maldivian Gin Slam**: Heavy three-stage thud ($40\text{ms}$ pause $30\text{ms}$ pulse $60\text{ms}$) combined with table felt camera shake.

### 4.2 Turn Urgency Vignette
- **Remaining Time > 10s**: Calm emerald/gold status pill.
- **5s – 10s**: Subtle amber pulse.
- **Critical < 5s**: Full-screen perimeter crimson radial vignette (`box-shadow: inset 0 0 50px rgba(239, 68, 68, 0.6)`) with 1.2Hz heart-beat pulse, focusing player attention without obstructing card readability.

### 4.3 Maldivian Visual Identity & Craft
- **Ocean Felt Backdrop**: Deep Indian Ocean teal/navy felt (`#061a26` to `#0c2b3d`) with subtle woven cloth texture.
- **Teak & Coconut Wood Trim**: Warm golden teak table borders.
- **Gin Slam Celebration**: Slow-motion card impact onto the face-down slot, golden radial shockwaves, Thaana celebratory banner (*ޑިގު!*), and confetti shower.
