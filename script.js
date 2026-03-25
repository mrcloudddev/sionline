/**
 * SISTEM UJIAN ONLINE SMK - FRONTEND FINAL (FIXED)
 * Update: 25 Maret 2026
 * Developer: Pak Dwi Frediawan
 */

const BASE_URL = "https://script.google.com/macros/s/AKfycbzYrOHZtXBQ4-B2YRe3vZxT-zU_IGT4bipM9TPrqSSy5QNLJyV-UvxgD2bG9rpJIS0h/exec";

let timerInterval;
let dataSiswaAktif = {};
let ujianDimulai = false;

// ==========================================
// 1. FUNGSI LOGIN & AUTH
// ==========================================

async function prosesLogin() {
    const userInput = document.getElementById('username').value;
    if(!userInput) return alert("Masukkan NIS Anda!");

    const btn = document.getElementById('btn-login');
    btn.innerText = "Memverifikasi...";
    btn.disabled = true;

    try {
        // Mengirim parameter action=login agar Apps Script mengenali perintahnya
        const resp = await fetch(`${BASE_URL}?action=login&user=${encodeURIComponent(userInput)}`);
        const res = await resp.json();

        if (res.status === "Sukses") {
            if (res.izin === "Ya") {
                dataSiswaAktif = res; 
                
                // Transisi tampilan
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('exam-section').style.display = 'block';
                
                // Update Header info siswa
                document.querySelector('.nama').innerText = res.nama;
                document.querySelector('.kelas-jurus').innerText = `${res.kelas} | ${res.jurusan}`;
                
                // Ambil status jadwal & muat soal
                cekStatusDanLoadSoal(res.kelas, res.jurusan);
                
                ujianDimulai = true;
                aktifkanKeamanan(); 

            } else {
                alert("Akses Ditolak: Anda belum diberi izin ujian oleh Admin.");
                resetLoginButton();
            }
        } else {
            alert(res.pesan);
            resetLoginButton();
        }
    } catch (err) {
        console.error(err);
        alert("Gagal terhubung ke server database. Pastikan internet stabil!");
        resetLoginButton();
    }
}

function resetLoginButton() {
    const btn = document.getElementById('btn-login');
    btn.innerText = "Mulai Ujian";
    btn.disabled = false;
}

// ==========================================
// 2. LOGIKA UJIAN (TIMER & SOAL)
// ==========================================

async function cekStatusDanLoadSoal(kelas, jurusan) {
    try {
        // 1. Cek Status Ujian (Mengirim action=getStatusUjian)
        const respStatus = await fetch(`${BASE_URL}?action=getStatusUjian&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
        const resStatus = await respStatus.json();

        if(resStatus.status === "Aktif") {
            mulaiTimer(resStatus.durasi || 60);
            
            // 2. Ambil Soal (Mengirim action=getSoal)
            const container = document.getElementById('question-container');
            container.innerHTML = "<div class='soal-item'><p style='text-align:center;'>Sedang sinkronisasi soal...</p></div>";
            
            const respSoal = await fetch(`${BASE_URL}?action=getSoal&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
            const soal = await respSoal.json();
            
            renderSoal(soal);
        } else {
            alert("MAAF: Jadwal ujian untuk tingkat/jurusan Anda belum dibuka atau sudah ditutup.");
            location.reload();
        }
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan saat memuat data ujian.");
    }
}

