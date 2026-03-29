/**
 * SISTEM ADMIN SMK MANDIRI - FIX LOGIC (V.11.0)
 * Sinkronisasi ID HTML dengan Logika JavaScript
 */

// GANTI DENGAN URL WEB APP ANDA YANG BARU SETIAP DEPLOY VERSI BARU
const BASE_URL = "https://script.google.com/macros/s/AKfycbxttRQYJ01rfAWm2CdeEh1OuQT4-2U9zFYBBpolHlPFK8fFcCWIjD3wxvxEwH76Z_w3/exec";

// --- 1. NAVIGASI PANEL ---
function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (el) el.classList.add('active');
    
    // Auto-load data saat panel dibuka
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
        const r = await fetch(`${BASE_URL}?action=getPengaturan&t=${new Date().getTime()}`);
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
    } catch (e) { body.innerHTML = "<tr><td colspan='4' style='text-align:center'>Gagal muat jadwal.</td></tr>"; }
}

async function toggleUjian(mapel, tingkat, status) {
    try {
        await fetch(BASE_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: "toggleUjian", mapel, tingkat, status }) 
        });
        muatJadwal();
    } catch (e) { alert("Gagal update status."); }
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
    
    if(btn) { btn.innerText = "Sedang Menyimpan..."; btn.disabled = true; }

    const selectJurusan = document.getElementById('i-jurusan');
    const pilihanJurusan = Array.from(selectJurusan.selectedOptions).map(opt => opt.value).join(', ');

    const data = {
        action: idSoal ? "updateSoal" : "inputSoal",
        id: idSoal,
        // FIX: i-rombel di HTML Anda digunakan untuk rombel spesifik
        tingkat: document.getElementById('i-tingkat').value,
        rombel: document.getElementById('i-rombel').value,
        jurusan: pilihanJurusan,
        mapel: document.getElementById('i-mapel-nama').value,
        tipe: document.getElementById('i-tipe').value,
        pertanyaan: document.getElementById('q-text').value,
        opsi: [
            document.getElementById('o1').value, 
            document.getElementById('o2').value, 
            document.getElementById('o3').value, 
            document.getElementById('o4').value
        ],
        kunci: document.getElementById('q-kunci').value,
        status: document.getElementById('i-status').value
    };

    try {
        await fetch(BASE_URL, { method: 'POST', body: JSON.stringify(data) });
        alert(idSoal ? "Soal Berhasil Diperbarui!" : "Soal Baru Berhasil Ditambahkan!");
        location.reload();
    } catch (e) {
        alert("Gagal memproses data.");
        if(btn) { btn.innerText = "Simpan Soal"; btn.disabled = false; }
    }
}

async function muatDatabaseSoal() {
    const body = document.getElementById('t-database-soal');
    if(!body) return;
    try {
        const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
        const d = await r.json();
        
        // Update Filter Mapel
        const listMapel = [...new Set(d.map(v => v[8]).filter(v => v))].sort();
        document.getElementById('filter-mapel-soal').innerHTML = '<option value="">-- Semua Mapel --</option>' + 
            listMapel.map(m => `<option value="${m}">${m}</option>`).join('');

        body.innerHTML = d.map(v => `
            <tr data-mapel="${(v[8]||'').toUpperCase()}">
                <td>${v[0]}</td>
                <td><strong>${v[8]}</strong><br><small>${v[1]} | ${v[2]}</small></td>
                <td>${v[3]}</td>
                <td>${(v[4]||'').toString().substring(0,30)}...</td>
                <td>
                    <button class="btn btn-sm btn-orange" onclick='isiFormEdit(${JSON.stringify(v)})'>Edit</button>
                    <button class="btn btn-sm btn-red" onclick="hapusSoal('${v[0]}')">Hapus</button>
                </td>
            </tr>`).join('');
    } catch (e) { body.innerHTML = "<tr><td colspan='5'>Gagal muat soal.</td></tr>"; }
}

function isiFormEdit(v) {
    switchSubSoal('input');
    document.getElementById('edit-id').value = v[0];
    document.getElementById('i-mapel-nama').value = v[8];
    document.getElementById('i-tingkat').value = v[1];
    document.getElementById('i-rombel').value = v[9] || ""; // Kolom J jika ada
    document.getElementById('q-text').value = v[4];
    document.getElementById('q-kunci').value = v[6];
    document.getElementById('i-status').value = (v[7]||'').toLowerCase();
    document.getElementById('i-tipe').value = v[3];
    
    // Multiple Jurusan
    const jurArray = (v[2]||"").split(',').map(s => s.trim());
    const selectJur = document.getElementById('i-jurusan');
    Array.from(selectJur.options).forEach(opt => opt.selected = jurArray.includes(opt.value));

    // Opsi
    try {
        const opsi = JSON.parse(v[5]);
        document.getElementById('o1').value = opsi[0] || '';
        document.getElementById('o2').value = opsi[1] || '';
        document.getElementById('o3').value = opsi[2] || '';
        document.getElementById('o4').value = opsi[3] || '';
    } catch(e) { console.log("Bukan format JSON"); }

    document.getElementById('form-title').innerText = "Edit Soal: " + v[0];
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    toggleOpsi();
    window.scrollTo(0,0);
}

