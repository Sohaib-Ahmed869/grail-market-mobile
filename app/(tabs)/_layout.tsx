import { Tabs } from "expo-router";
import { TabBar } from "../../components/TabBar";

/** The signed-in app.
 *
 *  The bar itself is ours — see TabBar. Expo's default is welded to the
 *  bottom edge, and the screens under it are written to scroll past a
 *  floating one instead. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Tabs are siblings, not a stack — one does not sit on top of
        // another, so sliding would be a lie about the hierarchy. They cross
        // fade, slowly enough to read as a change of place.
        animation: "fade",
        transitionSpec: {
          animation: "timing",
          config: { duration: 320 },
        },
        sceneStyle: { backgroundColor: "transparent" },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      {/* Five, with Scan raised in the middle. Catalogue sits opposite Home:
          the two places you arrive at, either side of the verb. */}
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="search" options={{ title: "Catalogue" }} />
      <Tabs.Screen name="portfolio" options={{ title: "Collection" }} />
      {/* Reachable, not a tab. Watching is one tap from Home and from the
          Collection header; profile is the avatar in the home header, which is
          where people look for themselves. */}
      <Tabs.Screen name="watchlist" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
