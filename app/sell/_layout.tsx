import { Stack } from "expo-router";
import { colors } from "../../theme";

export default function SellLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.washBottom },
        // Five steps in a row: sliding right each time is what makes it feel
        // like progress through a form rather than five unrelated screens.
        animation: "slide_from_right",
        animationDuration: 400,
      }}
    />
  );
}