function resetFormSoal() {
    document.getElementById('edit-id').value = "";
    document.getElementById('q-text').value = "";
    document.getElementById('form-title').innerText = "Form Input/Edit Soal";
    document.getElementById('btn-cancel-edit').classList.add('hidden');
}

// --- 4. DATA SISWA ---
async function muatTabelSiswa() {
    const body = document.getElementById('t-siswa-body');
    if(!body) return;
    body.innerHTML = "<tr><td colspan='6' style='text-align:center'>Memuat data siswa...</td></tr>";
    
    try {
        const r = await fetch(`${BASE_URL}?action=getDataSiswa`);
        const d = await r.json();
        
        const listKelas = [...new Set(d.map(v => v[2]))].sort();
        document.getElementById('filter-kelas-siswa').innerHTML = '<option value="">-- Semua Kelas --</option>' + 
            listKelas.map(k => `<option value="${k}">${k}</option>`).join('');

        body.innerHTML = d.map(v => {
            const isIzin = (v[4] || '').toString().trim().toUpperCase() === 'YA';
            return `<tr data-kelas="${v[2]}">
                <td><input type="checkbox" class="check-siswa" value="${v[0]}"></td>
                <td>${v[0]}</td><td>${v[1]}</td><td>${v[2]}</td>
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

async function ubahIzinSiswa(nis, status) {
    try {
        await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "updateIzinSiswa", nis, status }) });
        muatTabelSiswa();
    } catch (e) { alert("Gagal ubah izin."); }
}

function toggleSelectAll(source) {
    document.querySelectorAll('.check-siswa').forEach(cb => {
        if (cb.closest('tr').style.display !== 'none') cb.checked = source.checked;
    });
}

async function bulkUpdateIzin(status) {
    const terpilih = Array.from(document.querySelectorAll('.check-siswa:checked')).map(cb => cb.value);
    if(terpilih.length === 0) return alert("Pilih siswa dulu!");
    if(!confirm(`Update izin ${terpilih.length} siswa menjadi ${status}?`)) return;
    
    for(let nis of terpilih) {
        await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "updateIzinSiswa", nis, status }) });
    }
    alert("Selesai!"); muatTabelSiswa();
}

function filterTabelSiswa() {
    const kls = document.getElementById("filter-kelas-siswa").value.toUpperCase();
    const cari = document.getElementById("cari-siswa").value.toUpperCase();
    document.querySelectorAll("#t-siswa-body tr").forEach(row => {
        const match = (kls === "" || row.getAttribute("data-kelas").toUpperCase() === kls) && row.innerText.toUpperCase().includes(cari);
        row.style.display = match ? "" : "none";
    });
}

// --- 5. HASIL NILAI & HELPERS ---
async function muatRekapNilai() {
    const body = document.getElementById('t-nilai');
    if(!body) return;
    body.innerHTML = "<tr><td colspan='5' style='text-align:center'>Memuat hasil...</td></tr>";
    try {
        const r = await fetch(`${BASE_URL}?action=getRekapNilai`);
        const d = await r.json();
        body.innerHTML = d.map(v => `
            <tr>
                <td>${v[0] ? new Date(v[0]).toLocaleString('id-ID') : '-'}</td>
                <td>${v[1]}</td><td>${v[2]}</td><td>${v[4]}</td><td><strong>${v[5]}</strong></td>
            </tr>`).join('');
    } catch (e) { body.innerHTML = "<tr><td colspan='5' style='text-align:center'>Belum ada hasil.</td></tr>"; }
}

function toggleOpsi() {
    const tipe = document.getElementById('i-tipe').value;
    document.getElementById('opsi-container').style.display = (tipe === "IS" || tipe === "ES") ? "none" : "block";
}

function filterTabelSoal() {
    const mapel = document.getElementById("filter-mapel-soal").value.toUpperCase();
    const cari = document.getElementById("cari-soal-teks").value.toUpperCase();
    document.querySelectorAll("#t-database-soal tr").forEach(row => {
        const match = (mapel === "" || row.getAttribute("data-mapel").includes(mapel)) && row.innerText.toUpperCase().includes(cari);
        row.style.display = match ? "" : "none";
    });
}

window.onload = muatJadwal;
