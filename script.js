const BASE_URL = "https://script.google.com/macros/s/AKfycbyjirhdtJ2xapDsVSAtGioeuVJ0t5azSXSE83QjE4y7QpliSbY_Z3trUC5zGkXWxUuw/exec";

let timerInterval, dataSiswaAktif = {}, ujianDimulai = false;

async function prosesLogin() {
    const user = document.getElementById('username').value;
    if(!user) return alert("Isi NIS!");
    document.getElementById('btn-login').innerText = "Mengecek...";
    
    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${encodeURIComponent(user)}`);
        const res = await resp.json();
        if(res.status === "Sukses" && res.izin === "Ya") {
            dataSiswaAktif = res;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('exam-section').style.display = 'block';
            document.querySelector('.nama').innerText = res.nama;
            document.querySelector('.kelas-jurus').innerText = `${res.kelas} | ${res.jurusan}`;
            cekStatusDanLoadSoal(res.kelas, res.jurusan);
            ujianDimulai = true;
            aktifkanKeamanan();
        } else { alert(res.pesan || "Akses Ditolak"); location.reload(); }
    } catch(e) { alert("Error Server!"); location.reload(); }
}

async function cekStatusDanLoadSoal(kelas, jurusan) {
    const resp = await fetch(`${BASE_URL}?action=getStatusUjian&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
    const res = await resp.json();
    if(res.status === "Aktif") {
        mulaiTimer(res.durasi);
        const respSoal = await fetch(`${BASE_URL}?action=getSoal&kelas=${encodeURIComponent(kelas)}&jurusan=${encodeURIComponent(jurusan)}`);
        renderSoal(await respSoal.json());
    } else { alert("Ujian Belum Dibuka!"); location.reload(); }
}

function renderSoal(soal) {
    const cont = document.getElementById('question-container');
    cont.innerHTML = soal.map((s, i) => {
        // Deteksi Gambar di Pertanyaan (Format: [IMG]url[/IMG])
        let teksPertanyaan = s.pertanyaan.replace(/\[IMG\](.*?)\[\/IMG\]/g, '<br><img src="$1" class="img-soal">');

        return `
        <div class="soal-item" data-id="${s.id}" data-tipe="${s.tipe}">
            <p>${i+1}. ${teksPertanyaan}</p>
            ${s.opsi.map(o => {
                // Deteksi jika Opsi adalah URL Gambar
                let isImage = (o.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) != null || o.startsWith("http"));
                let isiOpsi = isImage ? `<img src="${o}" class="img-opsi">` : `<span>${o}</span>`;
                return `<label class="option-label"><input type="radio" name="q${s.id}" value="${o}"> ${isiOpsi}</label>`;
            }).join('')}
        </div>`;
    }).join('');
}

function mulaiTimer(m) {
    let d = m * 60;
    timerInterval = setInterval(() => {
        let mnt = Math.floor(d/60), dtk = d%60;
        document.getElementById('timer').innerText = `${mnt}:${dtk.toString().padStart(2,'0')}`;
        if(d-- <= 0) { clearInterval(timerInterval); submitJawaban(true); }
    }, 1000);
}

async function submitJawaban(auto = false) {
    if(!auto && !confirm("Kirim jawaban sekarang?")) return;
    ujianDimulai = false;
    clearInterval(timerInterval);
    const btn = document.querySelector('.btn-submit');
    btn.innerText = "Mengirim..."; btn.disabled = true;

    const jawaban = Array.from(document.querySelectorAll('.soal-item')).map(el => ({
        id: el.dataset.id,
        jawaban: el.querySelector('input:checked') ? el.querySelector('input:checked').value : ""
    }));

    try {
        await fetch(BASE_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "submitJawaban", ...dataSiswaAktif, jawaban }) });
        alert("Berhasil Terkirim!"); location.reload();
    } catch(e) { alert("Gagal Kirim!"); btn.innerText = "Coba Lagi"; btn.disabled = false; }
}

function aktifkanKeamanan() {
    document.addEventListener('contextmenu', e => e.preventDefault());
}
