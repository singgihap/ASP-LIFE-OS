// js/app.js
import { auth, db, appId } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, query, orderBy, onSnapshot, limit, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import * as AuthFuncs from './auth.js';
import * as DB from './db.js';
import * as UI from './ui.js';
import * as Utils from './utils.js';

// --- STATE ---
let currentUser = null;
let globalGoals = [];
let itemToDelete = null;
let globalData = { tasks: [], transactions: [], habits: [] };

// --- 1. EXPOSE AUTH FUNCTIONS (Agar tombol Login berfungsi) ---
window.handleEmailLogin = () => AuthFuncs.handleEmailLogin(document.getElementById('email-input').value, document.getElementById('password-input').value);
window.handleEmailRegister = () => AuthFuncs.handleEmailRegister(document.getElementById('email-input').value, document.getElementById('password-input').value);
window.loginSystem = AuthFuncs.loginSystem;
window.logout = AuthFuncs.logoutUser;
window.showLoginButtons = () => { document.getElementById('login-loading').classList.add('hidden'); document.getElementById('login-forms').classList.remove('hidden'); };

// --- 2. UI Navigation ---
window.switchView = UI.switchView;
window.toggleZenMode = () => {
    document.body.classList.toggle('zen-mode');
    // Opsional: Request Fullscreen biar makin immersive
    if (document.body.classList.contains('zen-mode')) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        if (document.fullscreenElement) document.exitFullscreen();
    }
};
window.toggleSidebar = () => {
    const sb = document.getElementById('main-sidebar');
    const icon = document.getElementById('sidebar-icon');
    if (window.innerWidth < 768) sb.classList.toggle('mobile-expanded');
    else {
        sb.classList.toggle('w-64'); sb.classList.toggle('collapsed');
        icon.innerText = sb.classList.contains('collapsed') ? 'chevron_right' : 'chevron_left';
    }
};

// --- 3. Timer Logic ---
window.toggleTimer = Utils.toggleTimer;
window.resetTimer = Utils.resetTimer;
window.toggleTimerEdit = Utils.toggleTimerEdit; 
window.saveCustomTimer = () => {
    const val = document.getElementById('custom-minutes-input').value;
    Utils.saveCustomTime(val);
};

// --- 4. Finance Helper ---
window.setTransType = (t) => {
    document.getElementById('trans-type').value = t;
    const bi = document.getElementById('btn-income'); const be = document.getElementById('btn-expense');
    if (t === 'income') { bi.className = "py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow-md transition-all"; be.className = "py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition-all"; }
    else { bi.className = "py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition-all"; be.className = "py-2 text-xs font-bold rounded-lg bg-rose-600 text-white shadow-md transition-all"; }
};

window.handleTransaction = async (e) => {
    e.preventDefault();
    const amt = document.getElementById('trans-amount').value;
    const desc = document.getElementById('trans-desc').value;
    const type = document.getElementById('trans-type').value;
    const cat = document.getElementById('trans-category').value;
    if (amt && currentUser) {
        await DB.addItem(currentUser.uid, 'transactions', { amount: parseInt(amt), note: desc, type, category: cat });
        await DB.logEvent(currentUser.uid, 'TRANSACTION_ADDED', `${type}: ${desc}`, { type });
        await DB.addXP(currentUser.uid, 2); // +2 XP
        e.target.reset(); Utils.showEnhancedNotification('Saved', 'success');
    }
};

// --- 5. Second Brain Logic (Updated) ---
// Helper Pilih Warna
window.selectNoteColor = (color) => {
    const input = document.getElementById('new-note-color');
    if(input) input.value = color;
    
    ['slate','blue','green','rose','amber'].forEach(c => {
        const btn = document.getElementById(`color-${c}`);
        if(btn) {
            btn.classList.remove('border-white');
            btn.classList.add('border-transparent');
        }
    });
    
    const active = document.getElementById(`color-${color}`);
    if(active) {
        active.classList.remove('border-transparent');
        active.classList.add('border-white');
    }
};

