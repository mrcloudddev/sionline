/**
 * CBT SMK - CLIENT FIX FINAL (ANTI SOAL KOSONG)
 */

const BASE_URL = "https://script.google.com/macros/s/AKfycbw-kYl3iXufprFMAnIq0kvFkDovAUHQ-jgB-__7yjOKo-mHq2CHT_meK9YTS27i4ys4/exec";

let dataSiswaAktif = {};
let timerInterval;

// ================= LOGIN =================
async function prosesLogin() {
    const user = document.getElementById('username').value;
    if (!user) return alert("Masukkan NIS!");

    try {
        const resp = await fetch(`${BASE_URL}?action=login&user=${encodeURIComponent(user)}`);
        const res = await resp.json();

        if (res.status === "Sukses") {
            res.nis = user;
            localStorage.setItem("sesi_siswa", JSON.stringify(res));
            jalankanUjian(res);
        } else {
            alert(res.pesan);
        }
    } catch {
        alert("Server error / koneksi putus");
    }
}

// ================= START =================
function jalankanUjian(res) {
    dataSiswaAktif = res;

    document.getElementById('login-section').style.display = 'none';
    document.getElementById('exam-section').style.display = 'block';

    document.getElementById('nama-siswa').innerText = res.nama;
    document.getElementById('kelas-siswa').innerText = `${res.kelas} | ${res.jurusan}`;

    cekStatusDanLoadSoal();
}

// ================= LOAD =================
async function cekStatusDanLoadSoal() {
    try {
        const resp = await fetch(`${BASE_URL}?action=getStatusUjian`);
        const res = await resp.json();

        if (res.status !== "Aktif") {
            alert("Ujian belum aktif!");
            return;
        }

        document.getElementById('mapel-aktif').innerText = res.mapelAktif;

        mulaiTimer(res.durasi);

        // 🔥 FIX: TANPA PARAMETER (sesuai backend kamu)
        const soalResp = await fetch(`${BASE_URL}?action=getSoal`);
        const soal = await soalResp.json();

        console.log("DATA SOAL:", soal); // DEBUG

        renderSoal(soal);

    } catch (e) {
        console.log("ERROR LOAD:", e);
    }
}

// ================= RENDER =================
function renderSoal(soal) {
    const cont = document.getElementById('question-container');

    if (!Array.isArray(soal) || soal.length === 0) {
        cont.innerHTML = `
        <div style="text-align:center;padding:40px">
            <h2 style="color:red">❌ SOAL TIDAK MUNCUL</h2>
            <p>Cek:</p>
            <ul style="text-align:left;display:inline-block">
                <li>Mapel harus sama persis</li>
                <li>Status soal = aktif</li>
                <li>Status ujian = aktif</li>
            </ul>
        </div>`;
        return;
    }

    const saved = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");

    cont.innerHTML = soal.map((s, i) => {
        let q = (s.pertanyaan || "").replace(/\[IMG\](.*?)\[\/IMG\]/g,
            '<img src="$1" style="max-width:100%">');

        return `
        <div class="soal-item" data-id="${s.id}" data-mapel="${s.mapel}">
            <p><b>${i + 1}.</b> ${q}</p>
            ${s.opsi.map(o => `
                <label>
                    <input type="radio" name="q${s.id}" value="${o}"
                    ${saved[s.id] === o ? "checked" : ""}
                    onchange="simpanJawabanLokal('${s.id}','${o}')">
                    ${o}
                </label>
            `).join('')}
        </div>
        `;
    }).join('');
}

// ================= SAVE =================
function simpanJawabanLokal(id, val) {
    let data = JSON.parse(localStorage.getItem("jawaban_lokal") || "{}");
    data[id] = val;
    localStorage.setItem("jawaban_lokal", JSON.stringify(data));
}

// ================= TIMER =================
function mulaiTimer(menit) {
    let s = menit * 60;

    timerInterval = setInterval(() => {
        if (s <= 0) {
            clearInterval(timerInterval);
            submitJawaban(true);
            return;
        }

        let m = Math.floor(s / 60);
        let d = s % 60;

        document.getElementById('timer').innerText =
            `${m.toString().padStart(2, '0')}:${d.toString().padStart(2, '0')}`;

        s--;
    }, 1000);
}

// ================= SUBMIT =================
async function submitJawaban(auto = false) {
    if (!auto && !confirm("Kirim jawaban?")) return;

    const soal = document.querySelectorAll('.soal-item');

    const jawaban = Array.from(soal).map(s => ({
        id: s.dataset.id,
        jawaban: s.querySelector('input:checked')?.value || ""
    }));

    try {
        await fetch(BASE_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: "submitJawaban",
                ...dataSiswaAktif,
                jawaban: jawaban
            })
        });

        alert("✅ Berhasil dikirim");
        localStorage.clear();
        location.reload();

    } catch {
        alert("❌ Gagal kirim");
    }
}

// ================= RESTORE =================
window.onload = () => {
    const sesi = localStorage.getItem("sesi_siswa");
    if (sesi) jalankanUjian(JSON.parse(sesi));
};
