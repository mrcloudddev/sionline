const BASE_URL = "https://script.google.com/macros/s/AKfycbwsXYVeO2Z8To6ItyOGrr8hKY_g9K1j1kjrwLKawKWxq_zA5Xpi7KTemFrXR1ORNkuG/exec"; // Pastikan akhiran /exec

let timerInterval;
let dataUjian = [];

// 1. Fungsi Login
async function prosesLogin() {
    const user = document.getElementById('username').value;
    if(!user) return alert("Isi NIS Anda!");

    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${user}`);
        const res = await resp.json();

        if (res.status === "Sukses" && res.izin === "Ya") {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('exam-section').style.display = 'block';
            document.getElementById('info-siswa').innerText = `${res.nama} (${res.kelas}-${res.jurusan})`;
            
            mulaiTimer(res.durasi);
            loadSoal(res.kelas, res.jurusan);
        } else {
            alert(res.pesan || "Akses Ditolak!");
        }
    } catch (err) {
        alert("Gagal terhubung ke server!");
    }
}

// 2. Load Soal Dinamis
async function loadSoal(kelas, jurusan) {
    const container = document.getElementById('question-container');
    container.innerHTML = "Memuat soal...";

    const resp = await fetch(`${BASE_URL}?action=getSoal&kelas=${kelas}&jurusan=${jurusan}`);
    const soal = await resp.json();
    dataUjian = soal;

    container.innerHTML = "";
    soal.forEach((item, index) => {
        let html = `<div class="soal-item"><p>${index+1}. ${item.pertanyaan}</p>`;
        
        // Logika render 5 tipe soal
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
                html += `<textarea name="q${item.id}" placeholder="Format: Kiri=Kanan (pisahkan dengan koma)"></textarea>`;
                break;
            case "Esai":
                html += `<textarea name="q${item.id}" rows="4" placeholder="Tulis jawaban lengkap..."></textarea>`;
                break;
        }
        html += `</div>`;
        container.innerHTML += html;
    });
}

// 3. Sistem Timer
function mulaiTimer(menit) {
    let detik = menit * 60;
    timerInterval = setInterval(() => {
        let h = Math.floor(detik / 3600);
        let m = Math.floor((detik % 3600) / 60);
        let s = detik % 60;
        document.getElementById('timer').innerText = `Sisa Waktu: ${h}:${m}:${s}`;
        if (detik <= 0) {
            clearInterval(timerInterval);
            alert("Waktu habis! Jawaban otomatis terkirim.");
            submitJawaban();
        }
        detik--;
    }, 1000);
}

// 4. Fitur Keamanan (Anti-Curang)
window.addEventListener('blur', () => {
    alert("PERINGATAN: Jangan meninggalkan halaman ujian! Aktivitas ini dicatat Admin.");
});

document.addEventListener('contextmenu', e => e.preventDefault());
