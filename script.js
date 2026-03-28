// GANTI LINK DI BAWAH INI DENGAN LINK DEPLOYMENT APPS SCRIPT TERBARU
const BASE_URL = "https://script.google.com/macros/s/AKfycbzcfarL2U0IVKCjWYePFOx8GyYvUXXMOzgw05NBg65glTjKDP7A_EGNfmTqADb9xsHb/exec";

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
            // PENTING: Simpan NIS agar sesi tetap terjaga
            res.nis = user; 
            localStorage.setItem("sesi_siswa", JSON.stringify(res));
            jalankanUjian(res);
        } else {
            alert(res.pesan || "Akses Ditolak! Cek NIS atau Izin Ujian.");
            if(btn) { btn.innerText = "Mulai Ujian"; btn.disabled = false; }
        }
    } catch(e) {
        alert("Server sedang sibuk atau koneksi terputus.");
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

async function cekStatusDanLoadSoal(kelas, jurusan) {
    try {
        const resp = await fetch(`${BASE_URL}?action=getStatusUjian&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
        const res = await resp.json();
        
        if(res.status === "Aktif") {
            const savedTime = localStorage.getItem("sisa_waktu");
            if (savedTime && parseInt(savedTime) > 0) {
                mulaiTimer(null, parseInt(savedTime)); 
            } else {
                mulaiTimer(res.durasi, null);
            }

            const respSoal = await fetch(`${BASE_URL}?action=getSoal&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
            const soal = await respSoal.json();
            renderSoal(soal);
        } else {
            alert("Ujian belum dibuka atau sudah ditutup oleh Admin.");
            bersihkanMemori();
        }
    } catch(e) {
        console.log("Gagal sinkronisasi jadwal.");
    }
}

// --- 2. RENDER SOAL & AUTO-SAVE ---
function renderSoal(soal) {
    const cont = document.getElementById('question-container');
    if(!soal || soal.length === 0) {
        cont.innerHTML = "<p style='text-align:center; padding:20px;'>Belum ada soal untuk kelas/jurusan Anda.</p>";
        return;
    }

    const savedAnswers = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");

    cont.innerHTML = soal.map((s, i) => {
        let qText = s.pertanyaan.replace(/\[IMG\](.*?)\[\/IMG\]/g, '<img src="$1" class="img-soal">');
        
        return `
        <div class="soal-item" data-id="${s.id}" data-mapel="${s.mapel}">
            <p><strong>${i+1}.</strong> ${qText}</p>
            ${s.opsi.map(o => {
                let isChecked = savedAnswers[s.id] === o ? "checked" : "";
                return `
                <label class="option-label">
                    <input type="radio" name="q${s.id}" value="${o}" ${isChecked} onchange="simpanJawabanLokal('${s.id}', '${o}')"> 
                    <span>${o}</span>
                </label>`;
            }).join('')}
        </div>`;
    }).join('');
}

function simpanJawabanLokal(idSoal, nilai) {
    let savedAnswers = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");
    savedAnswers[idSoal] = nilai;
    localStorage.setItem("jawaban_lokal", JSON.stringify(savedAnswers));
}

// --- 3. TIMER ---
function mulaiTimer(durasiMenit, sisaDetikManual) {
    let sisaDetik = sisaDetikManual !== null ? sisaDetikManual : durasiMenit * 60;

    if(timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (sisaDetik <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer').innerText = "00:00";
            submitJawaban(true);
            return;
        }

        let mnt = Math.floor(sisaDetik/60), dtk = sisaDetik%60;
        document.getElementById('timer').innerText = `${mnt.toString().padStart(2,'0')}:${dtk.toString().padStart(2,'0')}`;
        
        localStorage.setItem("sisa_waktu", sisaDetik);
        sisaDetik--;
    }, 1000);
}

// --- 4. SUBMIT JAWABAN (FIXED) ---
async function submitJawaban(auto = false) {
    if(!auto && !confirm("Kirim jawaban sekarang? Pastikan semua soal terjawab.")) return;
    
    clearInterval(timerInterval);
    const btn = document.querySelector('.btn-submit');
    if(btn) { btn.innerText = "Mengirim..."; btn.disabled = true; }

    const kumpulanSoal = document.querySelectorAll('.soal-item');
    const mapelSiswa = kumpulanSoal.length > 0 ? kumpulanSoal[0].dataset.mapel : "-";

    const dataJawaban = Array.from(kumpulanSoal).map(el => ({
        id: el.dataset.id,
        jawaban: el.querySelector('input:checked') ? el.querySelector('input:checked').value : ""
    }));

    try {
        // Hapus mode 'no-cors' agar pengiriman data valid
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
            alert("Jawaban Anda Berhasil Terkirim!"); 
            bersihkanMemori();
        } else {
            throw new Error();
        }
    } catch(e) { 
        alert("Gagal Terkirim! Coba klik tombol Kirim lagi."); 
        if(btn) { btn.innerText = "Kirim Ulang Jawaban"; btn.disabled = false; }
    }
}

function bersihkanMemori() {
    localStorage.clear();
    location.reload();
}

window.onload = function() {
    const savedSesi = localStorage.getItem("sesi_siswa");
    if(savedSesi) {
        jalankanUjian(JSON.parse(savedSesi));
    }
};
