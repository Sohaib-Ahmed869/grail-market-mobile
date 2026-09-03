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
      {/* Five, with Scan raised in the middle. Search moved into the home
          header — it is a thing you do to the content, not a place you go,
          and it was taking a slot the product's own verb deserved. */}
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="watchlist" options={{ title: "Watching" }} />
      <Tabs.Screen name="portfolio" options={{ title: "Collection" }} />
      {/* Reachable, not a tab. Search lives in the home header; profile is
          the avatar next to it, which is where people look for themselves. */}
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
