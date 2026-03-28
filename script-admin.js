const BASE_URL = "https://script.google.com/macros/s/AKfycbzJjzcabybh5kvVOCqDGUQ-wquEiWKuAWg3fB03U5dRm2UgusWjUsduITWIlgBrMiny/exec";

// 1. FUNGSI NAVIGASI (Agar panel bisa ganti-ganti)
function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (el) el.classList.add('active');
    
    // Auto-load data
    if (id === 'p-dash') muatJadwal();
    if (id === 'p-soal') switchSubSoal('input');
    if (id === 'p-siswa') muatTabelSiswa();
    if (id === 'p-nilai') muatRekapNilai();
}

// 2. FUNGSI DATA SISWA (Memunculkan Nama & Izin)
async function muatTabelSiswa() {
    const body = document.getElementById('t-siswa-body');
    body.innerHTML = "<tr><td colspan='6' style='text-align:center'>Memuat data...</td></tr>";
    
    try {
        const r = await fetch(`${BASE_URL}?action=getDataSiswa`);
        const d = await r.json();
        
        body.innerHTML = d.map(v => {
            const isIzin = (v[4] || '').trim().toUpperCase() === 'YA';
            return `<tr>
                <td><input type="checkbox" class="check-siswa" value="${v[0]}"></td>
                <td>${v[0]}</td>
                <td>${v[1]}</td>
                <td>${v[2]}</td>
                <td><span class="badge ${isIzin ? 'btn-green' : 'btn-red'}">${isIzin ? 'IZIN' : 'BLOKIR'}</span></td>
                <td>
                    <button class="btn btn-sm ${isIzin ? 'btn-red' : 'btn-green'}" onclick="ubahIzinSiswa('${v[0]}','${isIzin ? 'Tidak' : 'Ya'}')">
                        ${isIzin ? 'Cabut' : 'Beri'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { body.innerHTML = "<tr><td colspan='6'>Gagal muat siswa.</td></tr>"; }
}

// 3. FUNGSI DAFTAR SOAL & TOMBOL AKSI
function switchSubSoal(mode) {
    document.getElementById('sub-soal-input').classList.toggle('hidden', mode !== 'input');
    document.getElementById('sub-soal-daftar').classList.toggle('hidden', mode !== 'daftar');
    if (mode === 'daftar') muatDatabaseSoal();
}

async function muatDatabaseSoal() {
    const body = document.getElementById('t-database-soal');
    body.innerHTML = "<tr><td colspan='5' style='text-align:center'>Memuat...</td></tr>";
    
    try {
        const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
        const d = await r.json();
        body.innerHTML = d.map(v => `
            <tr>
                <td>${v[0]}</td>
                <td><strong>${v[8]||'-'}</strong><br><small>${v[1]} | ${v[2]}</small></td>
                <td>${v[3]}</td>
                <td>${(v[4]||'').toString().substring(0,40)}...</td>
                <td>
                    <button class="btn btn-sm btn-orange" onclick='isiFormEdit(${JSON.stringify(v)})'>Edit</button>
                    <button class="btn btn-sm btn-red" onclick="hapusSoal('${v[0]}')">Hapus</button>
                </td>
            </tr>`).join('');
    } catch (e) { body.innerHTML = "<tr><td colspan='5'>Gagal muat soal.</td></tr>"; }
}

// 4. FUNGSI AKSI (Hapus & Izin)
async function hapusSoal(id) {
    if(!confirm("Hapus soal ID: " + id + "?")) return;
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "hapusSoal", id: id }) });
    alert("Terhapus!"); muatDatabaseSoal();
}

async function ubahIzinSiswa(nis, status) {
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "updateIzinSiswa", nis: nis, status: status }) });
    muatTabelSiswa();
}

// 5. FUNGSI DASHBOARD (Jadwal)
async function muatJadwal() {
    const r = await fetch(`${BASE_URL}?action=getPengaturan`);
    const d = await r.json();
    document.getElementById('t-jadwal').innerHTML = d.map(v => `
        <tr>
            <td>${v[0]}</td><td>${v[1]}</td>
            <td><span class="badge ${v[3].toLowerCase()==='aktif'?'btn-green':'btn-red'}">${v[3]}</span></td>
            <td><button class="btn btn-sm" onclick="toggleUjian('${v[0]}','${v[1]}','${v[3].toLowerCase()==='aktif'?'Nonaktif':'Aktif'}')">Toggle</button></td>
        </tr>`).join('');
}

async function toggleUjian(mapel, tingkat, status) {
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "toggleUjian", mapel, tingkat, status }) });
    muatJadwal();
}

window.onload = muatJadwal;
