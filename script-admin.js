const BASE_URL = "https://script.google.com/macros/s/AKfycbzcfarL2U0IVKCjWYePFOx8GyYvUXXMOzgw05NBg65glTjKDP7A_EGNfmTqADb9xsHb/exec";

// --- 1. NAVIGASI UTAMA ---
function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (el) el.classList.add('active');
    
    // Auto-load data sesuai panel yang dibuka
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
        const body = document.getElementById('t-jadwal');
        body.innerHTML = d.map(v => {
            const isAktif = (v[3] || '').toLowerCase() === 'aktif';
            return `<tr>
                <td>${v[0]}</td>
                <td>${v[1]}</td>
                <td><span class="badge ${isAktif ? 'btn-green' : 'btn-red'}">${v[3]}</span></td>
                <td><button class="btn btn-sm" onclick="toggleUjian('${v[0]}', '${v[1]}', '${isAktif ? 'Nonaktif' : 'Aktif'}')">Toggle</button></td>
            </tr>`;
        }).join('');
    } catch (e) { console.error("Gagal muat jadwal"); }
}

async function toggleUjian(mapel, tingkat, status) {
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "toggleUjian", mapel, tingkat, status }) });
    muatJadwal();
}

// --- 3. KELOLA SOAL ---
async function muatDatabaseSoal() {
    try {
        const body = document.getElementById('t-database-soal');
        body.innerHTML = "<tr><td colspan='5'>Memuat...</td></tr>";
        const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
        const d = await r.json();
        
        const listMapel = [...new Set(d.map(v => v[8]).filter(v => v))].sort();
        document.getElementById('filter-mapel-soal').innerHTML = '<option value="">-- Semua Mapel --</option>' + listMapel.map(m => `<option value="${m}">${m}</option>`).join('');

        body.innerHTML = d.map(v => `
            <tr data-mapel="${(v[8]||'').toUpperCase()}">
                <td>${v[0]}</td>
                <td><strong>${v[8]||'-'}</strong><br><small>${v[1]} | ${v[2]}</small></td>
                <td>${v[3]}</td>
                <td>${(v[4]||'').substring(0,40)}...</td>
                <td><button class="btn btn-red btn-sm" onclick="hapusSoal('${v[0]}')">Hapus</button></td>
            </tr>`).join('');
    } catch (e) { body.innerHTML = "<tr><td colspan='5'>Gagal muat data.</td></tr>"; }
}

// --- 4. DATA SISWA (INI YANG TADI KETINGGALAN) ---
async function muatTabelSiswa() {
    try {
        const body = document.getElementById('t-siswa-body');
        body.innerHTML = "<tr><td colspan='6'>Memuat data siswa...</td></tr>";
        
        const r = await fetch(`${BASE_URL}?action=getDataSiswa`);
        const d = await r.json();
        
        const listKelas = [...new Set(d.map(v => v[2]))].sort();
        document.getElementById('filter-kelas-siswa').innerHTML = '<option value="">-- Semua Kelas --</option>' + listKelas.map(k => `<option value="${k}">${k}</option>`).join('');

        body.innerHTML = d.map(v => {
            const isIzin = (v[4] || '').trim().toUpperCase() === 'YA';
            return `<tr data-kelas="${v[2]}">
                <td><input type="checkbox" class="check-siswa" value="${v[0]}"></td>
                <td>${v[0]}</td><td>${v[1]}</td><td>${v[2]}</td>
                <td><span class="badge ${isIzin ? 'btn-green' : 'btn-red'}">${isIzin ? 'Izin' : 'Blokir'}</span></td>
                <td><button class="btn btn-sm" onclick="ubahIzinSiswa('${v[0]}','${isIzin ? 'Tidak' : 'Ya'}')">Set Izin</button></td>
            </tr>`;
        }).join('');
    } catch (e) { console.log("Gagal muat siswa"); }
}

async function ubahIzinSiswa(nis, status) {
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "updateIzinSiswa", nis, status }) });
    muatTabelSiswa();
}

// --- 5. REKAP NILAI ---
async function muatRekapNilai() {
    try {
        const r = await fetch(`${BASE_URL}?action=getRekapNilai`);
        const d = await r.json();
        const target = document.getElementById('t-nilai');
        if(d.length === 0) { target.innerHTML = "<tr><td>Belum ada data nilai.</td></tr>"; return; }
        
        let html = "<thead><tr><th>Waktu</th><th>Nama</th><th>Kelas</th><th>Nilai</th></tr></thead><tbody>";
        html += d.map(v => `<tr><td>${v[0]}</td><td>${v[1]}</td><td>${v[2]}</td><td>${v[5]}</td></tr>`).join('');
        target.innerHTML = html + "</tbody>";
    } catch (e) { console.log("Gagal muat nilai"); }
}

// --- FUNGSI SEARCH & FILTER ---
function filterTabelSiswa() {
    const kls = document.getElementById("filter-kelas-siswa").value.toUpperCase();
    const cari = document.getElementById("cari-siswa").value.toUpperCase();
    document.querySelectorAll("#t-siswa-body tr").forEach(row => {
        const match = (kls === "" || row.getAttribute("data-kelas").toUpperCase() === kls) && row.innerText.toUpperCase().includes(cari);
        row.style.display = match ? "" : "none";
    });
}

function filterTabelSoal() {
    const mapel = document.getElementById("filter-mapel-soal").value.toUpperCase();
    document.querySelectorAll("#t-database-soal tr").forEach(row => {
        const match = (mapel === "" || row.getAttribute("data-mapel").includes(mapel));
        row.style.display = match ? "" : "none";
    });
}

window.onload = muatJadwal;
