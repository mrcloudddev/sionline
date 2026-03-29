/**
 * SISTEM ADMIN SMK MANDIRI - LOGIKA FINAL (V.11.0)
 * Developer: Pak Dwi Frediawan
 * Fitur: Navigasi, CRUD Soal, Kontrol Jadwal, Izin Siswa, & Rekap Nilai
 */

// PENTING: Ganti dengan URL Web App hasil "New Deployment" (Access: Anyone)
const BASE_URL = "https://script.google.com/macros/s/AKfycbxttRQYJ01rfAWm2CdeEh1OuQT4-2U9zFYBBpolHlPFK8fFcCWIjD3wxvxEwH76Z_w3/exec";

// --- 1. NAVIGASI PANEL UTAMA ---
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
    const body = document.getElementById('t-jadwal');
    if(!body) return;
    body.innerHTML = "<tr><td colspan='4' style='text-align:center'>Memuat jadwal ujian...</td></tr>";
    
    try {
        const r = await fetch(`${BASE_URL}?action=getPengaturan&t=${Date.now()}`);
        const d = await r.json();
        body.innerHTML = d.map(v => {
            const statusRaw = (v[3] || '').toString().toUpperCase();
            const isAktif = statusRaw === 'AKTIF' || statusRaw === 'ON';
            return `<tr>
                <td>${v[0]}</td><td>${v[1]}</td>
                <td><span class="badge ${isAktif ? 'btn-green' : 'btn-red'}">${statusRaw}</span></td>
                <td>
                    <button class="btn btn-sm ${isAktif ? 'btn-red' : 'btn-green'}" 
                    onclick="toggleUjian('${v[0]}', '${v[1]}', '${isAktif ? 'Nonaktif' : 'Aktif'}')">
                    ${isAktif ? 'Matikan' : 'Aktifkan'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { body.innerHTML = "<tr><td colspan='4'>Gagal muat jadwal.</td></tr>"; }
}

async function toggleUjian(mapel, tingkat, status) {
    try {
        await fetch(BASE_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: "toggleUjian", mapel, tingkat, status }) 
        });
        muatJadwal();
    } catch (e) { alert("Gagal update status jadwal."); }
}

// --- 3. KELOLA SOAL ---
function switchSubSoal(mode) {
    document.getElementById('sub-soal-input').classList.toggle('hidden', mode !== 'input');
    document.getElementById('sub-soal-daftar').classList.toggle('hidden', mode !== 'daftar');
    document.getElementById('btn-sub-input').classList.toggle('active', mode === 'input');
    document.getElementById('btn-sub-daftar').classList.toggle('active', mode === 'daftar');
    if (mode === 'daftar') muatDatabaseSoal();
}

async function simpanSoal() {
    const btn = document.querySelector('button[onclick="simpanSoal()"]');
    const idSoal = document.getElementById('edit-id').value;
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const selectJurusan = document.getElementById('i-jurusan');
    const pilihanJurusan = Array.from(selectJurusan.selectedOptions).map(opt => opt.value).join(', ');

    const payload = {
        action: idSoal ? "updateSoal" : "inputSoal",
        id: idSoal,
        tingkat: document.getElementById('i-tingkat').value,
        jurusan: pilihanJurusan,
        rombel: document.getElementById('i-rombel').value,
        mapel: document.getElementById('i-mapel-nama').value,
        tipe: document.getElementById('i-tipe').value,
        pertanyaan: document.getElementById('q-text').value,
        opsi: [document.getElementById('o1').value, document.getElementById('o2').value, document.getElementById('o3').value, document.getElementById('o4').value],
        kunci: document.getElementById('q-kunci').value,
        status: document.getElementById('i-status').value
    };

    try {
        await fetch(BASE_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("Berhasil!"); location.reload();
    } catch (e) { alert("Gagal!"); btn.disabled = false; }
}

async function muatDatabaseSoal() {
    const body = document.getElementById('t-database-soal');
    if(!body) return;
    try {
        const r = await fetch(`${BASE_URL}?action=getDatabaseSoal&t=${Date.now()}`);
        const d = await r.json();
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
    } catch (e) { body.innerHTML = "<tr><td colspan='5'>Gagal muat soal.</td></tr>"; }
}

// Tambahkan inisialisasi awal
window.onload = muatJadwal;
