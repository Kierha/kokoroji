export default {
  expo: {
    name: "KOKOROJI",
    slug: "kokoroji-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./src/assets/logo-kokoroji.png",
    userInterfaceStyle: "light",
  // Toggle nouvelle architecture (Fabric/TurboModules) via variable d'env si besoin d'isoler un bug
  newArchEnabled: (process.env.EXPO_PUBLIC_NEW_ARCH ?? 'true') !== 'false',
    splash: {
      image: "./src/assets/kokoroji-simple.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.korosphere.kokorojiapp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/logo-kokoroji.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.korosphere.kokorojiapp",
    },
    web: {
      favicon: "./src/assets/logo-kokoroji.png",
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
      EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
      eas: {
        projectId: "4a120cfd-4230-4cb7-ade3-9de3b893f5ca",
      },
    },
  plugins: ["expo-sqlite"],
  },
};