window.createNote = async () => {
    const t = document.getElementById('new-note-title').value;
    const c = document.getElementById('new-note-content').value;
    const tagsVal = document.getElementById('new-note-tags').value;
    const tags = tagsVal ? tagsVal.split(',').map(s => s.trim()) : [];
    
    // Fitur Baru: Warna & Pin
    const colorElem = document.getElementById('new-note-color');
    const color = colorElem ? colorElem.value : 'slate';
    
    const pinElem = document.getElementById('new-note-pin');
    const isPinned = pinElem ? pinElem.checked : false;

    if (t && currentUser) {
        await DB.addItem(currentUser.uid, 'notes', { 
            title: t, 
            content: c, 
            tags, 
            color,       
            isPinned     
        });
        
        await DB.logEvent(currentUser.uid, 'NOTE_ADDED', `Note: ${t}`);
        await DB.addXP(currentUser.uid, 5); // +5 XP untuk mencatat ide
        
        // Reset Form
        document.getElementById('note-modal').classList.add('hidden');
        document.getElementById('new-note-title').value = '';
        document.getElementById('new-note-content').value = '';
        document.getElementById('new-note-tags').value = '';
        if(pinElem) pinElem.checked = false;
        window.selectNoteColor('slate'); 
        
        Utils.showEnhancedNotification('Note Created!', 'success');
    }
};

// --- 6. Other Creates ---
window.handleQuickCapture = async (e) => {
    if (e.key === 'Enter' && e.target.value.trim() && currentUser) {
        await DB.addItem(currentUser.uid, 'tasks', { text: e.target.value, completed: false });
        await DB.logEvent(currentUser.uid, 'TASK_ADDED', `Task: ${e.target.value}`);
        e.target.value = ''; Utils.showEnhancedNotification('Task added', 'success');
    }
};

window.createProject = async () => {
    const name = document.getElementById('new-project-name').value;
    const goalId = document.getElementById('new-project-goal').value;
    if (name && currentUser) {
        await DB.addItem(currentUser.uid, 'projects', { name, goalId, status: 'todo' });
        document.getElementById('project-modal').classList.add('hidden');
        Utils.showEnhancedNotification('Project created', 'success');
    }
};

window.createGoal = async () => {
    const title = document.getElementById('new-goal-title').value;
    const area = document.getElementById('new-goal-area').value;
    if (title && currentUser) {
        await DB.addItem(currentUser.uid, 'goals', { title, area, progress: 0 });
        document.getElementById('goal-modal').classList.add('hidden');
        Utils.showEnhancedNotification('Goal set', 'success');
    }
};

window.createHabit = async () => {
    const name = document.getElementById('new-habit-name').value;
    if (name && currentUser) {
        await DB.addItem(currentUser.uid, 'habits', { name, streak: 0, history: {} });
        document.getElementById('habit-modal').classList.add('hidden');
    }
};

window.createLibraryItem = async () => {
    const t = document.getElementById('new-lib-title').value;
    if (t && currentUser) {
        await DB.addItem(currentUser.uid, 'library', {
            title: t, type: document.getElementById('new-lib-type').value, status: document.getElementById('new-lib-status').value
        });
        document.getElementById('library-modal').classList.add('hidden');
    }
};

// --- 7. Updates & Toggles ---
window.toggleTaskComplete = async (id) => {
    await DB.updateItem(currentUser.uid, 'tasks', id, { completed: true, completedAt: serverTimestamp() });
    await DB.logEvent(currentUser.uid, 'TASK_COMPLETED', 'Task Completed (+10 XP)');
    
    // TAMBAHAN BARU:
    const res = await DB.addXP(currentUser.uid, 10); // +10 XP
    if(res.leveledUp) Utils.showEnhancedNotification(`LEVEL UP! You are now Level ${res.newLevel} 🎉`, 'success');
    else Utils.showEnhancedNotification('Task Finished! +10 XP', 'success');
};

window.toggleHabit = async (id) => {
    const res = await DB.toggleHabitCheck(currentUser.uid, id);
    if (res.done) {
        await DB.logEvent(currentUser.uid, 'HABIT_DONE', `Habit: ${res.name} (+5 XP)`);
        await DB.addXP(currentUser.uid, 5); // +5 XP
        Utils.showEnhancedNotification('Habit Done! +5 XP', 'success');
    }
};

window.updateGoalProgress = (id, val) => DB.updateItem(currentUser.uid, 'goals', id, { progress: parseInt(val) });
window.updateLibraryStatus = (id, val) => DB.updateItem(currentUser.uid, 'library', id, { status: val });

