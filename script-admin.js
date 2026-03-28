/**
 * SISTEM ADMIN SMK MANDIRI - LOGIKA UTAMA (V.7.0 FINAL)
 * Fokus: Kelola Jadwal, Soal, Siswa, dan Nilai
 */

const BASE_URL = "https://script.google.com/macros/s/AKfycbzcfarL2U0IVKCjWYePFOx8GyYvUXXMOzgw05NBg65glTjKDP7A_EGNfmTqADb9xsHb/exec";

// --- 1. NAVIGASI PANEL ---
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

// --- 2. DASHBOARD: KONTROL JADWAL ---
async function muatJadwal() {
    try {
        const r = await fetch(`${BASE_URL}?action=getPengaturan`);
        const d = await r.json();
        document.getElementById('t-jadwal').innerHTML = d.map(v => {
            const isAktif = (v[3] || '').toLowerCase() === 'aktif';
            return `<tr>
                <td>${v[0]}</td>
                <td>${v[1]}</td>
                <td><span class="badge ${isAktif ? 'btn-green' : 'btn-red'}">${v[3]}</span></td>
                <td>
                    <button class="btn btn-sm ${isAktif ? 'btn-red' : 'btn-green'}" 
                    onclick="toggleUjian('${v[0]}', '${v[1]}', '${isAktif ? 'Nonaktif' : 'Aktif'}')">
                    ${isAktif ? 'Matikan' : 'Aktifkan'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { console.error("Gagal muat jadwal"); }
}

async function toggleUjian(mapel, tingkat, status) {
    try {
        await fetch(BASE_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: "toggleUjian", mapel, tingkat, status }) 
        });
        alert("Status diperbarui!");
        muatJadwal();
    } catch (e) { alert("Gagal koneksi server."); }
}

// --- 3. KELOLA SOAL ---
function switchSubSoal(mode) {
    document.getElementById('sub-soal-input').classList.toggle('hidden', mode !== 'input');
    document.getElementById('sub-soal-daftar').classList.toggle('hidden', mode !== 'daftar');
    document.getElementById('btn-sub-input').classList.toggle('active', mode === 'input');
    document.getElementById('btn-sub-daftar').classList.toggle('active', mode === 'daftar');
    if (mode === 'daftar') muatDatabaseSoal();
}

async function muatDatabaseSoal() {
    try {
        const body = document.getElementById('t-database-soal');
        body.innerHTML = "<tr><td colspan='5' style='text-align:center'>Memuat data soal...</td></tr>";
        const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
        const d = await r.json();
        
        const listMapel = [...new Set(d.map(v => v[8]).filter(v => v))].sort();
        document.getElementById('filter-mapel-soal').innerHTML = '<option value="">-- Semua Mapel --</option>' + listMapel.map(m => `<option value="${m}">${m}</option>`).join('');

        body.innerHTML = d.map(v => `
            <tr data-mapel="${(v[8]||'').toUpperCase()}">
                <td>${v[0]}</td>
                <td><strong>${v[8]||'-'}</strong><br><small>${v[1]} | ${v[2]}</small></td>
                <td>${v[3]}</td>
                <td>${(v[4]||'').toString().substring(0,40)}...</td>
                <td>
                    <button class="btn btn-sm btn-orange" onclick='isiFormEdit(${JSON.stringify(v)})'>Edit</button>
                    <button class="btn btn-sm btn-red" onclick="hapusSoal('${v[0]}')">Hapus</button>
                </td>
            </tr>`).join('');
    } catch (e) { document.getElementById('t-database-soal').innerHTML = "<tr><td colspan='5'>Data gagal dimuat.</td></tr>"; }
}

async function simpanSoal() {
    const id = document.getElementById('edit-id').value;
    const data = {
        action: id ? "updateSoal" : "inputSoal",
        id: id,
        tingkat: document.getElementById('i-rombel').value || document.getElementById('i-tingkat').value,
        jurusan: document.getElementById('i-jurusan').value,
        mapel: document.getElementById('i-mapel-nama').value,
        tipe: document.getElementById('i-tipe').value,
        pertanyaan: document.getElementById('q-text').value,
        opsi: [document.getElementById('o1').value, document.getElementById('o2').value, document.getElementById('o3').value, document.getElementById('o4').value],
        kunci: document.getElementById('q-kunci').value,
        status: document.getElementById('i-status').value
    };
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify(data) });
    alert("Berhasil disimpan!");
    location.reload();
}

async function hapusSoal(id) {
    if(!confirm("Hapus soal ini?")) return;
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "hapusSoal", id }) });
    alert("Terhapus!");
    muatDatabaseSoal();
}

function filterTabelSoal() {
    const mapel = document.getElementById("filter-mapel-soal").value.toUpperCase();
    const cari = document.getElementById("cari-soal-teks").value.toUpperCase();
    const rows = document.querySelectorAll("#t-database-soal tr");
    rows.forEach(row => {
        const match = (mapel === "" || row.getAttribute("data-mapel").includes(mapel)) && row.innerText.toUpperCase().includes(cari);
        row.style.display = match ? "" : "none";
    });
}

// --- 4. DATA SISWA ---
async function muatTabelSiswa() {
    const r = await fetch(`${BASE_URL}?action=getDataSiswa`);
    const d = await r.json();
    const body = document.getElementById('t-siswa-body');
    const listKelas = [...new Set(d.map(v => v[2]))].sort();
    document.getElementById('filter-kelas-siswa').innerHTML = '<option value="">-- Semua Kelas --</option>' + listKelas.map(k => `<option value="${k}">${k}</option>`).join('');
    
    body.innerHTML = d.map(v => {
        const isIzin = (v[4]||'').trim().toUpperCase() === 'YA';
        return `<tr data-kelas="${v[2]}">
            <td><input type="checkbox" class="check-siswa" value="${v[0]}"></td>
            <td>${v[0]}</td><td>${v[1]}</td><td>${v[2]}</td>
            <td><span class="badge ${isIzin?'btn-green':'btn-red'}">${isIzin?'Izin':'Blokir'}</span></td>
            <td><button class="btn btn-sm ${isIzin?'btn-red':'btn-green'}" onclick="ubahIzinSiswa('${v[0]}','${isIzin?'Tidak':'Ya'}')">${isIzin?'Cabut':'Beri'}</button></td>
        </tr>`;
    }).join('');
}

async function ubahIzinSiswa(nis, status) {
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "updateIzinSiswa", nis, status }) });
    muatTabelSiswa();
}

function filterTabelSiswa() {
    const kls = document.getElementById("filter-kelas-siswa").value.toUpperCase();
    const cari = document.getElementById("cari-siswa").value.toUpperCase();
    const rows = document.querySelectorAll("#t-siswa-body tr");
    rows.forEach(row => {
        const match = (kls === "" || row.getAttribute("data-kelas").toUpperCase() === kls) && row.innerText.toUpperCase().includes(cari);
        row.style.display = match ? "" : "none";
    });
}

// --- 5. REKAP NILAI ---
async function muatRekapNilai() {
    const r = await fetch(`${BASE_URL}?action=getRekapNilai`);
    const d = await r.json();
    const target = document.getElementById('t-nilai');
    if(d.length === 0) { target.innerHTML = "<tr><td>Belum ada data nilai.</td></tr>"; return; }
    
    let html = "<thead><tr><th>Waktu</th><th>Nama</th><th>Kelas</th><th>Mapel</th><th>Nilai</th></tr></thead><tbody>";
    html += d.map(v => `<tr>
        <td>${new Date(v[0]).toLocaleString('id-ID')}</td>
        <td>${v[1]}</td><td>${v[2]}</td><td>${v[4]}</td><td><strong>${v[5]}</strong></td>
    </tr>`).join('');
    target.innerHTML = html + "</tbody>";
}

// --- HELPER ---
function toggleOpsi() {
    const tipe = document.getElementById('i-tipe').value;
    document.getElementById('opsi-container').style.display = (tipe === "IS" || tipe === "ES") ? "none" : "block";
}

function resetFormSoal() {
    document.getElementById('edit-id').value = "";
    document.getElementById('q-text').value = "";
    document.getElementById('btn-cancel-edit').classList.add('hidden');
}

window.onload = muatJadwal;
