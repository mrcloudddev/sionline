/**
 * SISTEM UJIAN ONLINE SMK - CLIENT SIDE (STABIL V.5.0 FINAL)
 * Developer: Pak Dwi Frediawan
 * Fitur: Auto-Save, Anti-Refresh Timer, Auto-Mapel Display, Radar Sync, & Safety Render
 */

// GANTI LINK DI BAWAH INI DENGAN LINK DEPLOYMENT APPS SCRIPT TERBARU (NEW VERSION)
const BASE_URL = "https://script.google.com/macros/s/AKfycbzLD8A3qzT38XvjVmDEiTUUvHsWobZEipEGfQxxGwBlVHjMLWixoXb0Z5-5C-_Kpmwp/exec";

let dataSiswaAktif = {};
let timerInterval;

// --- 1. FUNGSI LOGIN ---
async function prosesLogin() {
    const user = document.getElementById('username').value;
    if(!user) return alert("Masukkan NIS!");
    
    const btn = document.getElementById('btn-login');
    if(btn) { btn.innerText = "Mengecek..."; btn.disabled = true; }
    
    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${encodeURIComponent(user)}`);
        const res = await resp.json();
        
        if(res.status === "Sukses") {
            // Simpan NIS agar radar & restore sesi bisa jalan
            res.nis = user; 
            localStorage.setItem("sesi_siswa", JSON.stringify(res));
            jalankanUjian(res);
        } else {
            alert(res.pesan || "Akses Ditolak! Cek NIS atau Izin Ujian.");
            if(btn) { btn.innerText = "Mulai Ujian"; btn.disabled = false; }
        }
    } catch(e) {
        alert("Server sibuk atau koneksi terputus. Coba lagi.");
        if(btn) { btn.innerText = "Mulai Ujian"; btn.disabled = false; }
    }
}

function jalankanUjian(res) {
    dataSiswaAktif = res;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('exam-section').style.display = 'block';
    
    document.getElementById('nama-siswa').innerText = res.nama;
    document.getElementById('kelas-siswa').innerText = `${res.kelas} | ${res.jurusan}`;
    
    cekStatusDanLoadSoal(res.kelas, res.jurusan);
}

// --- 2. LOAD STATUS & SOAL (DENGAN TAMPILAN MAPEL) ---
async function cekStatusDanLoadSoal(kelas, jurusan) {
    try {
        const resp = await fetch(`${BASE_URL}?action=getStatusUjian&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
        const res = await resp.json();
        
        if(res.status === "Aktif") {
            // MUNCULKAN NAMA MAPEL DI HEADER HTML
            const badgeMapel = document.getElementById('mapel-aktif');
            if(badgeMapel) badgeMapel.innerText = res.mapelAktif || "Ujian Berlangsung";

            // Logika Timer Anti-Reset
            const savedTime = localStorage.getItem("sisa_waktu");
            if (savedTime && parseInt(savedTime) > 0) {
                mulaiTimer(null, parseInt(savedTime)); 
            } else {
                mulaiTimer(res.durasi, null);
            }

            // Load Soal
            const respSoal = await fetch(`${BASE_URL}?action=getSoal&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
            const soal = await respSoal.json();
            renderSoal(soal);
        } else {
            alert("Ujian belum dibuka atau sudah ditutup oleh Admin.");
            bersihkanMemori();
        }
    } catch(e) {
        console.log("Gagal sinkronisasi data ujian.");
    }
}

// --- 3. RENDER SOAL & AUTO-SAVE JAWABAN ---
function renderSoal(soal) {
    const cont = document.getElementById('question-container');
    
    // CEK JIKA SOAL KOSONG
    if(!soal || soal.length === 0) {
        cont.innerHTML = `
            <div style="text-align:center; padding:50px; background:white; border-radius:10px; margin:20px 0; border: 2px dashed #ddd;">
                <h3 style="color:#e74c3c;">SOAL BELUM TERSEDIA</h3>
                <p>Belum ada soal aktif untuk Rombel: <strong>${dataSiswaAktif.kelas}</strong></p>
                <p style="font-size:13px; color:#7f8c8d;">Pastikan Admin sudah mengaktifkan jadwal dan menginput soal yang sesuai.</p>
            </div>`;
        return;
    }

    const savedAnswers = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");

    cont.innerHTML = soal.map((s, i) => {
        // Support gambar dalam pertanyaan [IMG]url[/IMG]
        let qText = s.pertanyaan.replace(/\[IMG\](.*?)\[\/IMG\]/g, '<img src="$1" style="max-width:100%; height:auto; display:block; margin:10px 0; border-radius:5px;">');
        
        return `
        <div class="soal-item" data-id="${s.id}" data-mapel="${s.mapel}" style="background:white; padding:20px; margin-bottom:15px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
            <p style="font-size:16px; line-height:1.6; margin-bottom:15px;"><strong>${i+1}.</strong> ${qText}</p>
            <div class="options-group">
                ${s.opsi.map(o => {
                    let isChecked = savedAnswers[s.id] === o ? "checked" : "";
                    return `
                    <label style="display:flex; align-items:center; padding:12px; margin-bottom:8px; background:#f8f9fa; border:1px solid #ddd; border-radius:6px; cursor:pointer;">
                        <input type="radio" name="q${s.id}" value="${o}" ${isChecked} onchange="simpanJawabanLokal('${s.id}', '${o}')" style="width:18px; height:18px;"> 
                        <span style="margin-left:12px; font-size:15px;">${o}</span>
                    </label>`;
                }).join('')}
            </div>
        </div>`;
    }).join('');
}

function simpanJawabanLokal(idSoal, nilai) {
    let savedAnswers = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");
    savedAnswers[idSoal] = nilai;
    localStorage.setItem("jawaban_lokal", JSON.stringify(savedAnswers));
}

// --- 4. TIMER ---
function mulaiTimer(durasiMenit, sisaDetikManual) {
    let sisaDetik = sisaDetikManual !== null ? sisaDetikManual : durasiMenit * 60;

    if(timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (sisaDetik <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer').innerText = "00:00";
            localStorage.removeItem("sisa_waktu");
            submitJawaban(true); // Auto-submit jika waktu habis
            return;
        }

        let mnt = Math.floor(sisaDetik/60), dtk = sisaDetik%60;
        document.getElementById('timer').innerText = `${mnt.toString().padStart(2,'0')}:${dtk.toString().padStart(2,'0')}`;
        
        localStorage.setItem("sisa_waktu", sisaDetik);
        sisaDetik--;
    }, 1000);
}

// --- 5. SUBMIT JAWABAN (FIXED) ---
async function submitJawaban(auto = false) {
    if(!auto && !confirm("Akhiri ujian dan kirim jawaban sekarang?")) return;
    
    clearInterval(timerInterval);
    const btn = document.querySelector('.btn-submit');
    if(btn) { btn.innerText = "Sedang Mengirim..."; btn.disabled = true; }

    const kumpulanSoal = document.querySelectorAll('.soal-item');
    // Ambil nama mapel dari soal pertama atau dari badge header
    const badgeMapel = document.getElementById('mapel-aktif');
    const mapelSiswa = kumpulanSoal.length > 0 ? (kumpulanSoal[0].dataset.mapel || badgeMapel.innerText) : (badgeMapel ? badgeMapel.innerText : "-");

    const dataJawaban = Array.from(kumpulanSoal).map(el => ({
        id: el.dataset.id,
        jawaban: el.querySelector('input:checked') ? el.querySelector('input:checked').value : ""
    }));

    try {
        const response = await fetch(BASE_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: "submitJawaban", 
                ...dataSiswaAktif, 
                mapel: mapelSiswa,
                jawaban: dataJawaban 
            }) 
        });
        
        const hasil = await response.json();
        if(hasil.status === "Sukses") {
            alert("BERHASIL! Jawaban Anda sudah tersimpan di server."); 
            bersihkanMemori();
        } else {
            throw new Error();
        }
    } catch(e) { 
        alert("GAGAL MENGIRIM! Koneksi internet terputus. Jangan tutup halaman ini, silakan klik tombol Kirim Ulang."); 
        if(btn) { btn.innerText = "Kirim Ulang Jawaban"; btn.disabled = false; }
    }
}

function bersihkanMemori() {
    localStorage.removeItem("sesi_siswa");
    localStorage.removeItem("jawaban_lokal");
    localStorage.removeItem("sisa_waktu");
    location.reload();
}

// --- 6. AUTO RESTORE SAAT REFRESH ---
window.onload = function() {
    const savedSesi = localStorage.getItem("sesi_siswa");
    if(savedSesi) {
        console.log("Memulihkan sesi ujian...");
        jalankanUjian(JSON.parse(savedSesi));
    }
};
