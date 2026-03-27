// GANTI LINK DI BAWAH INI DENGAN LINK DEPLOYMENT APPS SCRIPT TERBARU
const BASE_URL = "https://script.google.com/macros/s/AKfycbxeCyZkFQo6G5dGQpdsqIQPn8EYqGo2XDYRjIPNxNk-EwkEXo0hOaEMef9QMQiLKWEa/exec";

let dataSiswaAktif = {};
let timerInterval;

// --- 1. FUNGSI LOGIN & PEMULIHAN SESI ---
async function prosesLogin() {
    const user = document.getElementById('username').value;
    if(!user) return alert("Masukkan NIS!");
    
    const btn = document.getElementById('btn-login');
    if(btn) { btn.innerText = "Mengecek..."; btn.disabled = true; }
    
    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${encodeURIComponent(user)}`);
        const res = await resp.json();
        
        if(res.status === "Sukses" && res.izin === "Ya") {
            // PENTING: Simpan NIS ke dalam objek res agar radar bisa membacanya nanti
            res.nis = user; 
            
            // SIMPAN SESI LOGIN KE LOKAL
            localStorage.setItem("sesi_siswa", JSON.stringify(res));
            jalankanUjian(res);
        } else {
            alert(res.pesan || "Akses Ditolak! Cek NIS atau Izin Ujian.");
            if(btn) { btn.innerText = "Mulai Ujian"; btn.disabled = false; }
        }
    } catch(e) {
        alert("Error Server! Periksa koneksi.");
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
            alert("Ujian sudah ditutup oleh Admin.");
            bersihkanMemori();
        }
    } catch(e) {
        console.log("Gagal muat data.");
    }
}

// --- 2. RENDER SOAL & RESTORE JAWABAN (AUTO-SAVE) ---
function renderSoal(soal) {
    const cont = document.getElementById('question-container');
    const savedAnswers = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");

    cont.innerHTML = soal.map((s, i) => {
        let qText = s.pertanyaan.replace(/\[IMG\](.*?)\[\/IMG\]/g, '<img src="$1" class="img-soal">');
        
        return `
        <div class="soal-item" data-id="${s.id}">
            <p><strong>${i+1}.</strong> ${qText}</p>
            ${s.opsi.map(o => {
                let isImg = (o.startsWith("http"));
                let content = isImg ? `<img src="${o}" class="img-opsi">` : `<span>${o}</span>`;
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

function simpanJawabanLokal(idSoal, nilai) {
    let savedAnswers = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");
    savedAnswers[idSoal] = nilai;
    localStorage.setItem("jawaban_lokal", JSON.stringify(savedAnswers));
}

// --- 3. TIMER ANTI-RESET ---
function mulaiTimer(durasiMenit, sisaDetikManual) {
    let sisaDetik;
    if (sisaDetikManual !== null) {
        sisaDetik = sisaDetikManual;
    } else {
        sisaDetik = durasiMenit * 60;
    }

    if(timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (sisaDetik <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer').innerText = "00:00";
            localStorage.removeItem("sisa_waktu");
            submitJawaban(true);
            return;
        }

        let mnt = Math.floor(sisaDetik/60), dtk = sisaDetik%60;
        document.getElementById('timer').innerText = `${mnt.toString().padStart(2,'0')}:${dtk.toString().padStart(2,'0')}`;
        
        localStorage.setItem("sisa_waktu", sisaDetik);
        sisaDetik--;
    }, 1000);
}

// --- 4. SUBMIT & BERSIHKAN SEMUA MEMORI ---
async function submitJawaban(auto = false) {
    if(!auto && !confirm("Kirim jawaban sekarang?")) return;
    
    clearInterval(timerInterval);
    const btn = document.querySelector('.btn-submit');
    if(btn) { btn.innerText = "Mengirim..."; btn.disabled = true; }

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
        bersihkanMemori();
    } catch(e) { 
        alert("Gagal Kirim! Cek koneksi internet Anda."); 
        if(btn) { btn.innerText = "Kirim Jawaban"; btn.disabled = false; }
    }
}

function bersihkanMemori() {
    localStorage.removeItem("sesi_siswa");
    localStorage.removeItem("jawaban_lokal");
    localStorage.removeItem("sisa_waktu");
    location.reload();
}

// --- 5. LOGIKA AUTO-RESTORE SAAT REFRESH / RADAR ---
window.onload = function() {
    // Jalankan radar update (dari index.html)
    if (typeof cekPerubahanSoal === 'function') {
        cekPerubahanSoal();
    }

    // Restore Sesi jika ada
    const savedSesi = localStorage.getItem("sesi_siswa");
    if(savedSesi) {
        console.log("Memulihkan sesi ujian...");
        jalankanUjian(JSON.parse(savedSesi));
    }
};
