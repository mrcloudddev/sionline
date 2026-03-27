// GANTI LINK DI BAWAH INI DENGAN LINK DEPLOYMENT APPS SCRIPT BAPAK YANG TERBARU
const BASE_URL = "https://script.google.com/macros/s/AKfycby-Fy0hNaP9p3zsAi42vekzI_JYndRIdoNRmQq3ZtW13u27yXNtKfH3PiJhSQfOqTfy/exec";

let dataSiswaAktif = {};
let timerInterval;

// --- 1. FUNGSI LOGIN DENGAN PENYIMPANAN SESI ---
async function prosesLogin() {
    const user = document.getElementById('username').value;
    if(!user) return alert("Masukkan NIS!");
    
    const btn = document.getElementById('btn-login');
    if(btn) { btn.innerText = "Mengecek..."; btn.disabled = true; }
    
    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${encodeURIComponent(user)}`);
        const res = await resp.json();
        
        if(res.status === "Sukses" && res.izin === "Ya") {
            // SIMPAN SESI LOGIN KE BROWSER
            localStorage.setItem("sesi_siswa", JSON.stringify(res));
            jalankanUjian(res);
        } else {
            alert(res.pesan || "Akses Ditolak! Pastikan NIS benar dan Izin 'Ya'");
            if(btn) { btn.innerText = "Mulai Ujian"; btn.disabled = false; }
        }
    } catch(e) {
        console.error(e);
        alert("Error Server! Periksa koneksi internet.");
        if(btn) { btn.innerText = "Mulai Ujian"; btn.disabled = false; }
    }
}

// --- 2. FUNGSI MENAMPILKAN DASHBOARD UJIAN ---
function jalankanUjian(res) {
    dataSiswaAktif = res;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('exam-section').style.display = 'block';
    
    document.getElementById('nama-siswa').innerText = res.nama;
    document.getElementById('kelas-siswa').innerText = `${res.kelas} | ${res.jurusan}`;
    
    cekStatusDanLoadSoal(res.kelas, res.jurusan);
}

async function cekStatusDanLoadSoal(kelas, jurusan) {
    try {
        const resp = await fetch(`${BASE_URL}?action=getStatusUjian&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
        const res = await resp.json();
        
        if(res.status === "Aktif") {
            mulaiTimer(res.durasi);
            const respSoal = await fetch(`${BASE_URL}?action=getSoal&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
            const soal = await respSoal.json();
            renderSoal(soal);
        } else {
            alert("Ujian belum dibuka!");
            localStorage.removeItem("sesi_siswa"); // Hapus sesi jika ujian ditutup
            location.reload();
        }
    } catch(e) {
        alert("Gagal memuat soal. Silakan refresh.");
    }
}

// --- 3. RENDER SOAL & RESTORE JAWABAN (AUTO-SAVE) ---
function renderSoal(soal) {
    const cont = document.getElementById('question-container');
    
    // Ambil jawaban yang tersimpan di memori (jika ada)
    const savedAnswers = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");

    cont.innerHTML = soal.map((s, i) => {
        let qText = s.pertanyaan.replace(/\[IMG\](.*?)\[\/IMG\]/g, '<img src="$1" class="img-soal">');
        
        return `
        <div class="soal-item" data-id="${s.id}">
            <p><strong>${i+1}.</strong> ${qText}</p>
            ${s.opsi.map((o, idx) => {
                let isImg = (o.startsWith("http"));
                let content = isImg ? `<img src="${o}" class="img-opsi">` : `<span>${o}</span>`;
                
                // Cek apakah opsi ini adalah jawaban yang pernah dipilih
                let isChecked = savedAnswers[s.id] === o ? "checked" : "";
                
                return `
                <label class="option-label">
                    <input type="radio" name="q${s.id}" value="${o}" ${isChecked} onchange="simpanJawabanLokal('${s.id}', '${o}')"> 
                    ${content}
                </label>`;
            }).join('')}
        </div>`;
    }).join('');
}

// Fungsi Simpan Jawaban ke Memori Browser (Mencegah hilang saat reload radar)
function simpanJawabanLokal(idSoal, nilai) {
    let savedAnswers = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");
    savedAnswers[idSoal] = nilai;
    localStorage.setItem("jawaban_lokal", JSON.stringify(savedAnswers));
}

function mulaiTimer(m) {
    let d = m * 60;
    // Cek jika timer sudah berjalan sebelumnya
    if(timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        let mnt = Math.floor(d/60), dtk = d%60;
        document.getElementById('timer').innerText = `${mnt.toString().padStart(2,'0')}:${dtk.toString().padStart(2,'0')}`;
        if(d-- <= 0) { clearInterval(timerInterval); submitJawaban(true); }
    }, 1000);
}

// --- 4. SUBMIT JAWABAN & CLEAR SESSION ---
async function submitJawaban(auto = false) {
    if(!auto && !confirm("Kirim jawaban sekarang?")) return;
    
    clearInterval(timerInterval);
    const btn = document.querySelector('.btn-submit');
    btn.innerText = "Mengirim..."; btn.disabled = true;

    const jawaban = Array.from(document.querySelectorAll('.soal-item')).map(el => ({
        id: el.dataset.id,
        jawaban: el.querySelector('input:checked') ? el.querySelector('input:checked').value : ""
    }));

    try {
        await fetch(BASE_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ action: "submitJawaban", ...dataSiswaAktif, jawaban }) 
        });
        
        alert("Berhasil Terkirim!"); 
        
        // HAPUS SEMUA DATA SETELAH SELESAI
        localStorage.removeItem("sesi_siswa");
        localStorage.removeItem("jawaban_lokal");
        
        location.reload();
    } catch(e) { 
        alert("Gagal Kirim! Cek koneksi."); 
        btn.innerText = "Coba Lagi"; btn.disabled = false; 
    }
}

// --- 5. LOGIKA AUTO-RESTORE (SAAT RELOAD RADAR) ---
window.onload = function() {
    // 1. Jalankan radar update
    if (typeof cekPerubahanSoal === 'function') {
        cekPerubahanSoal();
    }

    // 2. Cek apakah ada sesi login aktif (setelah reload)
    const savedSesi = localStorage.getItem("sesi_siswa");
    if(savedSesi) {
        console.log("Sesi ditemukan. Memulihkan halaman ujian...");
        jalankanUjian(JSON.parse(savedSesi));
    }
};
