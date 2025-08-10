from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATA_FILE = 'expense_data.json'


def initialize_data():
    return {
        'transactions': [],
        'pending_transactions': [],
        'balances': {'meyan': 0.0, 'kushal': 0.0}
    }


def load_data():
    if not os.path.exists(DATA_FILE):
        return initialize_data()
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except:
        return initialize_data()


def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def calculate_balances(transactions):
    """
    Calculate who owes whom based on all transactions.
    Positive balance means that person is owed money.
    Negative balance means that person owes money.
    """
    meyan_balance = 0.0
    kushal_balance = 0.0
    
    for tx in transactions:
        if tx.get("is_debt_payment"):
            # Handle debt payments
            amount = float(tx['amount'])
            payer = tx['paid_by']
            recipient = tx['paid_to']
            
            if payer == 'meyan':
                meyan_balance -= amount  # Meyan paid, so reduce his debt
                kushal_balance += amount  # Kushal received, so increase what he's owed
            else:  # kushal paid
                kushal_balance -= amount  # Kushal paid, so reduce his debt
                meyan_balance += amount  # Meyan received, so increase what he's owed
        else:
            # Handle regular expense transactions
            total = float(tx['total'])
            meyan_paid = float(tx['meyanPay'])
            kushal_paid = float(tx['kushalPay'])
            
            # Each person should pay half
            should_pay_each = total / 2
            
            # Calculate how much each person is over/under their fair share
            meyan_excess = meyan_paid - should_pay_each
            kushal_excess = kushal_paid - should_pay_each
            
            # Add to their running balance
            meyan_balance += meyan_excess
            kushal_balance += kushal_excess
    
    # Convert to debt format (only show positive debts)
    if meyan_balance > 0:
        # Meyan is owed money (Kushal owes Meyan)
        return {'meyan': 0.0, 'kushal': round(meyan_balance, 2)}
    elif kushal_balance > 0:
        # Kushal is owed money (Meyan owes Kushal)
        return {'meyan': round(kushal_balance, 2), 'kushal': 0.0}
    else:
        # No debt
        return {'meyan': 0.0, 'kushal': 0.0}


@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    data = load_data()
    data['balances'] = calculate_balances(data['transactions'])
    save_data(data)
    return jsonify({
        'confirmed': data['transactions'],
        'pending': data['pending_transactions'],
        'balances': data['balances']
    })


@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = load_data()
    user = request.headers.get('Authorization', '').replace('Bearer ', '').lower()
    tx = request.json

    try:
        total = float(tx['total'])
        meyanPay = float(tx.get('meyanPay', 0))
        kushalPay = float(tx.get('kushalPay', 0))
    except:
        return jsonify({'error': 'Invalid payment values'}), 400

    if round(meyanPay + kushalPay, 2) != round(total, 2):
        return jsonify({'error': 'meyanPay + kushalPay must equal total'}), 400

    transaction = {
        'id': str(uuid.uuid4()),
        'date': tx.get('date', datetime.now().strftime('%Y-%m-%d')),
        'particular': tx.get('particular', ''),
        'total': total,
        'meyanPay': meyanPay,
        'kushalPay': kushalPay,
        'submitted_by': user,
        'created_at': datetime.now().isoformat()
    }

    data['pending_transactions'].append(transaction)
    save_data(data)
    return jsonify({'message': 'Transaction submitted', 'transaction_id': transaction['id']}), 201


@app.route('/api/transactions/<transaction_id>/confirm', methods=['POST'])
def confirm_transaction(transaction_id):
    data = load_data()
    user = request.headers.get('Authorization', '').replace('Bearer ', '').lower()

    tx = next((t for t in data['pending_transactions'] if t['id'] == transaction_id), None)
    if not tx:
        return jsonify({'error': 'Transaction not found'}), 404
    if tx['submitted_by'] == user:
        return jsonify({'error': 'Cannot confirm your own transaction'}), 400

    tx['confirmed_by'] = user
    tx['confirmed_at'] = datetime.now().isoformat()
    data['pending_transactions'] = [t for t in data['pending_transactions'] if t['id'] != transaction_id]
    data['transactions'].append(tx)
    data['balances'] = calculate_balances(data['transactions'])
    save_data(data)
    return jsonify({'message': 'Transaction confirmed'})


@app.route('/api/pay_debt', methods=['POST'])
def pay_debt():
    data = load_data()
    user = request.headers.get('Authorization', '').replace('Bearer ', '').lower()
    payload = request.json

    try:
        amount = float(payload.get('amount'))
        if amount <= 0:
            raise ValueError
    except:
        return jsonify({'error': 'Invalid amount'}), 400

    balances = calculate_balances(data['transactions'])
    owed = balances.get(user, 0.0)
    
    if owed == 0:
        return jsonify({'message': 'No debt to pay'}), 200
    
    if amount > owed:
        amount = owed  # cap to max owed

    recipient = 'kushal' if user == 'meyan' else 'meyan'

    # Create debt payment transaction
    payment_tx = {
        'id': str(uuid.uuid4()),
        'date': datetime.now().strftime('%Y-%m-%d'),
        'particular': f'Debt payment from {user} to {recipient}',
        'amount': round(amount, 2),
        'is_debt_payment': True,
        'paid_by': user,
        'paid_to': recipient,
        'created_at': datetime.now().isoformat(),
        'confirmed_by': recipient,
        'confirmed_at': datetime.now().isoformat()
    }

    data['transactions'].append(payment_tx)
    data['balances'] = calculate_balances(data['transactions'])
    save_data(data)
    
    return jsonify({
        'message': f'{user} paid ₹{amount} to {recipient}',
        'new_balances': data['balances']
    }), 201


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Server error'}), 500


if __name__ == '__main__':
    if not os.path.exists(DATA_FILE):
        save_data(initialize_data())
    app.run(debug=True, host='0.0.0.0', port=5000)