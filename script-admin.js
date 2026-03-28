/** * SCRIPT-ADMIN.JS (FINAL SYNC)
 * Pastikan variabel BASE_URL sudah benar sesuai link Web App Bapak
 */
const BASE_URL = "https://script.google.com/macros/s/AKfycbzcfarL2U0IVKCjWYePFOx8GyYvUXXMOzgw05NBg65glTjKDP7A_EGNfmTqADb9xsHb/exec";

// --- 1. NAVIGASI PANEL ---
function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (el) el.classList.add('active');
    
    // Trigger muat data otomatis saat menu diklik
    if (id === 'p-dash') muatJadwal();
    if (id === 'p-soal') switchSubSoal('input'); // Default ke input, tapi bisa pindah ke daftar
    if (id === 'p-siswa') muatTabelSiswa();
    if (id === 'p-nilai') muatRekapNilai();
}

// --- 2. KELOLA SOAL (DAFTAR SOAL & TOMBOL AKSI) ---
function switchSubSoal(mode) {
    document.getElementById('sub-soal-input').classList.toggle('hidden', mode !== 'input');
    document.getElementById('sub-soal-daftar').classList.toggle('hidden', mode !== 'daftar');
    document.getElementById('btn-sub-input').classList.toggle('active', mode === 'input');
    document.getElementById('btn-sub-daftar').classList.toggle('active', mode === 'daftar');
    if (mode === 'daftar') muatDatabaseSoal();
}

async function muatDatabaseSoal() {
    const body = document.getElementById('t-database-soal');
    body.innerHTML = "<tr><td colspan='5' style='text-align:center'>Memuat Database Soal...</td></tr>";
    
    try {
        const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
        const d = await r.json();
        
        if (d.length === 0) {
            body.innerHTML = "<tr><td colspan='5' style='text-align:center'>Belum ada soal di database.</td></tr>";
            return;
        }

        body.innerHTML = d.map(v => `
            <tr data-mapel="${(v[8]||'').toUpperCase()}">
                <td>${v[0]}</td>
                <td><strong>${v[8]||'-'}</strong><br><small>${v[1]} | ${v[2]}</small></td>
                <td><span class="badge btn-orange">${v[3]}</span></td>
                <td>${(v[4]||'').toString().substring(0,50)}...</td>
                <td>
                    <button class="btn btn-sm btn-blue" onclick="editSoal('${v[0]}')">Edit</button>
                    <button class="btn btn-sm btn-red" onclick="hapusSoal('${v[0]}')">Hapus</button>
                </td>
            </tr>`).join('');
    } catch (e) {
        body.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>Gagal mengambil data soal.</td></tr>";
    }
}

// --- 3. DATA SISWA (PENYEBAB KOSONG) ---
async function muatTabelSiswa() {
    const body = document.getElementById('t-siswa-body');
    body.innerHTML = "<tr><td colspan='6' style='text-align:center'>Sedang menarik data siswa...</td></tr>";
    
    try {
        const r = await fetch(`${BASE_URL}?action=getDataSiswa`);
        const d = await r.json();
        
        // Update Filter Kelas
        const listKelas = [...new Set(d.map(v => v[2]))].sort();
        const selectFilter = document.getElementById('filter-kelas-siswa');
        if(selectFilter) {
            selectFilter.innerHTML = '<option value="">-- Semua Kelas --</option>' + 
            listKelas.map(k => `<option value="${k}">${k}</option>`).join('');
        }

        body.innerHTML = d.map(v => {
            const isIzin = (v[4] || '').trim().toUpperCase() === 'YA';
            return `<tr data-kelas="${v[2]}">
                <td><input type="checkbox" class="check-siswa" value="${v[0]}"></td>
                <td>${v[0]}</td>
                <td>${v[1]}</td>
                <td>${v[2]}</td>
                <td><span class="badge ${isIzin ? 'btn-green' : 'btn-red'}">${isIzin ? 'IZIN' : 'BLOKIR'}</span></td>
                <td>
                    <button class="btn btn-sm ${isIzin ? 'btn-red' : 'btn-green'}" 
                    onclick="ubahIzinSiswa('${v[0]}','${isIzin ? 'Tidak' : 'Ya'}')">
                    ${isIzin ? 'Blokir' : 'Izinkan'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        body.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red;'>Gagal memuat data siswa. Cek koneksi atau Apps Script.</td></tr>";
    }
}

// --- 4. FUNGSI AKSI (HAPUS & IZIN) ---
async function hapusSoal(id) {
    if(!confirm(`Yakin ingin menghapus soal ID: ${id}?`)) return;
    try {
        await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "hapusSoal", id: id }) });
        alert("Soal berhasil dihapus!");
        muatDatabaseSoal();
    } catch (e) { alert("Gagal menghapus."); }
}

async function ubahIzinSiswa(nis, status) {
    try {
        await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "updateIzinSiswa", nis: nis, status: status }) });
        muatTabelSiswa();
    } catch (e) { alert("Gagal merubah status izin."); }
}

// Jalankan jadwal saat pertama kali load
window.onload = () => { muatJadwal(); };
