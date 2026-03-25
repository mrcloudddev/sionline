const BASE_URL = "https://script.google.com/macros/s/AKfycbwXQ37TioE9J7ISJrpPX5GgIY5muMPR9yWxp5MJCqPzGDIgZ3Qo6XlFEhs4SEt6lKix/exec";

let timerInterval;
let dataSiswaAktif = {};
let ujianDimulai = false;

async function prosesLogin() {
    const user = document.getElementById('username').value;
    if(!user) return alert("Masukkan NIS!");

    const btn = document.getElementById('btn-login');
    btn.innerText = "Checking...";
    btn.disabled = true;

    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${user}`);
        const res = await resp.json();

        if (res.status === "Sukses") {
            if (res.izin === "Ya") {
                dataSiswaAktif = res;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('exam-section').style.display = 'block';
                
                document.querySelector('.nama').innerText = res.nama;
                document.querySelector('.kelas-jurus').innerText = `${res.kelas} | ${res.jurusan}`;
                
                cekStatusDanLoadSoal(res.kelas, res.jurusan);
                ujianDimulai = true;
                aktifkanKeamanan();
            } else {
                alert("Akses ditolak oleh Admin.");
                resetBtn();
            }
        } else {
            alert(res.pesan);
            resetBtn();
        }
    } catch (e) {
        alert("Koneksi gagal.");
        resetBtn();
    }
}

function resetBtn() {
    const btn = document.getElementById('btn-login');
    btn.innerText = "Mulai Ujian";
    btn.disabled = false;
}

async function cekStatusDanLoadSoal(kelas, jurusan) {
    const respStatus = await fetch(`${BASE_URL}?action=getStatusUjian&kelas=${kelas}&jurusan=${jurusan}`);
    const resStatus = await respStatus.json();

    if(resStatus.status === "Aktif") {
        mulaiTimer(resStatus.durasi);
        const respSoal = await fetch(`${BASE_URL}?action=getSoal&kelas=${kelas}&jurusan=${jurusan}`);
        const soal = await respSoal.json();
        renderSoal(soal);
    } else {
        alert("Ujian belum dibuka.");
        location.reload();
    }
}

function renderSoal(soalArray) {
    const container = document.getElementById('question-container');
    container.innerHTML = "";
    soalArray.forEach((item, index) => {
        let html = `<div class="soal-item" data-id="${item.id}" data-tipe="${item.tipe}">
                    <p style="font-weight:600; margin-bottom:15px;">${index+1}. ${item.pertanyaan}</p>`;
        
        if(item.tipe === "PG" || item.tipe === "PG_Kompleks") {
            const inputType = (item.tipe === "PG") ? "radio" : "checkbox";
            item.opsi.forEach(opt => {
                html += `<label class="option-label"><input type="${inputType}" name="q${item.id}" value="${opt}" style="margin-right:10px;"> ${opt}</label>`;
            });
        } else if(item.tipe === "Isian") {
            html += `<input type="text" name="q${item.id}" placeholder="Jawaban singkat...">`;
        } else {
            html += `<textarea name="q${item.id}" rows="4" placeholder="Ketik jawaban Anda..."></textarea>`;
        }
        html += `</div>`;
        container.innerHTML += html;
    });
}

function mulaiTimer(menit) {
    let detik = menit * 60;
    timerInterval = setInterval(() => {
        let h = Math.floor(detik / 3600);
        let m = Math.floor((detik % 3600) / 60);
        let s = detik % 60;
        document.getElementById('timer').innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        if (detik <= 0) {
            clearInterval(timerInterval);
            submitJawaban(true);
        }
        detik--;
    }, 1000);
}

async function submitJawaban(auto = false) {
    if(!auto && !confirm("Kirim jawaban sekarang?")) return;
    
    const btn = document.querySelector('.btn-submit');
    btn.innerText = "Mengirim...";
    btn.disabled = true;

    const soalEl = document.querySelectorAll('.soal-item');
    let jwb = [];
    soalEl.forEach(el => {
        const id = el.dataset.id;
        const tipe = el.dataset.tipe;
        let val = "";
        if(tipe === "PG") val = el.querySelector('input:checked')?.value || "";
        else if(tipe === "PG_Kompleks") val = Array.from(el.querySelectorAll('input:checked')).map(i => i.value);
        else val = el.querySelector('input[type="text"], textarea').value;
        jwb.push({id, val});
    });

    const payload = {
        action: "submitJawaban",
        nama: dataSiswaAktif.nama,
        kelas: dataSiswaAktif.kelas,
        jurusan: dataSiswaAktif.jurusan,
        jawaban: jwb
    };

    await fetch(BASE_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    alert("Jawaban terkirim!");
    location.reload();
}

function aktifkanKeamanan() {
    // Blokir klik kanan
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Peringatan pindah tab (Hanya muncul jika ujian sedang aktif)
    window.addEventListener('blur', () => {
        if(ujianDimulai) {
            console.log("Siswa berpindah halaman");
            // Kita gunakan alert agar siswa kembali ke halaman ujian
            alert("Peringatan: Dilarang pindah tab selama ujian berlangsung!");
        }
    });
}
