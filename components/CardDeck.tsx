import { useEffect, useRef } from "react";
import { Dimensions, Image, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, {
  Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { Txt } from "./Text";
import { CardArt } from "./CardArt";
import { colors, radius, shadow, space } from "../theme";

export type DeckCard = { cardId: string; name: string; localId: string; imageUrl: string | null };

const { width: SCREEN } = Dimensions.get("window");
const CARD_W = Math.round(SCREEN * 0.62);
const CARD_H = Math.round(CARD_W / 0.72);
const GAP = space.md;
const STEP = CARD_W + GAP;
const SIDE = (SCREEN - CARD_W) / 2;

/** A set as a hand of cards you thumb through.
 *
 *  One card is in front of you; the next and the last peek in from either
 *  side, a little smaller and turned away, and a swipe brings one of them to
 *  the middle. The page underneath re-points at whichever card is in the
 *  middle, so the price and the market below are always for the card you are
 *  looking at. Flicking through a set to see what is worth anything is the
 *  thing a collector actually does with a set, and a grid of thumbnails is
 *  not that.
 *
 *  The pager owns the swipe and reports the card; it does not own the page.
 */
export function CardDeck({
  cards, currentId, onChange,
}: {
  cards: DeckCard[];
  currentId: string;
  onChange: (card: DeckCard) => void;
}) {
  const list = useRef<Animated.FlatList<DeckCard>>(null);
  const x = useSharedValue(0);
  const start = Math.max(0, cards.findIndex((c) => c.cardId === currentId));
  // The index the page was told about last, so a scroll that settles on the
  // same card does not re-announce it and refetch everything for nothing.
  const announced = useRef(start);

  // Jump to the card after the list has mounted, rather than asking the list
  // to be born there. With `initialScrollIndex` the card at that index was
  // the one rendered before the list had measured itself, and its picture
  // never loaded — a valid URL, both neighbours fine, the centre blank on
  // every fresh open. Rendering from zero and scrolling once the list exists
  // takes that first-paint path out of the picture entirely.
  useEffect(() => {
    x.value = start * STEP;
    const t = setTimeout(() => {
      list.current?.scrollToIndex({ index: start, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [start, x]);

  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });

  const settled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / STEP);
    const card = cards[Math.min(cards.length - 1, Math.max(0, i))];
    if (!card || i === announced.current) return;
    announced.current = i;
    onChange(card);
  };

  return (
    <View>
      <Animated.FlatList
        ref={list}
        data={cards}
        keyExtractor={(c) => c.cardId}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Snapping to the card, not free scrolling: a hand of cards has a
        // "this one" and a swipe should land on one, never between two.
        snapToInterval={STEP}
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={(_, i) => ({ length: STEP, offset: STEP * i, index: i })}
        onScrollToIndexFailed={({ index }) => {
          // The list has not laid out that far yet. Ask again next tick; it
          // has the layout table above so this is one retry, not a loop.
          setTimeout(() => list.current?.scrollToIndex({ index, animated: false }), 50);
        }}
        contentContainerStyle={{ paddingHorizontal: SIDE }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={settled}
        renderItem={({ item, index }) => <Face card={item} index={index} x={x} />}
      />
      <Counter cards={cards} x={x} />
    </View>
  );
}

function Face({ card, index, x }: { card: DeckCard; index: number; x: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    // How far this card is from the middle, in cards. 0 is front and centre.
    const d = (x.value - index * STEP) / STEP;
    const range = [-1, 0, 1];
    return {
      transform: [
        { scale: interpolate(d, range, [0.88, 1, 0.88], Extrapolation.CLAMP) },
        // Neighbours turn slightly away, the way cards do when fanned.
        { rotateZ: `${interpolate(d, range, [6, 0, -6], Extrapolation.CLAMP)}deg` },
        { translateY: interpolate(d, range, [18, 0, 18], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(d, [-2, -1, 0, 1, 2], [0.3, 0.72, 1, 0.72, 0.3], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.View style={[s.face, style]}>
      <CardArt uri={card.imageUrl} resizeMode="cover" iconSize={28} />
    </Animated.View>
  );
}

/** "12 of 154", tracking the swipe live rather than waiting for it to settle. */
function Counter({ cards, x }: { cards: DeckCard[]; x: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const i = Math.round(x.value / STEP);
    // The counter cannot read the number out of a shared value in JSX, so it
    // slides a strip of numbers instead — one per card, moved by index.
    return { transform: [{ translateY: -Math.min(cards.length - 1, Math.max(0, i)) * 18 }] };
  });
  return (
    <View style={s.counter}>
      <View style={s.counterWindow}>
        <Animated.View style={style}>
          {cards.map((c, i) => (
            <Txt key={c.cardId} variant="overline" color={colors.inkFaint} style={s.counterRow}>
              {i + 1}
            </Txt>
          ))}
        </Animated.View>
      </View>
      <Txt variant="overline" color={colors.inkFaint}> of {cards.length}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  face: {
    width: CARD_W, height: CARD_H, marginRight: GAP,
    borderRadius: radius.lg, overflow: "hidden",
    backgroundColor: colors.surfaceSunk,
    ...shadow.lifted,
  },
  counter: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: space.md },
  counterWindow: { height: 18, overflow: "hidden" },
  counterRow: { height: 18, lineHeight: 18, textAlign: "right" },
});
