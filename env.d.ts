/**
 * Environment Variable Type Declarations
 * These variables are loaded from .env via react-native-dotenv
 */

declare module '@env' {
  export const OPENAI_API_KEY: string;
  export const OPENAI_MODEL: string;
  export const REVENUECAT_API_KEY_IOS: string | undefined;
  export const REVENUECAT_API_KEY_ANDROID: string | undefined;
}

declare module 'react-native-vector-icons/Ionicons';
