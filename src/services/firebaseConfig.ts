/**
 * Configuração do Firebase para Liberdade Academy.
 * 
 * Para ativar, instale:
 *   npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore
 * 
 * E preencha as variáveis de ambiente no .env:
 *   EXPO_PUBLIC_FIREBASE_API_KEY=
 *   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
 *   EXPO_PUBLIC_FIREBASE_PROJECT_ID=
 *   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
 *   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
 *   EXPO_PUBLIC_FIREBASE_APP_ID=
 */

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};
