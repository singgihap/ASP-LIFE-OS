// js/ui.js
import { formatMoney } from './utils.js';

// --- CHART SYSTEM ---
let financeChartInstance = null; 

export function renderFinanceChart(transactions) {
    const ctx = document.getElementById('financeChart');
    if (!ctx || typeof window.Chart === 'undefined') return;
    const categoryTotals = {};
    let hasExpense = false;
    transactions.forEach(t => {
        if (t.type === 'expense') {
            hasExpense = true;
            const cat = t.category || 'Lainnya';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
        }
    });
    const sortedCats = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
    const dataValues = sortedCats.map(c => categoryTotals[c]);
    if (financeChartInstance) financeChartInstance.destroy();
    if (!hasExpense) return;
    financeChartInstance = new window.Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCats,
            datasets: [{
                label: 'Pengeluaran',
                data: dataValues,
                backgroundColor: ['rgba(244, 63, 94, 0.7)','rgba(59, 130, 246, 0.7)','rgba(16, 185, 129, 0.7)','rgba(245, 158, 11, 0.7)','rgba(139, 92, 246, 0.7)'],
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.raw); } } } },
            scales: { x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 }, callback: function(value) { return value/1000 + 'k'; } } }, y: { grid: { display: false }, ticks: { color: '#cbd5e0', font: { size: 11 } } } }
        }
    });
}

// --- NOTES (ENHANCED) ---
export function renderNotes(data) {
    const grid = document.getElementById('notes-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    if (data.length === 0) { 
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-12 flex flex-col items-center"><span class="material-symbols-rounded text-4xl mb-2 opacity-20">psychology</span><p class="text-sm">Otak kedua masih kosong.</p></div>`; 
        return; 
    }
    
    // Sort: Pinned first
    data.sort((a, b) => {
        if (!!a.isPinned === !!b.isPinned) return 0; 
        return a.isPinned ? -1 : 1; 
    });

    const colorMap = {
        slate: 'bg-slate-800/40 border-slate-700/50 hover:border-slate-500/50',
        blue: 'bg-blue-900/20 border-blue-500/20 hover:border-blue-400/50',
        green: 'bg-emerald-900/20 border-emerald-500/20 hover:border-emerald-400/50',
        rose: 'bg-rose-900/20 border-rose-500/20 hover:border-rose-400/50',
        amber: 'bg-amber-900/20 border-amber-500/20 hover:border-amber-400/50'
    };

    data.forEach(n => {
        const el = document.createElement('div');
        const bgClass = colorMap[n.color] || colorMap.slate;
        const pinIcon = n.isPinned ? '<span class="material-symbols-rounded text-[14px] text-yellow-500 rotate-45">keep</span>' : '';
        
        el.className = `card-enhanced h-56 flex flex-col relative group transition-all duration-300 hover:-translate-y-1 ${bgClass}`;
        
        const tagsHtml = n.tags ? n.tags.map(t => `<span class="text-[9px] bg-slate-950/50 border border-white/5 text-slate-400 px-2 py-0.5 rounded-md uppercase tracking-wide font-bold">${t.trim()}</span>`).join('') : '';
        
        el.innerHTML = `
            <button onclick="window.askDelete('notes','${n.id}')" class="absolute top-3 right-3 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all z-20 bg-slate-900/50 p-1 rounded-lg backdrop-blur-sm">
                <span class="material-symbols-rounded text-sm block">delete</span>
            </button>
            <div class="flex justify-between items-start mb-2 pr-6">
                <h4 class="font-bold text-white text-lg leading-tight line-clamp-2">${n.title}</h4>
                ${pinIcon}
            </div>
            <div class="flex flex-wrap gap-1 mb-3">${tagsHtml}</div>
            <div class="flex-1 overflow-hidden relative">
                <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-line line-clamp-4">${n.content}</p>
                <div class="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
            </div>
            <div class="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                 <span class="text-[10px] text-slate-500 font-mono">
                    ${n.createdAt ? new Date(n.createdAt.seconds*1000).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : 'Just now'}
                 </span>
            </div>
        `;
        grid.appendChild(el);
    });
}

