// DOM Elementlarini tanlab olish
const debtForm = document.getElementById('debtForm');
const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const debtList = document.getElementById('debtList');
const totalAmountEl = document.getElementById('totalAmount');
const searchInput = document.getElementById('search');

// API endpoint
const API_URL = '/api/debts';

let debts = [];

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
    totalAmountEl.textContent = formatMoney(total);
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

    const filteredDebts = debts.filter(item => 
        item.name.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filteredDebts.length === 0) {
        debtList.innerHTML = '<li class="empty-msg">Hech qanday qarz topilmadi.</li>';
        return;
    }

    filteredDebts.forEach(debt => {
        const li = document.createElement('li');
        li.className = 'debt-item';
        li.innerHTML = `
            <div class="debt-info">
                <div class="debt-name">${escapeHTML(debt.name)}</div>
                <div class="debt-date">${debt.date}</div>
            </div>
            <div class="debt-actions">
                <div class="debt-amount">${formatMoney(debt.amount)}</div>
                <button class="btn-delete" onclick="deleteDebt('${debt.id}')" title="O'chirish">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        debtList.appendChild(li);
    });
}

// Qarz qo'shish hodisasi
debtForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const amount = amountInput.value.trim();

    if (!name || !amount) return;

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

        debts = debts.filter(item => item.id !== id);
        renderDebts();
        updateSummary();
    } catch (error) {
        alert('Qarzni o\'chirishda xato yuz berdi: ' + error.message);
    }
}

// Qidiruv tizimi
searchInput.addEventListener('input', (e) => {
    renderDebts(e.target.value);
});

// Sahifa yuklanganda qarzlarni olish
loadDebts();
