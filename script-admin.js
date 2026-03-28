const BASE_URL = "https://script.google.com/macros/s/AKfycbzpMAzLDu_akdHpvOUTsxcvcyJ_unF7f7o8j_UoKqQ7EI4RrBLSsuogK2yJxoGigbE6/exec";

// --- 1. NAVIGASI & AUTO-LOAD ---
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

// --- 2. DASHBOARD: KONTROL JADWAL (FIXED) ---
async function muatJadwal() {
    const body = document.getElementById('t-jadwal');
    try {
        const r = await fetch(`${BASE_URL}?action=getPengaturan`);
        const d = await r.json();
        body.innerHTML = d.map(v => {
            const isAktif = (v[3] || '').toString().toLowerCase() === 'aktif';
            return `<tr>
                <td>${v[0]}</td><td>${v[1]}</td>
                <td><span class="badge ${isAktif ? 'btn-green' : 'btn-red'}">${v[3]}</span></td>
                <td>
                    <button class="btn btn-sm ${isAktif ? 'btn-red' : 'btn-green'}" 
                    onclick="toggleUjian('${v[0]}', '${v[1]}', '${isAktif ? 'Nonaktif' : 'Aktif'}')">
                    ${isAktif ? 'Matikan' : 'Aktifkan'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { body.innerHTML = "Gagal muat jadwal."; }
}

async function toggleUjian(mapel, tingkat, status) {
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "toggleUjian", mapel, tingkat, status }) });
    muatJadwal();
}

// --- 3. KELOLA SOAL (MULTIPLE JURUSAN & DAFTAR SOAL) ---
async function muatDatabaseSoal() {
    const body = document.getElementById('t-database-soal');
    try {
        const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
        const d = await r.json();
        body.innerHTML = d.map(v => `
            <tr>
                <td>${v[0]}</td>
                <td><strong>${v[8]}</strong><br><small>${v[1]} | ${v[2]}</small></td>
                <td>${v[3]}</td>
                <td>${(v[4]||'').toString().substring(0,30)}...</td>
                <td>
                    <button class="btn btn-sm btn-red" onclick="hapusSoal('${v[0]}')">Hapus</button>
                </td>
            </tr>`).join('');
    } catch (e) { body.innerHTML = "Gagal muat soal."; }
}

async function hapusSoal(id) {
    if(!confirm("Hapus soal ini?")) return;
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "hapusSoal", id }) });
    muatDatabaseSoal();
}

// Logika Simpan Soal dengan Multiple Jurusan
async function simpanSoalBaru() {
    // Mengambil banyak jurusan yang dipilih
    const selectedJurusan = Array.from(document.getElementById('i-jurusan').selectedOptions).map(opt => opt.value).join(', ');
    
    const data = {
        action: "inputSoal",
        tingkat: document.getElementById('i-tingkat').value,
        jurusan: selectedJurusan, // Hasilnya: "Broadcasting, Teknik Sepeda Motor"
        mapel: document.getElementById('i-mapel-nama').value,
        pertanyaan: document.getElementById('q-text').value,
        // ... ambil data lainnya sesuai ID input bapak
    };
    // Fetch ke POST...
}

// --- 4. DATA SISWA & FILTER KELAS (FIXED) ---
async function muatTabelSiswa() {
    const body = document.getElementById('t-siswa-body');
    try {
        const r = await fetch(`${BASE_URL}?action=getDataSiswa`);
        const d = await r.json();
        
        // Isi Filter Kelas secara otomatis
        const listKelas = [...new Set(d.map(v => v[2]))].sort();
        document.getElementById('filter-kelas-siswa').innerHTML = '<option value="">-- Semua Kelas --</option>' + 
            listKelas.map(k => `<option value="${k}">${k}</option>`).join('');

        body.innerHTML = d.map(v => `
            <tr data-kelas="${v[2]}">
                <td><input type="checkbox" class="check-siswa" value="${v[0]}"></td>
                <td>${v[0]}</td><td>${v[1]}</td><td>${v[2]}</td>
                <td>${v[4]}</td>
                <td><button class="btn btn-sm" onclick="ubahIzinSiswa('${v[0]}','Ya')">Izin</button></td>
            </tr>`).join('');
    } catch (e) { body.innerHTML = "Gagal muat siswa."; }
}

// Checkbox Pilih Semua
function pilihSemuaSiswa(mainCb) {
    document.querySelectorAll('.check-siswa').forEach(cb => cb.checked = mainCb.checked);
}

// --- 5. HASIL UJIAN (FIXED) ---
async function muatRekapNilai() {
    const body = document.getElementById('t-nilai');
    try {
        const r = await fetch(`${BASE_URL}?action=getRekapNilai`);
        const d = await r.json();
        body.innerHTML = d.map(v => `
            <tr>
                <td>${v[0]}</td><td>${v[1]}</td><td>${v[2]}</td><td>${v[4]}</td><td>${v[5]}</td>
            </tr>`).join('');
    } catch (e) { body.innerHTML = "Belum ada hasil ujian."; }
}

window.onload = muatJadwal;
