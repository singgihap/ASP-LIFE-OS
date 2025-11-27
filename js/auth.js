// js/auth.js
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    setPersistence, 
    browserLocalPersistence, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithRedirect 
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from './firebase-config.js';

export const handleEmailLogin = async (email, password) => {
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        console.error(e);
        throw new Error(e.message);
    }
};

export const handleEmailRegister = async (email, password) => {
    try {
        await setPersistence(auth, browserLocalPersistence);
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
        console.error(e);
        throw new Error(e.message);
    }
};

export const loginSystem = async () => {
    try {
        const provider = new GoogleAuthProvider();
        if (/Android|iPhone/i.test(navigator.userAgent)) {
            await signInWithRedirect(auth, provider);
        } else {
            await signInWithPopup(auth, provider);
        }
    } catch (e) {
        console.error(e);
        throw new Error(e.message);
    }
};

export const logoutUser = () => signOut(auth);