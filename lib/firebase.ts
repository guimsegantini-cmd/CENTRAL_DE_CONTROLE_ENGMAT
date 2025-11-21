import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: SUBSTITUA COM SUAS CHAVES DO FIREBASE CONSOLE
// 1. Acesse https://console.firebase.google.com/
// 2. Crie um projeto
// 3. Adicione um app Web
// 4. Copie as configurações abaixo
const firebaseConfig = {
  apiKey: "AIzaSyBZTGejcXR8EZi_NXJlauNhpRxAOtzdYpg",
  authDomain: "central-de-controle-engmat.firebaseapp.com",
  projectId: "central-de-controle-engmat",
  storageBucket: "central-de-controle-engmat.firebasestorage.app",
  messagingSenderId: "505664975666",
  appId: "1:505664975666:web:2731e94d8efb6755ff5d2b",
  measurementId: "G-QFSM6LMQ36"
};

// Initialize Firebase
// Check if config is placeholder to avoid crash during demo if not set
const isConfigured = firebaseConfig.apiKey !== "SUA_API_KEY_AQUI";

const app = isConfigured ? initializeApp(firebaseConfig) : null;

export const auth = isConfigured ? getAuth(app!) : null;
export const db = isConfigured ? getFirestore(app!) : null;
export const isFirebaseConfigured = isConfigured;
