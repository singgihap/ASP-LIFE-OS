// js/db.js
import { db, appId } from './firebase-config.js';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs, query, where, setDoc, deleteField, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// --- LOGGING SYSTEM ---
export async function logEvent(uid, type, message, metadata = {}) {
    if (!uid) return;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'users', uid, 'logs'), {
            type, message, metadata, createdAt: serverTimestamp(), date: new Date().toDateString()
        });
    } catch (e) { console.error("Log error", e); }
}

// --- GENERIC CRUD ---
export async function addItem(uid, collectionName, data) {
    return await addDoc(collection(db, 'artifacts', appId, 'users', uid, collectionName), {
        ...data, createdAt: serverTimestamp()
    });
}

export async function updateItem(uid, collectionName, docId, data) {
    const ref = doc(db, 'artifacts', appId, 'users', uid, collectionName, docId);
    return await updateDoc(ref, data);
}

// --- SOFT DELETE & RESTORE ---
export async function softDelete(uid, collectionName, docId) {
    return await updateItem(uid, collectionName, docId, { deleted: true, deletedAt: serverTimestamp() });
}

export async function restoreItem(uid, collectionName, docId) {
    return await updateItem(uid, collectionName, docId, { deleted: false });
}

// --- HARD DELETE (PERMANEN) ---
export async function hardDelete(uid, collectionName, docId) {
    return await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, collectionName, docId));
}

// --- KHUSUS: HABITS ---
export async function toggleHabitCheck(uid, habitId) {
    const ref = doc(db, 'artifacts', appId, 'users', uid, 'habits', habitId);
    const todayISO = new Date().toISOString().split('T')[0];
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
        const data = snap.data();
        const history = data.history || {};
        if (history[todayISO]) {
            await updateDoc(ref, { [`history.${todayISO}`]: deleteField() });
            return { done: false, name: data.name };
        } else {
            await updateDoc(ref, { [`history.${todayISO}`]: true });
            return { done: true, name: data.name };
        }
    }
}

// --- KHUSUS: WELLNESS (WATER/MOOD) ---
export async function updateWellness(uid, type, value) {
    const today = new Date().toISOString().split('T')[0];
    const ref = doc(db, 'artifacts', appId, 'users', uid, 'wellness', today);
    
    if (type === 'mood') {
        await setDoc(ref, { mood: value }, { merge: true });
    } else if (type === 'water') {
        const snap = await getDoc(ref);
        let cur = snap.exists() ? (snap.data().water || 0) : 0;
        let val = cur + value;
        if (val > 8) val = 8; if (val < 0) val = 0;
        await setDoc(ref, { water: val }, { merge: true });
    }
}

// --- LOAD TRASH ---
export async function getTrashItems(uid) {
    let allItems = [];
    const collections = ['goals', 'projects', 'tasks', 'transactions', 'library', 'notes', 'habits'];
    
    for (const c of collections) {
        const q = query(collection(db, 'artifacts', appId, 'users', uid, c), where('deleted', '==', true));
        const snap = await getDocs(q);
        snap.forEach(d => allItems.push({ id: d.id, coll: c, ...d.data() }));
    }
    return allItems;
}

// --- GAMIFICATION SYSTEM ---
export async function addXP(uid, amount) {
    const ref = doc(db, 'artifacts', appId, 'users', uid, 'stats', 'profile');
    
    try {
        const snap = await getDoc(ref);
        let currentXP = 0;
        let currentLevel = 1;

        if (snap.exists()) {
            const data = snap.data();
            currentXP = data.xp || 0;
            currentLevel = data.level || 1;
        }

        // Tambah XP
        let newXP = currentXP + amount;
        
        // Hitung Level (Setiap 100 XP = 1 Level)
        // Rumus: Level = Floor(XP / 100) + 1
        let newLevel = Math.floor(newXP / 100) + 1;

        // Simpan ke DB
        await setDoc(ref, { 
            xp: newXP, 
            level: newLevel,
            lastUpdated: serverTimestamp() 
        }, { merge: true });

        // Cek Level Up untuk Notifikasi (Optional return value)
        return { newXP, newLevel, leveledUp: newLevel > currentLevel };

    } catch (e) {
        console.error("Gagal tambah XP:", e);
    }
}

export async function getUserStats(uid) {
    const ref = doc(db, 'artifacts', appId, 'users', uid, 'stats', 'profile');
    const snap = await getDoc(ref);
    if(snap.exists()) return snap.data();
    return { xp: 0, level: 1 };
}

// --- CATEGORY MANAGEMENT ---
export async function addCategory(uid, name) {
    // Cek duplikat (Simple check)
    const q = query(collection(db, 'artifacts', appId, 'users', uid, 'categories'), where('name', '==', name));
    const snap = await getDocs(q);
    if (!snap.empty) throw new Error("Kategori sudah ada!");

    await addDoc(collection(db, 'artifacts', appId, 'users', uid, 'categories'), {
        name: name,
        createdAt: serverTimestamp()
    });
}

export async function deleteCategory(uid, id) {
    await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'categories', id));
}

// Helper: Buat kategori default jika kosong
export async function seedDefaultCategories(uid) {
    const defaults = ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Gaji', 'Investasi'];
    const colRef = collection(db, 'artifacts', appId, 'users', uid, 'categories');
    const snap = await getDocs(colRef);
    
    if (snap.empty) {
        const batch = [];
        defaults.forEach(name => {
            addCategory(uid, name); // Satu per satu (biar simple)
        });
    }
}