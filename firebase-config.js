/* ============================================
   FIREBASE CONFIG — Poker de Quinta 2027
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAdQ5YfqyZ0Uhu234OPW3hK1QzvZw9bjlw",
  authDomain:        "pdqhml.firebaseapp.com",
  databaseURL:       "https://pdqhml-default-rtdb.firebaseio.com",
  projectId:         "pdqhml",
  storageBucket:     "pdqhml.firebasestorage.app",
  messagingSenderId: "166410002787",
  appId:             "1:166410002787:web:e04bf2c3c4a7ebb8577356",
  measurementId:     "G-MJBNCJBDZK"
};

export const app = initializeApp(firebaseConfig);
export const db  = getDatabase(app);
export const DATA_PATH = "pdq/data";