// --- OTHERS (Standard) ---
export function renderTasks(data) {
    const list = document.getElementById('inbox-list');
    if (!list) return;
    
    // Update counter saja
    const pending = data.filter(t => !t.completed);
    const countEl = document.getElementById('inbox-count');
    if(countEl) countEl.innerText = pending.length;
    
    if (pending.length === 0) { 
        list.innerHTML = `<div class="col-span-full text-center text-slate-600 text-xs py-4">Inbox Kosong</div>`; 
        return; 
    }

    // --- TEKNIK SMART DIFFING (Hanya update yang berubah) ---

    // 1. Hapus elemen di layar yang sudah tidak ada di data baru (misal baru dihapus)
    const currentIds = Array.from(list.children).map(el => el.getAttribute('data-id')).filter(id => id);
    const newIds = pending.map(t => t.id);
    
    currentIds.forEach(id => {
        if (!newIds.includes(id)) {
            const el = list.querySelector(`[data-id="${id}"]`);
            if(el) el.remove();
        }
    });

    // 2. Tambah item baru atau biarkan item lama (jangan dirender ulang biar smooth)
    pending.forEach(t => {
        let el = list.querySelector(`[data-id="${t.id}"]`);
        
        // Template HTML untuk isi item
        const innerHTMLContent = `
            <button onclick="window.toggleTaskComplete('${t.id}')" class="mt-0.5 w-5 h-5 rounded-full border-2 border-slate-500 hover:border-green-500 hover:bg-green-500/20 transition-all flex-shrink-0"></button>
            <div class="flex-1"><p class="text-sm text-slate-200 font-medium leading-snug">${t.text}</p></div>
            <button onclick="window.askDelete('tasks','${t.id}')" class="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <span class="material-symbols-rounded text-sm">delete</span>
            </button>`;

        if (!el) {
            // Jika item belum ada, buat baru
            el = document.createElement('div');
            el.className = 'card-enhanced p-3 relative group flex items-start gap-3 fade-in';
            el.setAttribute('data-id', t.id); // Penting untuk penanda ID
            el.innerHTML = innerHTMLContent;
            list.appendChild(el);
        } else {
            // Jika item sudah ada, cek apakah teks berubah? Jika tidak, jangan apa-apakan.
            // Ini kunci agar animasi klik tidak reset.
            if (!el.innerHTML.includes(t.text)) {
                 el.innerHTML = innerHTMLContent;
            }
        }
    });
}

export function renderHabits(data) {
    const list = document.getElementById('habit-list');
    if (!list) return;
    list.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    if (data.length === 0) { list.innerHTML = `<div class="text-center text-slate-500 text-xs py-4">Habit Kosong</div>`; return; }
    data.forEach(h => {
        const isDone = h.history && h.history[today];
        const div = document.createElement('div');
        div.className = `flex items-center justify-between p-3 rounded-xl border mb-2 ${isDone ? 'bg-green-500/10 border-green-500/20' : 'bg-slate-800/30 border-slate-700/50'}`;
        div.innerHTML = `<div class="flex items-center gap-3"><button onclick="window.toggleHabit('${h.id}')" class="w-5 h-5 rounded-lg flex items-center justify-center ${isDone ? 'bg-green-500 text-white' : 'bg-slate-700 text-transparent'}"><span class="material-symbols-rounded text-sm">check</span></button><span class="text-xs font-medium text-slate-200">${h.name}</span></div><button onclick="window.askDelete('habits','${h.id}')" class="text-slate-600 opacity-0 md:group-hover:opacity-100"><span class="material-symbols-rounded text-sm">delete</span></button>`;
        list.appendChild(div);
    });
}
export function renderProjects(data, globalGoals, onDragEndCallback) {
    ['col-todo', 'col-progress', 'col-done'].forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = ''; });
    data.forEach(p => {
        const goal = globalGoals.find(g => g.id === p.goalId);
        const goalTag = goal ? `<div class="text-[10px] text-orange-400 mb-1 flex items-center gap-1"><span class="material-symbols-rounded text-[10px]">flag</span> ${goal.title}</div>` : '';
        const card = document.createElement('div');
        card.className = 'bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-sm hover:border-blue-500/50 cursor-pointer relative mb-2 group';
        card.setAttribute('data-id', p.id);
        card.innerHTML = `${goalTag}<h4 class="text-sm font-bold text-white leading-snug">${p.name}</h4><button onclick="window.askDelete('projects','${p.id}')" class="absolute top-2 right-2 text-slate-600 hover:text-red-400 opacity-100 md:opacity-0 md:group-hover:opacity-100"><span class="material-symbols-rounded text-sm">delete</span></button>`;
        const target = p.status === 'done' ? 'col-done' : (p.status === 'progress' ? 'col-progress' : 'col-todo');
        const col = document.getElementById(target); if(col) col.appendChild(card);
    });
    ['col-todo', 'col-progress', 'col-done'].forEach(c => { const el = document.getElementById(c); if (el) new Sortable(el, { group: 'kanban', animation: 150, ghostClass: 'sortable-ghost', onEnd: (evt) => onDragEndCallback(evt) }); });
}

