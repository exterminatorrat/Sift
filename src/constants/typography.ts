import { TextStyle } from "react-native";

export const fontFamilies = {
  heading: "SourceSerif4_400Regular",
  headingMedium: "SourceSerif4_500Medium",
  headingSemiBold: "SourceSerif4_600SemiBold",
  headingBold: "SourceSerif4_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  bodyExtraBold: "Inter_800ExtraBold",
  bodyBlack: "Inter_900Black"
} as const;

export const typography = {
  display: {
    fontFamily: fontFamilies.heading,
    fontSize: 36,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 44
  },
  title: {
    fontFamily: fontFamilies.headingSemiBold,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 36
  },
  pageTitle: {
    fontFamily: fontFamilies.headingSemiBold,
    fontSize: 25,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 33
  },
  sectionTitle: {
    fontFamily: fontFamilies.headingMedium,
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 28
  },
  bodyLarge: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 26
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 23
  },
  bodySmall: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 21
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 18
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 18
  },
  button: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 21
  },
  badge: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 16
  },
  nav: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 14
  }
} satisfies Record<string, TextStyle>;