function renderSoal(soalArray) {
    const container = document.getElementById('question-container');
    container.innerHTML = ""; 

    if(!soalArray || soalArray.length === 0) {
        container.innerHTML = "<div class='soal-item'><p style='text-align:center;color:red;'>Belum ada soal yang diaktifkan untuk Anda.</p></div>";
        return;
    }

    soalArray.forEach((item, index) => {
        let html = `<div class="soal-item" data-id="${item.id}" data-tipe="${item.tipe}">
                    <p class="soal-text">${index+1}. ${item.pertanyaan}</p>`;
        
        // Tipe Pilihan Ganda & Kompleks
        if(item.tipe === "PG" || item.tipe === "PG_Kompleks") {
            const inputType = (item.tipe === "PG") ? "radio" : "checkbox";
            item.opsi.forEach(opt => {
                html += `<label class="option-label">
                            <input type="${inputType}" name="q${item.id}" value="${opt}"> 
                            <span>${opt}</span>
                         </label>`;
            });
        } 
        // Tipe Isian Singkat
        else if(item.tipe === "Isian") {
            html += `<input type="text" name="q${item.id}" placeholder="Ketik jawaban singkat...">`;
        } 
        // Tipe Esai / Menjodohkan
        else {
            html += `<textarea name="q${item.id}" rows="4" placeholder="Tulis jawaban lengkap..."></textarea>`;
        }
        
        html += `</div>`;
        container.innerHTML += html;
    });
}

function mulaiTimer(menit) {
    let detik = menit * 60;
    const timerEl = document.getElementById('timer');
    
    timerInterval = setInterval(() => {
        let h = Math.floor(detik / 3600);
        let m = Math.floor((detik % 3600) / 60);
        let s = detik % 60;
        
        timerEl.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        
        if (detik <= 0) {
            clearInterval(timerInterval);
            alert("WAKTU HABIS! Jawaban Anda akan dikirim otomatis.");
            submitJawaban(true);
        }
        detik--;
    }, 1000);
}

// ==========================================
// 3. PENGIRIMAN JAWABAN (POST)
// ==========================================

async function submitJawaban(isAuto = false) {
    if(!isAuto && !confirm("Apakah Anda yakin ingin mengakhiri ujian?")) return;

    clearInterval(timerInterval);
    const btnSubmit = document.querySelector('.btn-submit');
    btnSubmit.innerText = "Mengirim...";
    btnSubmit.disabled = true;

    const soalElements = document.querySelectorAll('.soal-item');
    let berkasJawaban = [];

    soalElements.forEach(el => {
        const id = el.getAttribute('data-id');
        const tipe = el.getAttribute('data-tipe');
        let jawabanSiswa = "";

        if(tipe === "PG") {
            const checked = el.querySelector('input:checked');
            jawabanSiswa = checked ? checked.value : "";
        } else if(tipe === "PG_Kompleks") {
            jawabanSiswa = Array.from(el.querySelectorAll('input:checked')).map(i => i.value);
        } else {
            const input = el.querySelector('input[type="text"], textarea');
            jawabanSiswa = input ? input.value : "";
        }
        berkasJawaban.push({ id, jawaban: jawabanSiswa });
    });

    const payload = {
        action: "submitJawaban",
        nama: dataSiswaAktif.nama,
        kelas: dataSiswaAktif.kelas,
        jurusan: dataSiswaAktif.jurusan,
        jawaban: berkasJawaban
    };

    try {
        await fetch(BASE_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
        
        alert("Jawaban Berhasil Terkirim!\nTerima kasih telah mengikuti ujian.");
        location.reload();

    } catch (e) {
        alert("Koneksi gagal saat mengirim. Silakan lapor pengawas!");
        btnSubmit.innerText = "Coba Kirim Lagi";
        btnSubmit.disabled = false;
    }
}

// ==========================================
// 4. SISTEM KEAMANAN (ANTI-CURANG)
// ==========================================

function aktifkanKeamanan() {
    if(!ujianDimulai) return;

    // Blokir klik kanan
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Deteksi pindah tab (Hapus alert agar tidak error saat kirim)
    window.addEventListener('blur', () => {
        if(ujianDimulai) {
            console.log("Siswa pindah tab/aplikasi");
            // Cukup berikan notifikasi kecil di pojok atau biarkan saja 
            // agar tidak memunculkan popup yang memblokir proses kirim.
        }
    });
}
