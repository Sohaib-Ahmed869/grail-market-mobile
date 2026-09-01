import { Platform, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, radius } from "../../theme";

/** The signed-in app.
 *
 *  Scan sits in the middle and is raised, because it is the thing the product
 *  is for — everything else is what you do with what a scan told you. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: ({ color }) => <Feather name="search" size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ focused }) => (
            <View style={[s.scan, focused && s.scanOn]}>
              <Feather name="maximize" size={20} color={focused ? colors.onPrimary : colors.ink} />
            </View>
          ),
          tabBarLabelStyle: { fontSize: 10.5, fontWeight: "500", marginTop: 4 },
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{ title: "Portfolio", tabBarIcon: ({ color }) => <Feather name="briefcase" size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} /> }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  scan: {
    width: 42, height: 34, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: colors.lineStrong,
  },
  scanOn: { backgroundColor: colors.ink, borderColor: colors.ink },
});
