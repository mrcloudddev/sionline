// GANTI LINK DI BAWAH INI DENGAN LINK DEPLOYMENT APPS SCRIPT BAPAK YANG TERBARU
const BASE_URL = "https://script.google.com/macros/s/AKfycby-Fy0hNaP9p3zsAi42vekzI_JYndRIdoNRmQq3ZtW13u27yXNtKfH3PiJhSQfOqTfy/exec";

let dataSiswaAktif = {};
let timerInterval;

async function prosesLogin() {
    const user = document.getElementById('username').value;
    if(!user) return alert("Masukkan NIS!");
    
    // Mengubah teks tombol agar siswa tahu proses sedang berjalan
    const btn = document.getElementById('btn-login');
    if(btn) btn.innerText = "Mengecek...";
    
    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${encodeURIComponent(user)}`);
        const res = await resp.json();
        
        if(res.status === "Sukses" && res.izin === "Ya") {
            dataSiswaAktif = res;
            
            // Pindah Tampilan
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('exam-section').style.display = 'block';
            
            // Isi Data Header
            document.getElementById('nama-siswa').innerText = res.nama;
            document.getElementById('kelas-siswa').innerText = `${res.kelas} | ${res.jurusan}`;
            
            // Load Status & Soal
            cekStatusDanLoadSoal(res.kelas, res.jurusan);
        } else {
            alert(res.pesan || "Akses Ditolak!");
            location.reload();
        }
    } catch(e) {
        console.error(e);
        alert("Error Server! Periksa link BASE_URL di script.js");
        location.reload();
    }
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
            location.reload();
        }
    } catch(e) {
        alert("Gagal memuat soal.");
    }
}

function renderSoal(soal) {
    const cont = document.getElementById('question-container');
    cont.innerHTML = soal.map((s, i) => {
        // Logika Render Gambar Soal [IMG]url[/IMG]
        let qText = s.pertanyaan.replace(/\[IMG\](.*?)\[\/IMG\]/g, '<img src="$1" class="img-soal">');
        
        return `
        <div class="soal-item" data-id="${s.id}">
            <p><strong>${i+1}.</strong> ${qText}</p>
            ${s.opsi.map(o => {
                let isImg = (o.startsWith("http"));
                let content = isImg ? `<img src="${o}" class="img-opsi">` : `<span>${o}</span>`;
                return `<label class="option-label"><input type="radio" name="q${s.id}" value="${o}"> ${content}</label>`;
            }).join('')}
        </div>`;
    }).join('');
}

function mulaiTimer(m) {
    let d = m * 60;
    timerInterval = setInterval(() => {
        let mnt = Math.floor(d/60), dtk = d%60;
        document.getElementById('timer').innerText = `${mnt.toString().padStart(2,'0')}:${dtk.toString().padStart(2,'0')}`;
        if(d-- <= 0) { clearInterval(timerInterval); submitJawaban(true); }
    }, 1000);
}

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
        location.reload();
    } catch(e) { 
        alert("Gagal Kirim!"); 
        btn.innerText = "Coba Lagi"; 
        btn.disabled = false; 
    }
}

window.onload = function() {
    // Ambil versi awal saat siswa baru buka web
    cekPerubahanSoal(); 
};
