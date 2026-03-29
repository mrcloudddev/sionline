const BASE_URL = "https://script.google.com/macros/s/AKfycby8CN5r6EELdna7N99qLnjzjxa2xeba3aIoojL5hWzHWdQIyMCsIfh_yI6WV_VBHQA6/exec";


// ================= NAVIGASI =================
function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(id).classList.add('active');
    if (el) el.classList.add('active');

    if (id === 'p-dash') muatJadwal();
    if (id === 'p-soal') muatDatabaseSoal();
    if (id === 'p-siswa') muatTabelSiswa();
    if (id === 'p-nilai') muatRekapNilai();
}


// ================= DASHBOARD =================
async function muatJadwal() {
    const body = document.getElementById('t-jadwal');
    body.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    const r = await fetch(`${BASE_URL}?action=getPengaturan`);
    const d = await r.json();

    body.innerHTML = d.map(v => {
        const aktif = (v[3] || "").toLowerCase() === "aktif";

        return `
        <tr>
            <td>${v[0]}</td>
            <td><b>${v[1]}</b><br><small>${v[2]}</small></td>
            <td>${v[3]}</td>
            <td>
                <button onclick="toggleUjian('${v[0]}','${v[1]}','${v[2]}','${aktif ? 'Nonaktif':'Aktif'}')">
                    ${aktif ? 'Matikan' : 'Aktifkan'}
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function toggleUjian(mapel, tingkat, jurusan, status) {
    await fetch(BASE_URL, {
        method: "POST",
        body: JSON.stringify({ action: "toggleUjian", mapel, tingkat, jurusan, status })
    });
    muatJadwal();
}


// ================= SUB MENU SOAL =================
function switchSubSoal(mode) {
    document.getElementById('sub-soal-input').classList.toggle('hidden', mode !== 'input');
    document.getElementById('sub-soal-daftar').classList.toggle('hidden', mode !== 'daftar');
}


// ================= INPUT SOAL =================
async function simpanSoal() {

    const jurusan = Array.from(document.getElementById('i-jurusan').selectedOptions)
        .map(o => o.value).join(", ");

    // ✅ MULTI KELAS FIX
    let tingkatInput = document.getElementById('i-rombel').value;
    let tingkat = tingkatInput.includes(",")
        ? tingkatInput.split(",").map(k => k.trim()).join(",")
        : (tingkatInput || document.getElementById('i-tingkat').value);

    const data = {
        action: "inputSoal",
        id: "Q-" + Date.now(),
        tingkat,
        jurusan,
        mapel: document.getElementById('i-mapel-nama').value,
        tipe: document.getElementById('i-tipe').value,
        pertanyaan: document.getElementById('q-text').value,
        opsi: [
            o1.value, o2.value, o3.value, o4.value
        ],
        kunci: document.getElementById('q-kunci').value,
        status: document.getElementById('i-status').value
    };

    await fetch(BASE_URL, { method: "POST", body: JSON.stringify(data) });

    alert("Soal tersimpan");
    location.reload();
}


// ================= LOAD SOAL =================
async function muatDatabaseSoal() {
    const body = document.getElementById('t-database-soal');
    body.innerHTML = "Loading...";

    const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
    const d = await r.json();

    body.innerHTML = d.map(v => {

        const kelasList = (v[1] || "").split(",").join("<br>");

        return `
        <tr>
            <td>${v[0]}</td>
            <td><b>${v[8]}</b><br><small>${kelasList}</small></td>
            <td>${v[3]}</td>
            <td>${v[4]}</td>
            <td>
                <button onclick='isiFormEdit(${JSON.stringify(v)})'>Edit</button>
                <button onclick="hapusSoal('${v[0]}')">Hapus</button>
            </td>
        </tr>`;
    }).join('');
}


// ================= EDIT =================
function isiFormEdit(v) {
    switchSubSoal('input');

    document.getElementById('edit-id').value = v[0];
    document.getElementById('i-mapel-nama').value = v[8];
    document.getElementById('i-rombel').value = v[1];
    document.getElementById('q-text').value = v[4];
    document.getElementById('q-kunci').value = v[6];
}


// ================= HAPUS =================
async function hapusSoal(id) {
    if (!confirm("Hapus soal?")) return;

    await fetch(BASE_URL, {
        method: "POST",
        body: JSON.stringify({ action: "hapusSoal", id })
    });

    muatDatabaseSoal();
}


// ================= SISWA =================
async function muatTabelSiswa() {
    const body = document.getElementById('t-siswa-body');
    body.innerHTML = "Loading...";

    const r = await fetch(`${BASE_URL}?action=getDataSiswa`);
    const d = await r.json();

    body.innerHTML = d.map(v => `
        <tr>
            <td>${v[0]}</td>
            <td>${v[1]}</td>
            <td>${v[2]}</td>
            <td>${v[3]}</td>
            <td>${v[4]}</td>
        </tr>
    `).join('');
}


// ================= NILAI =================
async function muatRekapNilai() {
    const body = document.getElementById('t-nilai');
    body.innerHTML = "Loading...";

    const r = await fetch(`${BASE_URL}?action=getRekapNilai`);
    const d = await r.json();

    body.innerHTML = d.map(v => `
        <tr>
            <td>${v[0] ? new Date(v[0]).toLocaleString() : '-'}</td>
            <td>${v[1]}</td>
            <td>${v[2]}</td>
            <td>${v[4]}</td>
            <td>${v[5]}</td>
        </tr>
    `).join('');
}


// ================= INIT =================
window.onload = muatJadwal;