// --- 8. Wellness ---
window.setMood = async (m) => {
    if (!currentUser) return;
    await DB.updateWellness(currentUser.uid, 'mood', m);
    await DB.logEvent(currentUser.uid, 'MOOD_SET', `Mood: ${m}`);
};
window.updateWater = async (n) => await DB.updateWellness(currentUser.uid, 'water', n);

// --- 9. Delete System ---
window.askDelete = (coll, id, type = 'soft') => {
    itemToDelete = { coll, id, type };
    document.getElementById('delete-modal').classList.remove('hidden');
    document.getElementById('delete-modal').classList.add('flex');
};
window.closeDeleteModal = () => {
    itemToDelete = null;
    document.getElementById('delete-modal').classList.add('hidden');
    document.getElementById('delete-modal').classList.remove('flex');
};
window.executeDelete = async () => {
    if (!itemToDelete || !currentUser) return;
    if (itemToDelete.type === 'permanent') await DB.hardDelete(currentUser.uid, itemToDelete.coll, itemToDelete.id);
    else await DB.softDelete(currentUser.uid, itemToDelete.coll, itemToDelete.id);
    window.closeDeleteModal();
    if (document.getElementById('view-trash').classList.contains('hidden') === false) window.loadTrashItems();
};

window.loadTrashItems = async () => {
    if (!currentUser) return;
    const items = await DB.getTrashItems(currentUser.uid);
    const container = document.getElementById('trash-container');
    container.innerHTML = items.length === 0 ? '<div class="col-span-full text-center text-slate-500">Trash Kosong</div>' : '';
    items.forEach(item => {
        const el = document.createElement('div'); el.className = 'card-enhanced flex flex-col';
        el.innerHTML = `<div class="flex justify-between mb-2"><span class="status-badge status-pending uppercase">${item.coll}</span></div><p class="text-white mb-4 flex-1 font-bold">${item.title || item.name || item.text || item.note}</p><div class="grid grid-cols-2 gap-2"><button onclick="window.restoreItem('${item.coll}','${item.id}')" class="btn-secondary text-xs font-bold py-2 rounded">Restore</button><button onclick="window.askDelete('${item.coll}','${item.id}', 'permanent')" class="bg-rose-900/30 text-rose-400 text-xs font-bold py-2 rounded hover:bg-rose-900/50">Delete</button></div>`;
        container.appendChild(el);
    });
};
window.restoreItem = async (c, i) => {
    await DB.restoreItem(currentUser.uid, c, i);
    window.loadTrashItems();
};

// --- 10. Modals & Close Day ---
window.openProjectModal = () => document.getElementById('project-modal').classList.remove('hidden');
window.openGoalModal = () => document.getElementById('goal-modal').classList.remove('hidden');
window.openNoteModal = () => document.getElementById('note-modal').classList.remove('hidden');
window.openLibraryModal = () => document.getElementById('library-modal').classList.remove('hidden');
window.openHabitModal = () => document.getElementById('habit-modal').classList.remove('hidden');

window.closeDaySummary = async () => {
    if (!currentUser) return;
    if (!confirm("Siap menutup hari ini?")) return;
    
    const todayISO = new Date().toISOString().split('T')[0];
    const tasksDone = globalData.tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt.seconds * 1000).toISOString().split('T')[0] === todayISO).length;
    let expenseToday = 0; 
    globalData.transactions.forEach(t => { if(t.createdAt && new Date(t.createdAt.seconds * 1000).toISOString().split('T')[0] === todayISO && t.type === 'expense') expenseToday += t.amount; });
    
    const summaryData = { date: todayISO, stats: { tasksDone, expenseToday }, createdAt: serverTimestamp() };
    await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'summaries', todayISO), summaryData);
    await DB.logEvent(currentUser.uid, 'DAY_CLOSED', `Tasks: ${tasksDone}`, summaryData.stats);
    Utils.showEnhancedNotification("Hari Ditutup!", 'success');
    setTimeout(() => window.switchView('dashboard'), 1000);
};

// --- CATEGORY MANAGER ---
window.openCategoryModal = () => document.getElementById('category-modal').classList.remove('hidden');

window.addCategory = async () => {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    if (name && currentUser) {
        try {
            await DB.addCategory(currentUser.uid, name);
            input.value = '';
            Utils.showEnhancedNotification('Kategori ditambahkan', 'success');
        } catch (e) {
            Utils.showEnhancedNotification(e.message, 'error');
        }
    }
};

