const colors = {
  light: {
    text: "#0f1729",
    tint: "#0369a1",

    background: "#f8fafc",
    foreground: "#0f1729",

    card: "#ffffff",
    cardForeground: "#0f1729",

    primary: "#0369a1",
    primaryForeground: "#f7f9fc",

    secondary: "#dde3ed",
    secondaryForeground: "#0f1729",

    muted: "#ebeff5",
    mutedForeground: "#6b7a91",

    accent: "#1ea082",
    accentForeground: "#ffffff",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#e2e8f0",
    input: "#e2e8f0",

    sidebar: "#0f172a",
    sidebarForeground: "#f8fafc",

    recording: "#ef4444",
    recordingBg: "#fef2f2",
    recordingRing: "rgba(239,68,68,0.22)",

    success: "#16a34a",
    successBg: "#f0fdf4",
  },
  radius: 12,
};

export default colors;

export function useColors() {
  return colors.light;
}
