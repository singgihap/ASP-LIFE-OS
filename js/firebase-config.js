// js/firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDaZF1qTGo-avooRZn-HDVtDqMeN14naZY",
    authDomain: "asp-life-os.firebaseapp.com",
    projectId: "asp-life-os",
    storageBucket: "asp-life-os.firebasestorage.app",
    messagingSenderId: "1072101268320",
    appId: "1:1072101268320:web:cbbe693e534919d4cedc05",
    measurementId: "G-RB2W8XZ87F"
};

// Inisialisasi
const app = initializeApp(firebaseConfig);

// Export service agar bisa dipakai di file lain
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'singgih-life-os-v38';