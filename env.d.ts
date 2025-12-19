/**
 * Environment Variable Type Declarations
 * These variables are loaded from .env via react-native-dotenv
 */

declare module '@env' {
  export const OPENAI_API_KEY: string;
  export const OPENAI_MODEL: string;
}
