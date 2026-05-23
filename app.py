import os
import json
import time
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_FILE = 'database.json'

# Ma'lumotlar bazasini tekshirish va o'qish
def load_debts():
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

# Ma'lumotlarni bazaga yozish
def save_debts(debts):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(debts, f, ensure_ascii=False, indent=4)

# Bosh sahifani yuklash
@app.route('/')
def index():
    return render_template('index.html')

# API: Barcha qarzlarni olish
@app.route('/api/debts', methods=['GET'])
def get_debts():
    return jsonify(load_debts())

# API: Yangi qarz qo'shish
@app.route('/api/debts', methods=['POST'])
def add_debt():
    data = request.get_json()
    if not data or 'name' not in data or 'amount' not in data:
        return jsonify({'error': 'Ma\'lumotlar to\'liq emas'}), 400
    
    debts = load_debts()
    
    # Hozirgi vaqtni chiroyli formatda shakllantirish
    current_time = time.strftime('%d.%m.%Y %H:%M')
    
    new_debt = {
        'id': str(int(time.time() * 1000)), # Unikal ID
        'name': str(data['name']).strip(),
        'amount': float(data['amount']),
        'date': current_time
    }
    
    debts.append(new_debt)
    save_debts(debts)
    return jsonify(new_debt), 201

# API: Qarzni o'chirish
@app.route('/api/debts/<string:debt_id>', methods=['DELETE'])
def delete_debt(debt_id):
    debts = load_debts()
    updated_debts = [d for d in debts if d['id'] != debt_id]
    
    if len(debts) == len(updated_debts):
        return jsonify({'error': 'Qarz topilmadi'}), 404
        
    save_debts(updated_debts)
    return jsonify({'success': True, 'message': 'Qarz o\'chirildi'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)