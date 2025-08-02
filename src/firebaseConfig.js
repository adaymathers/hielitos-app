// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tu configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCxoOzU4g8Gge0TgbLVChlXSbFXR6amqCs",
  authDomain: "hielitosapp.firebaseapp.com",
  projectId: "hielitosapp",
  storageBucket: "hielitosapp.firebasestorage.app",
  messagingSenderId: "921041391216",
  appId: "1:921041391216:web:6745b928d448396f5eaeb5"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore y exporta la base de datos
export const db = getFirestore(app);
