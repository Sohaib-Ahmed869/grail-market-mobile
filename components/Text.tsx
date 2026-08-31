import { Text as RNText, type TextProps, type StyleProp, type TextStyle } from "react-native";
import { colors, type } from "../theme";

type Variant = keyof typeof type;

/** Every piece of text in the app comes through here, so a size or a face is
 *  never written at a call site. */
export function Txt({
  variant = "body",
  color = colors.ink,
  center,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string; center?: boolean; style?: StyleProp<TextStyle> }) {
  return (
    <RNText
      {...rest}
      style={[type[variant] as TextStyle, { color }, center && { textAlign: "center" }, style]}
    />
  );
}
