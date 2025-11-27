// js/utils.js

// Format Rupiah
export const formatMoney = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// Notifikasi Keren (Toast)
export const showEnhancedNotification = (msg, type) => {
    const d = document.createElement('div');
    const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-blue-600');
    d.className = `fixed bottom-4 right-4 ${bg} text-white px-4 py-3 rounded-xl shadow-xl z-50 fade-in`;
    d.innerText = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3000);
};

// --- LOGIKA POMODORO TIMER ---
// --- LOGIKA POMODORO TIMER (UPDATED) ---
let tInt;
// Suara 1: Warning (Tiktak/Beep halus) - 30 detik terakhir
const soundWarning = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'); 
// Suara 2: Finish (Alarm Panjang) - Waktu habis
const soundFinish = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');

export function initTimer() {
    const savedEndTime = localStorage.getItem('pomoEndTime');
    const savedIsRun = localStorage.getItem('pomoIsRun') === 'true';
    const savedDuration = localStorage.getItem('pomoDuration') || 25; // Default 25 menit
    
    // Set tampilan awal
    if (!savedIsRun) {
        const left = localStorage.getItem('pomoLeft') || (savedDuration * 60);
        updateDisplay(parseInt(left));
        updateBtnUI(false);
    } else {
        // Jika sedang running (background persistence check)
        const now = Date.now();
        const end = parseInt(savedEndTime);
        
        if (now < end) {
            // Masih ada waktu sisa
            startInterval(end);
            updateBtnUI(true);
        } else {
            // Waktu habis saat browser tertutup
            timerFinished(true); // true = silent finish (karena user baru buka)
        }
    }
    
    // Update input field value
    const input = document.getElementById('custom-minutes-input');
    if(input) input.value = savedDuration;
}

export function toggleTimerEdit() {
    const viewMode = document.getElementById('timer-view-mode');
    const editMode = document.getElementById('timer-edit-mode');
    const isRunning = localStorage.getItem('pomoIsRun') === 'true';

    if (isRunning) {
        // Jangan izinkan edit saat timer jalan
        showEnhancedNotification("Pause timer dulu untuk mengubah waktu.", "error");
        return;
    }

    if (viewMode.classList.contains('hidden')) {
        viewMode.classList.remove('hidden');
        editMode.classList.add('hidden');
    } else {
        viewMode.classList.add('hidden');
        editMode.classList.remove('hidden');
        document.getElementById('custom-minutes-input').focus();
    }
}

export function saveCustomTime(minutes) {
    const m = parseInt(minutes);
    if (m > 0) {
        localStorage.setItem('pomoDuration', m);
        localStorage.setItem('pomoLeft', m * 60); // Reset sisa waktu ke durasi baru
        localStorage.removeItem('pomoEndTime');
        updateDisplay(m * 60);
        toggleTimerEdit(); // Kembali ke view mode
        showEnhancedNotification(`Timer diatur ke ${m} menit`, 'success');
    }
}

export function toggleTimer() {
    const isRun = localStorage.getItem('pomoIsRun') === 'true';
    
    if (isRun) {
        // PAUSE
        clearInterval(tInt);
        const currentLeft = getRemainingTime(parseInt(localStorage.getItem('pomoEndTime')));
        localStorage.setItem('pomoIsRun', 'false');
        localStorage.setItem('pomoLeft', currentLeft);
        localStorage.removeItem('pomoEndTime');
        updateBtnUI(false);
    } else {
        // START / RESUME
        // Ambil sisa waktu terakhir atau gunakan durasi default/custom yang tersimpan
        let duration = parseInt(localStorage.getItem('pomoLeft'));
        
        // Fallback jika duration NaN/Null
        if (!duration && duration !== 0) {
            const savedDur = parseInt(localStorage.getItem('pomoDuration')) || 25;
            duration = savedDur * 60;
        }

        if (duration <= 0) {
             // Jika waktu 0, reset ulang ke durasi setting
             const savedDur = parseInt(localStorage.getItem('pomoDuration')) || 25;
             duration = savedDur * 60;
        }

        const endTime = Date.now() + (duration * 1000);
        localStorage.setItem('pomoIsRun', 'true');
        localStorage.setItem('pomoEndTime', endTime);
        
        startInterval(endTime);
        updateBtnUI(true);
    }
}

export function resetTimer() {
    clearInterval(tInt);
    const savedDur = parseInt(localStorage.getItem('pomoDuration')) || 25;
    
    localStorage.setItem('pomoIsRun', 'false');
    localStorage.removeItem('pomoEndTime');
    localStorage.setItem('pomoLeft', savedDur * 60);
    
    updateDisplay(savedDur * 60);
    updateBtnUI(false);
    document.title = "Singgih Life OS";
}

function startInterval(endTime) {
    clearInterval(tInt);
    updateDisplay(getRemainingTime(endTime)); // Update instan

    tInt = setInterval(() => {
        const remaining = getRemainingTime(endTime);
        
        // LOGIKA SUARA
        if (remaining === 30) {
            soundWarning.play().catch(e => console.log("Audio autoplay blocked", e));
            showEnhancedNotification("Sisa 30 Detik! 🔥", "warning");
        }

        if (remaining >= 0) {
            updateDisplay(remaining);
        } else {
            timerFinished();
        }
    }, 1000);
}

function getRemainingTime(endTime) {
    return Math.ceil((endTime - Date.now()) / 1000);
}