export function renderGoals(data) {
    const grid = document.getElementById('goals-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-12 flex flex-col items-center"><span class="material-symbols-rounded text-4xl mb-2 opacity-20">flag</span><p class="text-sm">Belum ada Target.</p></div>`;
        return;
    }
    
    // Helper 1: Area Icon & Color
    const getAreaInfo = (area) => {
        switch(area) {
            case 'Finance': return { icon: 'payments', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
            case 'Health': return { icon: 'ecg_heart', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' };
            case 'Career': return { icon: 'work', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
            case 'Spiritual': return { icon: 'self_improvement', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' };
            case 'Relationship': return { icon: 'group', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' };
            default: return { icon: 'category', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };
        }
    };

    // Helper 2: Hitung Sisa Hari
    const getDaysLeft = (dateString) => {
        if (!dateString) return { text: 'No Date', color: 'text-slate-500' };
        const today = new Date();
        const target = new Date(dateString);
        const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        
        if (diff < 0) return { text: `${Math.abs(diff)} Hari Lewat`, color: 'text-rose-500 font-bold' };
        if (diff === 0) return { text: 'Hari Ini!', color: 'text-rose-500 font-bold animate-pulse' };
        if (diff <= 7) return { text: `${diff} Hari Lagi`, color: 'text-amber-400 font-bold' };
        return { text: `${diff} Hari Lagi`, color: 'text-slate-400' };
    };

    data.forEach(g => {
        const el = document.createElement('div');
        const info = getAreaInfo(g.area);
        const time = getDaysLeft(g.deadline);
        const progress = g.progress || 0;
        
        // Progress Bar Color Logic
        let barColor = 'bg-blue-500';
        if(progress >= 100) barColor = 'bg-emerald-500';
        else if(progress < 25) barColor = 'bg-slate-600';

        el.className = 'card-enhanced group relative flex flex-col justify-between h-full min-h-[160px] hover:border-slate-500/50 transition-all';
        
        el.innerHTML = `
            <button onclick="window.askDelete('goals','${g.id}')" class="absolute top-3 right-3 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all z-20">
                <span class="material-symbols-rounded text-sm">delete</span>
            </button>

            <div>
                <div class="flex justify-between items-start mb-3">
                    <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${info.color}">
                        <span class="material-symbols-rounded text-sm">${info.icon}</span>
                        ${g.area || 'General'}
                    </span>
                    <span class="text-[10px] font-mono ${time.color}">${time.text}</span>
                </div>
                <h3 class="text-lg font-bold text-white mb-1 leading-tight">${g.title}</h3>
            </div>

            <div class="mt-6">
                <div class="flex justify-between text-xs font-bold mb-2">
                    <span class="text-slate-400">Progress</span>
                    <span class="${progress >= 100 ? 'text-emerald-400' : 'text-white'}">${progress}%</span>
                </div>
                
                <div class="relative h-2 bg-slate-800 rounded-full w-full">
                    <div class="absolute top-0 left-0 h-full rounded-full ${barColor} transition-all duration-500" style="width: ${progress}%"></div>
                    
                    <input type="range" min="0" max="100" value="${progress}" 
                        class="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onchange="window.updateGoalProgress('${g.id}',this.value)"
                        title="Geser untuk update progress">
                </div>
            </div>
        `;
        grid.appendChild(el);
    });
}

export function renderFinance(data) {
    let inc = 0, exp = 0; const list = document.getElementById('transaction-list'); if (!list) return; list.innerHTML = '';
    data.forEach(t => {
        if (t.type === 'income') inc += t.amount; else exp += t.amount;
        const el = document.createElement('div'); el.className = 'flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 mb-2';
        el.innerHTML = `<div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}"><span class="material-symbols-rounded text-sm">${t.type === 'income' ? 'arrow_upward' : 'arrow_downward'}</span></div><div><p class="text-sm font-bold text-white">${t.note}</p><p class="text-[10px] text-slate-500 uppercase">${t.category || 'Lainnya'}</p></div></div><span class="text-sm font-mono font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</span><button onclick="window.askDelete('transactions', '${t.id}')" class="text-slate-600 hover:text-red-400 ml-2"><span class="material-symbols-rounded text-sm">delete</span></button>`;
        list.appendChild(el);
    });
    document.getElementById('finance-income').innerText = formatMoney(inc); document.getElementById('finance-expense').innerText = formatMoney(exp); document.getElementById('finance-balance').innerText = formatMoney(inc - exp);
}
export function renderLibrary(data) {
    const grid = document.getElementById('library-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    if (data.length === 0) { 
        grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-12 flex flex-col items-center"><span class="material-symbols-rounded text-4xl mb-2 opacity-20">local_library</span><p class="text-sm">Perpustakaan kosong.</p></div>`; 
        return; 
    }

    // 1. Mapping Tipe ke Material Symbols
    const getTypeInfo = (type) => {
        switch(type) {
            // Format: { icon: 'nama_icon_google', color: 'kelas_warna', label: 'Label Tampilan' }
            case 'book': return { icon: 'menu_book', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', label: 'Book' };
            case 'movie': return { icon: 'movie', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20', label: 'Movie' };
            case 'course': return { icon: 'school', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', label: 'Course' };
            case 'article': return { icon: 'article', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', label: 'Article' };
            default: return { icon: 'bookmark', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', label: 'Item' };
        }
    };

    // 2. Mapping Status ke Warna & Ikon Kecil
    const getStatusInfo = (status) => {
        switch(status) {
            case 'queue': return { label: 'To Do', color: 'text-slate-400' };
            case 'active': return { label: 'Active', color: 'text-blue-400 font-bold' };
            case 'done': return { label: 'Finished', color: 'text-emerald-400' };
            default: return { label: status, color: 'text-slate-400' };
        }
    };

    data.forEach(d => {
        const el = document.createElement('div');
        const info = getTypeInfo(d.type);
        const statusInfo = getStatusInfo(d.status);
        
        el.className = 'card-enhanced flex flex-col relative group hover:border-slate-500/50 transition-colors';
        
        el.innerHTML = `
            <button onclick="window.askDelete('library','${d.id}')" class="absolute top-3 right-3 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all z-10 bg-slate-900/50 p-1 rounded-lg backdrop-blur-sm">
                <span class="material-symbols-rounded text-sm block">close</span>
            </button>
            
            <div class="flex justify-between mb-3">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${info.color}">
                    <span class="material-symbols-rounded text-[16px]">${info.icon}</span>
                    ${info.label}
                </span>
            </div>
            
            <h4 class="text-base font-bold text-white mb-4 flex-1 leading-snug line-clamp-2" title="${d.title}">${d.title}</h4>
            
            <div class="relative pt-3 border-t border-white/5 flex items-center justify-between">
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status</span>
                
                <div class="relative">
                    <select onchange="window.updateLibraryStatus('${d.id}',this.value)" class="input-enhanced w-24 text-[10px] font-bold py-1 pl-2 pr-6 appearance-none bg-slate-900/50 border-transparent hover:bg-slate-800 transition-colors cursor-pointer text-right ${statusInfo.color}">
                        <option value="queue" ${d.status === 'queue' ? 'selected' : ''}>To Do</option>
                        <option value="active" ${d.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="done" ${d.status === 'done' ? 'selected' : ''}>Finished</option>
                    </select>
                    <div class="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                        <span class="material-symbols-rounded text-xs">unfold_more</span>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(el);
    });
}

export function renderDailyLogUI(logs) {
    const container = document.getElementById('daily-timeline'); if(!container) return;
    document.getElementById('log-date-display').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if(logs.length === 0) { container.innerHTML = `<div class="text-center py-12 text-slate-500">Belum ada aktivitas hari ini.</div>`; return; }
    container.innerHTML = '';
    logs.forEach(item => {
        let icon = 'info'; let color = 'text-blue-400'; let border = 'border-blue-500';
        if(item.type.includes('COMPLETED')) { icon = 'check_circle'; color = 'text-green-500'; border = 'border-green-500'; }
        else if(item.type.includes('TRANSACTION')) { icon = 'payments'; color = 'text-emerald-400'; border = 'border-emerald-500'; }
        const timeStr = item.createdAt ? new Date(item.createdAt.seconds*1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
        const el = document.createElement('div'); el.className = 'timeline-item'; el.style.borderColor = 'rgba(71,85,105,0.3)';
        el.innerHTML = `<div class="timeline-dot bg-slate-900 ${border}"></div><div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"><span class="text-xs font-mono text-slate-500 w-12">${timeStr}</span><div class="text-sm text-slate-300 flex-1 flex items-center gap-2"><span class="material-symbols-rounded text-sm ${color}">${icon}</span><span>${item.message}</span></div></div>`;
        container.appendChild(el);
    });
}
export function updateMoodUI(mood) {
    const m = { bad: 'Kurang', neutral: 'Biasa', good: 'Baik', excellent: 'Semangat' };
    const el = document.getElementById('mood-status'); if (el) el.innerText = mood ? (m[mood] || "-") : "-";
    document.querySelectorAll('.mood-btn').forEach(b => { b.classList.remove('mood-selected', 'scale-110', 'opacity-100'); b.classList.add('opacity-40'); });
    if (mood && document.getElementById(`mood-${mood}`)) { document.getElementById(`mood-${mood}`).classList.add('mood-selected', 'scale-110', 'opacity-100'); document.getElementById(`mood-${mood}`).classList.remove('opacity-40'); }
}
export function updateWaterUI(count) {
    const el = document.getElementById('water-count'); if (el) el.innerText = `${count}/8`;
    document.querySelectorAll('.water-bar').forEach((b, i) => { if (i < count) b.classList.replace('bg-slate-800', 'bg-blue-500'); else b.classList.replace('bg-blue-500', 'bg-slate-800'); });
}

export function switchView(id) {
    // 1. Hide semua view
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('view-' + id);
    if(target) target.classList.remove('hidden');
    
    // 2. Update Sidebar Desktop
    document.querySelectorAll('.nav-item').forEach(el => { el.classList.remove('bg-slate-800', 'text-white'); el.classList.add('text-slate-400'); });
    const navDesktop = document.getElementById('nav-' + id);
    if (navDesktop) { navDesktop.classList.add('bg-slate-800', 'text-white'); navDesktop.classList.remove('text-slate-400'); }
    
    // 3. Update Bottom Nav Mobile (NEW)
    document.querySelectorAll('.nav-item-mobile').forEach(el => {
        el.classList.remove('text-blue-500');
        el.classList.add('text-slate-500');
    });
    
    // Logika pemetaan manual karena struktur mobile beda
    let activeMobileBtn = null;
    const bottomNav = document.getElementById('mobile-bottom-nav');
    
    if(bottomNav) {
        const btns = bottomNav.getElementsByTagName('button');
        if(id === 'dashboard') activeMobileBtn = btns[0];
        else if(id === 'projects') activeMobileBtn = btns[1];
        else if(id === 'finance') activeMobileBtn = btns[3];
        
        // Jika menu ada di dalam "More", highlight tombol Menu
        if(['log', 'goals', 'second-brain', 'library', 'trash'].includes(id)) {
            activeMobileBtn = btns[4]; 
        }

        if(activeMobileBtn) {
            activeMobileBtn.classList.remove('text-slate-500');
            activeMobileBtn.classList.add('text-blue-500');
        }
    }

    if (id === 'trash' && window.loadTrashItems) window.loadTrashItems();
}

// --- GAMIFICATION UI ---
export function updateLevelUI(xp, level) {
    const levelEl = document.getElementById('user-level');
    const xpEl = document.getElementById('user-xp');
    const barEl = document.getElementById('xp-bar');

    // Hitung progress bar (0 - 100%)
    // Sisa XP menuju level berikutnya
    const currentLevelBaseXP = (level - 1) * 100;
    const xpInCurrentLevel = xp - currentLevelBaseXP;
    const percentage = Math.min(Math.max(xpInCurrentLevel, 0), 100); // Clamp 0-100

    if (levelEl) levelEl.innerText = `Lvl ${level}`;
    if (xpEl) xpEl.innerText = `${xp} XP`;
    if (barEl) barEl.style.width = `${percentage}%`;
}

// --- CATEGORY UI ---
export function renderCategories(data) {
    // 1. Update Dropdown di Form Transaksi
    const select = document.getElementById('trans-category');
    if (select) {
        // Simpan value yang sedang dipilih user (agar tidak reset saat ada update realtime lain)
        const currentVal = select.value;
        
        select.innerHTML = '';
        if (data.length === 0) {
            select.innerHTML = '<option value="">Belum ada kategori</option>';
        } else {
            data.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.name;
                opt.innerText = c.name;
                select.appendChild(opt);
            });
        }
        
        // Restore value jika masih ada di list baru
        if (currentVal && data.find(c => c.name === currentVal)) {
            select.value = currentVal;
        }
    }

    // 2. Update List di Modal Manager
    const list = document.getElementById('category-manager-list');
    if (list) {
        list.innerHTML = '';
        data.forEach(c => {
            const el = document.createElement('div');
            el.className = 'flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 group hover:border-slate-500 transition-colors';
            el.innerHTML = `
                <span class="text-sm text-slate-200 font-medium">${c.name}</span>
                <button onclick="window.deleteCategory('${c.id}')" class="text-slate-600 hover:text-rose-400 p-1 opacity-50 group-hover:opacity-100 transition-all">
                    <span class="material-symbols-rounded text-sm">delete</span>
                </button>
            `;
            list.appendChild(el);
        });
    }
}