window.deleteCategory = async (id) => {
    if (confirm('Hapus kategori ini?')) {
        await DB.deleteCategory(currentUser.uid, id);
        Utils.showEnhancedNotification('Kategori dihapus', 'success');
    }
};

// --- INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('login-overlay');
    if (user) {
        currentUser = user;
        overlay.style.display = 'none';
        document.getElementById('user-name').innerText = user.displayName || user.email.split('@')[0];
        
        const avatar = document.getElementById('user-avatar');
        if(avatar) avatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=1e293b&color=fff`;
        
        // Start Listeners
        initRealtimeListeners(user.uid);
        Utils.initTimer(); 
        Utils.initWeather();
        setInterval(() => { 
            const clk = document.getElementById('live-clock');
            if(clk) clk.innerText = new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}); 
        }, 1000);
    } else {
        currentUser = null;
        overlay.style.display = 'flex';
        document.getElementById('login-loading').classList.add('hidden');
        document.getElementById('login-forms').classList.remove('hidden');
    }
});

function initRealtimeListeners(uid) {
    const qRef = (c) => query(collection(db, 'artifacts', appId, 'users', uid, c), orderBy('createdAt', 'desc'));
    
    // Logs
    onSnapshot(query(collection(db, 'artifacts', appId, 'users', uid, 'logs'), orderBy('createdAt', 'desc'), limit(50)), s => {
        const todayStr = new Date().toDateString();
        UI.renderDailyLogUI(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => l.date === todayStr));
    });
    // Goals
    onSnapshot(qRef('goals'), s => {
        globalGoals = s.docs.map(d => ({ id: d.id, ...d.data() }));
        UI.renderGoals(globalGoals.filter(x => !x.deleted));
        const sel = document.getElementById('new-project-goal');
        if(sel) sel.innerHTML = '<option value="">-- No Goal Linked --</option>' + globalGoals.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
    });
    // Projects
    onSnapshot(qRef('projects'), s => UI.renderProjects(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deleted), globalGoals, async (evt) => {
        const pid = evt.item.getAttribute('data-id');
        const st = evt.to.id.replace('col-', '');
        if (pid) await DB.updateItem(uid, 'projects', pid, { status: st });
    }));
    // Tasks
    onSnapshot(qRef('tasks'), s => {
        globalData.tasks = s.docs.map(d => d.data());
        UI.renderTasks(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deleted));
    });
    // Finance
    onSnapshot(qRef('transactions'), s => {
        globalData.transactions = s.docs.map(d => d.data());
        const transData = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deleted);
        UI.renderFinance(transData);
        UI.renderFinanceChart(transData);
    });
    // Habits
    onSnapshot(query(collection(db, 'artifacts', appId, 'users', uid, 'habits'), orderBy('createdAt', 'asc')), s => {
        globalData.habits = s.docs.map(d => d.data());
        UI.renderHabits(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deleted));
    });
    // Library
    onSnapshot(qRef('library'), s => UI.renderLibrary(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deleted)));
    // Notes
    onSnapshot(qRef('notes'), s => UI.renderNotes(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => !x.deleted)));
    
    // Wellness
    const today = new Date().toISOString().split('T')[0];
    onSnapshot(doc(db, 'artifacts', appId, 'users', uid, 'wellness', today), (d) => {
        if (d.exists()) { const dt = d.data(); UI.updateMoodUI(dt.mood); UI.updateWaterUI(dt.water || 0); }
        else { UI.updateWaterUI(0); UI.updateMoodUI(null); }
    });

    // 9. Gamification Stats (Listener)
    onSnapshot(doc(db, 'artifacts', appId, 'users', uid, 'stats', 'profile'), (d) => {
        if (d.exists()) {
            const s = d.data();
            UI.updateLevelUI(s.xp || 0, s.level || 1);
        } else {
            UI.updateLevelUI(0, 1);
        }
    });

    // 10. Categories
    onSnapshot(query(collection(db, 'artifacts', appId, 'users', uid, 'categories'), orderBy('name', 'asc')), s => {
        const cats = s.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Jika kosong, buat default (hanya sekali jalan)
        if (cats.length === 0) {
            DB.seedDefaultCategories(uid);
        } else {
            UI.renderCategories(cats);
        }
    });
}