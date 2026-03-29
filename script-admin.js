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

    try {
        const r = await fetch(`${BASE_URL}?action=getPengaturan&t=${Date.now()}`);
        const d = await r.json();

        body.innerHTML = d.map(v => {
            const aktif = (v[3] || "").toLowerCase() === "aktif";

            return `
            <tr>
                <td>${v[0]}</td>
                <td>${v[1]} | ${v[2]}</td>
                <td>
                    <span class="badge ${aktif ? 'btn-green' : 'btn-red'}">
                        ${v[3]}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm ${aktif ? 'btn-red' : 'btn-green'}"
                        onclick="toggleUjian('${v[0]}','${v[1]}','${v[2]}','${aktif ? 'Nonaktif':'Aktif'}')">
                        ${aktif ? 'Matikan' : 'Aktifkan'}
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (e) {
        body.innerHTML = "<tr><td colspan='4'>Gagal load jadwal</td></tr>";
    }
}

async function toggleUjian(mapel, tingkat, jurusan, status) {
    await fetch(BASE_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "toggleUjian",
            mapel, tingkat, jurusan, status
        })
    });

    muatJadwal();
}


// ================= INPUT SOAL =================
async function simpanSoal() {

    // ✅ MULTI JURUSAN (INI YANG DITAMBAHKAN)
    const jurusanSelect = document.getElementById('i-jurusan');
    const jurusan = Array.from(jurusanSelect.selectedOptions)
        .map(o => o.value)
        .join(", ");

    // ✅ ROMBEL PRIORITAS
    const tingkat = document.getElementById('i-rombel').value
        || document.getElementById('i-tingkat').value;

    const opsi = [
        document.getElementById('o1').value,
        document.getElementById('o2').value,
        document.getElementById('o3').value,
        document.getElementById('o4').value
    ];

    const data = {
        action: "inputSoal",
        id: "Q-" + Date.now(),
        tingkat: tingkat,
        jurusan: jurusan, // ✅ bisa banyak
        mapel: document.getElementById('i-mapel-nama').value,
        tipe: document.getElementById('i-tipe').value,
        pertanyaan: document.getElementById('q-text').value,
        opsi: opsi,
        kunci: document.getElementById('q-kunci').value,
        status: document.getElementById('i-status').value
    };

    await fetch(BASE_URL, {
        method: "POST",
        body: JSON.stringify(data)
    });

    alert("Soal berhasil disimpan");
    location.reload();
}


// ================= LOAD SOAL =================
async function muatDatabaseSoal() {
    const body = document.getElementById('t-database-soal');
    body.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

    const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
    const d = await r.json();

    body.innerHTML = d.map(v => `
        <tr data-mapel="${(v[8] || '').toUpperCase()}">
            <td>${v[0]}</td>
            <td>
                <b>${v[8]}</b><br>
                <small>${v[1]} | ${v[2]}</small>
            </td>
            <td>${v[3]}</td>
            <td>${(v[4] || "").substring(0,40)}</td>
            <td>
                <button class="btn btn-sm btn-red" onclick="hapusSoal('${v[0]}')">
                    Hapus
                </button>
            </td>
        </tr>
    `).join('');

    // ✅ isi filter mapel (tidak merusak fitur lama)
    const listMapel = [...new Set(d.map(v => v[8]).filter(v => v))];
    const filter = document.getElementById('filter-mapel-soal');
    if (filter) {
        filter.innerHTML = '<option value="">-- Semua Mapel --</option>' +
            listMapel.map(m => `<option value="${m}">${m}</option>`).join('');
    }
}


// ================= FILTER SOAL =================
function filterTabelSoal() {
    const mapel = document.getElementById("filter-mapel-soal").value.toUpperCase();
    const cari = document.getElementById("cari-soal-teks").value.toUpperCase();

    document.querySelectorAll("#t-database-soal tr").forEach(row => {
        const cocok =
            (mapel === "" || row.getAttribute("data-mapel").includes(mapel)) &&
            row.innerText.toUpperCase().includes(cari);

        row.style.display = cocok ? "" : "none";
    });
}


// ================= HAPUS =================
async function hapusSoal(id) {
    if (!confirm("Hapus soal?")) return;

    await fetch(BASE_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "hapusSoal",
            id: id
        })
    });

    muatDatabaseSoal();
}


// ================= DATA SISWA =================
async function muatTabelSiswa() {
    const body = document.getElementById('t-siswa-body');
    body.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

    const r = await fetch(`${BASE_URL}?action=getDataSiswa`);
    const d = await r.json();

    body.innerHTML = d.map(v => `
        <tr data-kelas="${v[2]}">
            <td><input type="checkbox" class="check-siswa" value="${v[0]}"></td>
            <td>${v[0]}</td>
            <td>${v[1]}</td>
            <td>${v[2]}</td>
            <td>${v[4]}</td>
            <td>
                <button onclick="ubahIzinSiswa('${v[0]}','${v[4] === 'Ya' ? 'Tidak':'Ya'}')">
                    Toggle
                </button>
            </td>
        </tr>
    `).join('');

    // isi filter kelas
    const kelas = [...new Set(d.map(v => v[2]))];
    const filter = document.getElementById('filter-kelas-siswa');
    if (filter) {
        filter.innerHTML = '<option value="">-- Semua Kelas --</option>' +
            kelas.map(k => `<option value="${k}">${k}</option>`).join('');
    }
}

async function ubahIzinSiswa(nis, status) {
    await fetch(BASE_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "updateIzinSiswa",
            nis,
            status
        })
    });

    muatTabelSiswa();
}


// ================= FILTER SISWA =================
function filterTabelSiswa() {
    const kls = document.getElementById("filter-kelas-siswa").value.toUpperCase();
    const cari = document.getElementById("cari-siswa").value.toUpperCase();

    document.querySelectorAll("#t-siswa-body tr").forEach(row => {
        const cocok =
            (kls === "" || row.getAttribute("data-kelas").toUpperCase() === kls) &&
            row.innerText.toUpperCase().includes(cari);

        row.style.display = cocok ? "" : "none";
    });
}


// ================= NILAI =================
async function muatRekapNilai() {
    const body = document.getElementById('t-nilai');
    body.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

    const r = await fetch(`${BASE_URL}?action=getRekapNilai`);
    const d = await r.json();

    body.innerHTML = d.map(v => `
        <tr>
            <td>${v[0] ? new Date(v[0]).toLocaleString('id-ID') : '-'}</td>
            <td>${v[1]}</td>
            <td>${v[2]}</td>
            <td>${v[4]}</td>
            <td><b>${v[5]}</b></td>
        </tr>
    `).join('');
}


// ================= HELPER =================
function toggleOpsi() {
    const tipe = document.getElementById('i-tipe').value;
    document.getElementById('opsi-container').style.display =
        (tipe === "IS" || tipe === "ES") ? "none" : "block";
}


// ================= INIT =================
window.onload = muatJadwal;
