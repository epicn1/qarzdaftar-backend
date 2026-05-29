// DOM Elementlarini tanlab olish
const debtForm = document.getElementById('debtForm');
const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const debtList = document.getElementById('debtList');
const trashList = document.getElementById('trashList');
const totalAmountEl = document.getElementById('totalAmount');
const searchInput = document.getElementById('search');
const exportBtn = document.getElementById('exportBtn');

// API endpoint
const API_URL = '/api/debts';

let debts = [];
// Korzinka ma'lumotlarini brauzerda saqlab turamiz
let trash = JSON.parse(localStorage.getItem('trash')) || [];

// Qarz ma'lumotlarini serverdan yuklash
async function loadDebts() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Server xatosi');
        debts = await response.json();
        renderDebts();
        updateSummary();
    } catch (error) {
        console.error('Qarzlarni yuklashda xato:', error);
        debtList.innerHTML = '<li class="empty-msg">Ma\'lumotlarni yuklashda xato yuz berdi.</li>';
    }
}

// Raqamlarni chiroyli formatda chiqarish (masalan: 100 000)
function formatMoney(amount) {
    return Number(amount).toLocaleString('uz-UZ') + ' UZS';
}

// Umumiy summani hisoblash va yangilash
function updateSummary() {
    const total = debts.reduce((sum, item) => sum + Number(item.amount), 0);
    if (totalAmountEl) totalAmountEl.textContent = formatMoney(total);
    localStorage.setItem('trash', JSON.stringify(trash));
}

// Xavfsizlik uchun (HTML Injection oldini olish)
function escapeHTML(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

// Qarzlar ro'yxatini ekranga chizish
function renderDebts(filterText = '') {
    debtList.innerHTML = '';
    trashList.innerHTML = '';

    const filteredDebts = debts
        .filter(item => item.name.toLowerCase().includes(filterText.toLowerCase()));

    if (filteredDebts.length === 0) {
        debtList.innerHTML = '<li class="empty-msg">Hech qanday qarz topilmadi.</li>';
    } else {
        filteredDebts.forEach(debt => {
            const li = document.createElement('li');
            li.className = `debt-item`;
            li.innerHTML = `
                <div class="debt-info">
                    <div class="debt-name"><b>${escapeHTML(debt.name)}</b></div>
                    <div class="debt-date">Qo'shilgan sana: ${debt.date}</div>
                </div>
                <div class="debt-actions">
                    <div class="debt-amount">${formatMoney(debt.amount)}</div>
                    <button class="btn-delete" onclick="deleteDebt('${debt.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            debtList.appendChild(li);
        });
    }

    // Korzinkani chizish
    trash.forEach(item => {
        const div = document.createElement('div');
        div.className = 'debt-item trash-item';
        div.innerHTML = `
            <div class="debt-info">
                <b>${escapeHTML(item.name)}</b>
                <span>${formatMoney(item.amount)}</span>
            </div>
            <div class="actions">
                <button class="btn-restore" onclick="restoreDebt('${item.id}')"><i class="fa-solid fa-rotate-left"></i></button>
                <button class="btn-delete" onclick="permanentlyDelete('${item.id}')"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;
        trashList.appendChild(div);
    });
}

// Qarz qo'shish hodisasi
debtForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const amount = amountInput.value.trim();

    if (!name || !amount) return;

    if (!/^[a-zA-Z\s'ʻʼ]+$/.test(name)) {
        alert("Ismga faqat harf yozing!");
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                amount: parseFloat(amount)
            })
        });

        if (!response.ok) throw new Error('Qarzni qo\'shishda xato');

        const newDebt = await response.json();
        debts.push(newDebt);
        
        // Formani tozalash
        debtForm.reset();
        nameInput.focus();
        
        renderDebts();
        updateSummary();
    } catch (error) {
        alert('Qarzni qo\'shishda xato yuz berdi: ' + error.message);
    }
});

// Qarzni o'chirish funksiyasi
async function deleteDebt(id) {
    if (!confirm('Rostdan ham o\'chirmoqchisiz?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('O\'chirishda xato');

        const deletedItem = debts.find(item => item.id === id);
        if (deletedItem) trash.push(deletedItem);
        
        debts = debts.filter(item => item.id !== id);
        renderDebts(searchInput.value);
        updateSummary();
    } catch (error) {
        alert('Qarzni o\'chirishda xato yuz berdi: ' + error.message);
    }
}

// Korzinkadan tiklash yoki butunlay o'chirish
window.restoreDebt = (id) => {
    const itemIndex = trash.findIndex(t => t.id === id);
    const item = trash.splice(itemIndex, 1)[0];
    // Serverga qayta qo'shish logikasi...
    debts.push(item); 
    renderDebts(searchInput.value);
    updateSummary();
};

window.permanentlyDelete = (id) => {
    trash = trash.filter(t => t.id !== id);
    renderDebts(searchInput.value);
    updateSummary();
};

// Excelga yuklash
exportBtn.addEventListener('click', () => {
    if (debts.length === 0) return alert("Ma'lumot yo'q!");
    let csv = "\ufeffIsm,Summa,Qo'shilgan sana\n";
    debts.forEach(d => {
        csv += `"${d.name}",${d.amount},${d.date}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "qarzlar.csv";
    link.click();
});

// Qidiruv tizimi
searchInput.addEventListener('input', (e) => {
    renderDebts(e.target.value);
});

// Sahifa yuklanganda qarzlarni olish
loadDebts();
