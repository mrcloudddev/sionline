/**
 * SISTEM UJIAN ONLINE SMK - FRONTEND SCRIPT
 * Link Backend: Google Apps Script (Sesuai Deploy Terbaru)
 */

const BASE_URL = "https://script.google.com/macros/s/AKfycbwsXYVeO2Z8To6ItyOGrr8hKY_g9K1j1kjrwLKawKWxq_zA5Xpi7KTemFrXR1ORNkuG/exec";

let timerInterval;
let dataSiswaAktif = {};

// ==========================================
// 1. SISTEM KEAMANAN (ANTI-CURANG)
// ==========================================

// Blokir Klik Kanan
document.addEventListener('contextmenu', e => e.preventDefault());

// Blokir Inspect Element, F12, Ctrl+U, Ctrl+Shift+I
document.onkeydown = function(e) {
    if(e.keyCode == 123) return false; 
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) return false;
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) return false;
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false;
    if(e.ctrlKey && (e.keyCode == 'C'.charCodeAt(0) || e.keyCode == 'V'.charCodeAt(0))) return false;
};

// Deteksi jika siswa pindah Tab/Aplikasi
window.addEventListener('blur', () => {
    alert("PERINGATAN: Jangan meninggalkan halaman ujian! Aktivitas ini dicatat oleh sistem.");
});

// ==========================================
// 2. FUNGSI LOGIN & AUTH
// ==========================================

async function prosesLogin() {
    const user = document.getElementById('username').value;
    if(!user) return alert("Masukkan NIS / Username Anda!");

    const btn = document.querySelector("#login-section button");
    btn.innerText = "Checking...";
    btn.disabled = true;

    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${user}`);
        const res = await resp.json();

        if (res.status === "Sukses") {
            if (res.izin === "Ya") {
                dataSiswaAktif = res; // Simpan profil siswa
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('exam-section').style.display = 'block';
                document.getElementById('info-siswa').innerText = `Siswa: ${res.nama} | ${res.kelas} ${res.jurusan}`;
                
                // Ambil status ujian & durasi
                cekStatusDanMulai(res.kelas, res.jurusan);
            } else {
                alert("Akses Ditolak: Anda belum diberi izin ujian oleh Admin.");
                btn.innerText = "Masuk Ujian";
                btn.disabled = false;
            }
        } else {
            alert(res.pesan);
            btn.innerText = "Masuk Ujian";
            btn.disabled = false;
        }
    } catch (err) {
        alert("Gagal terhubung ke server. Pastikan internet stabil!");
        btn.innerText = "Masuk Ujian";
        btn.disabled = false;
    }
}

// ==========================================
// 3. LOGIKA UJIAN (TIMER & SOAL)
// ==========================================

async function cekStatusDanMulai(kelas, jurusan) {
    // Ambil durasi dari Pengaturan_Ujian
    const resp = await fetch(`${BASE_URL}?action=getStatusUjian&kelas=${kelas}&jurusan=${jurusan}`);
    const res = await resp.json();

    if(res.status === "Aktif") {
        mulaiTimer(res.durasi);
        loadSoal(kelas, jurusan);
    } else {
        alert("Ujian untuk kelas/jurusan Anda saat ini belum dibuka.");
        location.reload();
    }
}

async function loadSoal(kelas, jurusan) {
    const container = document.getElementById('question-container');
    container.innerHTML = "<p>Sedang memuat soal...</p>";

    try {
        const resp = await fetch(`${BASE_URL}?action=getSoal&kelas=${kelas}&jurusan=${jurusan}`);
        const soal = await resp.json();

        container.innerHTML = "";
        soal.forEach((item, index) => {
            let html = `<div class="soal-item" data-id="${item.id}" data-tipe="${item.tipe}">
                        <p><strong>${index+1}. ${item.pertanyaan}</strong></p>`;
            
            // Render berdasarkan 5 Tipe Soal
            switch(item.tipe) {
                case "PG":
                    item.opsi.forEach(opt => {
                        html += `<label class="option-label"><input type="radio" name="q${item.id}" value="${opt}"> ${opt}</label>`;
                    });
                    break;
                case "PG_Kompleks":
                    item.opsi.forEach(opt => {
                        html += `<label class="option-label"><input type="checkbox" name="q${item.id}" value="${opt}"> ${opt}</label>`;
                    });
                    break;
                case "Isian":
                    html += `<input type="text" name="q${item.id}" placeholder="Ketik jawaban singkat...">`;
                    break;
                case "Matching":
                    html += `<textarea name="q${item.id}" placeholder="Contoh: 1=A, 2=B (pisahkan koma)"></textarea>`;
                    break;
                case "Esai":
                    html += `<textarea name="q${item.id}" rows="4" placeholder="Tulis uraian jawaban Anda..."></textarea>`;
                    break;
            }
            html += `</div>`;
            container.innerHTML += html;
        });
    } catch (e) {
        container.innerHTML = "<p>Gagal memuat soal. Silakan refresh.</p>";
    }
}

function mulaiTimer(menit) {
    let detik = menit * 60;
    timerInterval = setInterval(() => {
        let h = Math.floor(detik / 3600);
        let m = Math.floor((detik % 3600) / 60);
        let s = detik % 60;
        
        // Format 00:00:00
        const display = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        document.getElementById('timer').innerText = `Sisa Waktu: ${display}`;
        
        if (detik <= 0) {
            clearInterval(timerInterval);
            alert("Waktu Habis!");
            submitJawaban();
        }
        detik--;
    }, 1000);
}

// ==========================================
// 4. PENGIRIMAN JAWABAN
// ==========================================

async function submitJawaban() {
    if(!confirm("Yakin ingin mengakhiri ujian?")) return;

    const soalElements = document.querySelectorAll('.soal-item');
    let berkasJawaban = [];

    soalElements.forEach(el => {
        const id = el.getAttribute('data-id');
        const tipe = el.getAttribute('data-tipe');
        let jawaban = "";

        if(tipe === "PG") {
            const checked = el.querySelector('input:checked');
            jawaban = checked ? checked.value : "";
        } else if(tipe === "PG_Kompleks") {
            const checked = Array.from(el.querySelectorAll('input:checked')).map(i => i.value);
            jawaban = checked;
        } else {
            jawaban = el.querySelector('input[type="text"], textarea').value;
        }

        berkasJawaban.push({ id, jawaban });
    });

    const payload = {
        action: "submitJawaban",
        nama: dataSiswaAktif.nama,
        kelas: dataSiswaAktif.kelas,
        jurusan: dataSiswaAktif.jurusan,
        jawaban: berkasJawaban
    };

    try {
        const resp = await fetch(BASE_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const res = await resp.json();
        if(res.status === "Sukses") {
            alert("Jawaban berhasil terkirim!");
            location.reload();
        }
    } catch (e) {
        alert("Gagal mengirim! Silakan screenshot jawaban Anda.");
    }
}
