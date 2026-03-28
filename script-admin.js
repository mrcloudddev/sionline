const BASE_URL = "https://script.google.com/macros/s/AKfycbzcfarL2U0IVKCjWYePFOx8GyYvUXXMOzgw05NBg65glTjKDP7A_EGNfmTqADb9xsHb/exec";

function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(el) el.classList.add('active');
    
    if(id === 'p-dash') muatJadwal();
    if(id === 'p-soal') muatDatabaseSoal();
}

async function muatJadwal() {
    const r = await fetch(`${BASE_URL}?action=getPengaturan`);
    const d = await r.json();
    document.getElementById('t-jadwal').innerHTML = d.map(v => {
        const isAktif = v[3].toLowerCase() === 'aktif';
        return `
        <tr>
            <td>${v[0]}</td><td>${v[1]}</td>
            <td><span class="badge ${isAktif?'btn-green':'btn-red'}">${v[3]}</span></td>
            <td><button class="btn btn-sm" onclick="toggleUjian('${v[0]}','${v[1]}','${isAktif?'Nonaktif':'Aktif'}')">Set ${isAktif?'OFF':'ON'}</button></td>
        </tr>`;
    }).join('');
}

async function toggleUjian(mapel, tingkat, status) {
    await fetch(BASE_URL, { method: 'POST', body: JSON.stringify({ action: "toggleUjian", mapel, tingkat, status }) });
    muatJadwal();
}

async function muatDatabaseSoal() {
    const r = await fetch(`${BASE_URL}?action=getDatabaseSoal`);
    const d = await r.json();
    document.getElementById('t-database-soal').innerHTML = d.map(v => `
        <tr>
            <td>${v[0]}</td><td>${v[8]} (${v[1]})</td><td>${v[3]}</td><td>${v[4].substring(0,30)}...</td>
            <td><button class="btn btn-red btn-sm" onclick="hapusSoal('${v[0]}')">Hapus</button></td>
        </tr>`).join('');
}

window.onload = muatJadwal;