function updateDisplay(seconds) {
    if (seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    
    const display = document.getElementById('timer-display');
    if (display) {
        display.innerText = `${m}:${s}`;
        // Ubah warna jika di bawah 30 detik
        if (seconds <= 30 && seconds > 0 && localStorage.getItem('pomoIsRun') === 'true') {
            display.classList.add('text-rose-500');
            display.classList.remove('text-white');
        } else {
            display.classList.remove('text-rose-500');
            display.classList.add('text-white');
        }
    }
    
    if (localStorage.getItem('pomoIsRun') === 'true') {
        document.title = `${m}:${s} - Focus`;
    }
}

function updateBtnUI(isRunning) {
    const b = document.getElementById('timer-btn');
    if (!b) return;
    if (isRunning) {
        b.innerHTML = '<span class="material-symbols-rounded">pause</span> Pause';
        b.classList.remove('btn-primary');
        b.classList.add('bg-amber-500');
    } else {
        b.innerHTML = '<span class="material-symbols-rounded">play_arrow</span> Start';
        b.classList.remove('bg-amber-500');
        b.classList.add('btn-primary');
    }
}

function timerFinished(isSilent = false) {
    clearInterval(tInt);
    const savedDur = parseInt(localStorage.getItem('pomoDuration')) || 25;
    
    localStorage.setItem('pomoIsRun', 'false');
    localStorage.removeItem('pomoEndTime');
    localStorage.setItem('pomoLeft', savedDur * 60); // Reset otomatis ke durasi awal
    
    updateDisplay(0); // Tampilkan 00:00 sebentar
    updateBtnUI(false);
    document.title = "Selesai!";
    
    if (!isSilent) {
        soundFinish.play().catch(e => console.log("Audio autoplay blocked", e));
        if(window.logEvent) window.logEvent(null, 'FOCUS_DONE', 'Sesi Fokus Selesai'); // Null uid sementara, nunggu global state
        if(window.showEnhancedNotification) showEnhancedNotification("Waktu Habis! Istirahatlah.", 'success');
    }

    setTimeout(() => {
        updateDisplay(savedDur * 60); // Kembalikan ke durasi penuh
        document.title = "Singgih Life OS";
    }, 5000);
}

// --- CHART SYSTEM ---
let financeChartInstance = null; // Variabel untuk menyimpan instance chart

export function renderFinanceChart(transactions) {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;

    // 1. Olah Data: Kelompokkan Pengeluaran per Kategori
    const categoryTotals = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
            // Hitung per kategori untuk Pie Chart/Bar Chart
            const cat = t.category || 'Lainnya';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
        }
    });

    // Urutkan kategori dari pengeluaran terbesar
    const sortedCats = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
    const dataValues = sortedCats.map(c => categoryTotals[c]);
    
    // Jika belum ada data, jangan render
    if (sortedCats.length === 0 && totalIncome === 0) return;

    // 2. Hancurkan chart lama jika ada (agar tidak menumpuk)
    if (financeChartInstance) {
        financeChartInstance.destroy();
    }

    // 3. Buat Chart Baru (Model Bar Horizontal)
    financeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCats, // Label: Makan, Transport, dll
            datasets: [{
                label: 'Pengeluaran',
                data: dataValues,
                backgroundColor: [
                    'rgba(244, 63, 94, 0.7)',   // Rose
                    'rgba(59, 130, 246, 0.7)',  // Blue
                    'rgba(16, 185, 129, 0.7)',  // Emerald
                    'rgba(245, 158, 11, 0.7)',  // Amber
                    'rgba(139, 92, 246, 0.7)'   // Violet
                ],
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y', // Bar Horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Sembunyikan legenda
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatMoney(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        color: '#94a3b8',
                        font: { size: 10 },
                        callback: function(value) { return 'Rp ' + value/1000 + 'k'; } // Format sumbu X
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#cbd5e0', font: { size: 11, family: 'Inter' } }
                }
            }
        }
    });
}

// --- WEATHER SYSTEM (OPEN-METEO API) ---
export async function initWeather() {
    const widget = document.getElementById('weather-widget');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const iconEl = document.getElementById('weather-icon');

    if (!navigator.geolocation) {
        descEl.innerText = "No GPS";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
            // Panggil API Open-Meteo (Gratis, No Key)
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const data = await res.json();
            const weather = data.current_weather;

            // Update UI
            tempEl.innerText = `${Math.round(weather.temperature)}°C`;
            
            // Terjemahkan Kode WMO ke Ikon & Teks
            const wmo = getWeatherInfo(weather.weathercode);
            iconEl.innerText = wmo.icon;
            descEl.innerText = wmo.desc;

        } catch (e) {
            console.error("Weather Error:", e);
            descEl.innerText = "Err";
        }
    }, (err) => {
        console.warn("Lokasi ditolak:", err);
        descEl.innerText = "Loc Off";
    });
}

// Helper: Menerjemahkan kode WMO (Standard Meteorologi)
function getWeatherInfo(code) {
    // 0: Cerah, 1-3: Berawan, 45-48: Kabut
    // 51-67: Gerimis/Hujan, 71-77: Salju, 80-82: Hujan Deras, 95-99: Badai
    if (code === 0) return { icon: "☀️", desc: "Cerah" };
    if (code >= 1 && code <= 3) return { icon: "⛅", desc: "Berawan" };
    if (code >= 45 && code <= 48) return { icon: "🌫️", desc: "Kabut" };
    if (code >= 51 && code <= 67) return { icon: "🌧️", desc: "Hujan" };
    if (code >= 71 && code <= 77) return { icon: "❄️", desc: "Salju" };
    if (code >= 80 && code <= 82) return { icon: "⛈️", desc: "Hujan Deras" };
    if (code >= 95) return { icon: "⚡", desc: "Badai" };
    return { icon: "🌡️", desc: "Unknown" };
}