Here is a README.md file for your **Room Transaction App** backend.

# Room Transaction App Backend And Frontend

(I know I should've done them differently but its a very simple project, so sorry for making this a mess.)

This is the backend for the Room Transaction App, a simple service to help roommates manage shared expenses and debts. The API is built with Flask and uses a JSON file (`expense_data.json`) to persist data.

## Features ✨

  - **Expense Tracking:** Submit and confirm shared expenses between roommates.
  - **Pending Transactions:** Transactions require confirmation from the other roommate before being finalized.
  - **Debt Management:** Automatically calculates who owes whom.
  - **Debt Payment:** An endpoint to record a debt payment, which updates the balances accordingly.
  - **RESTful API:** Clear and simple endpoints for managing transactions.

## Technologies Used 💻

  - **Python:** The core language for the backend.
  - **Flask:** A lightweight web framework for building the API.
  - **`flask-cors`:** Handles Cross-Origin Resource Sharing for the mobile app to communicate with the backend.
  - **`uuid`:** Generates unique identifiers for each transaction.
  - **`datetime`:** Used for timestamps on transactions.

## Local Development ⚙️

### Prerequisites

  - Python 3.8+
  - `pip` (Python package installer)

### Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/room-transaction-app.git
    cd room-transaction-app/backend
    ```

2.  **Create a virtual environment** and activate it (recommended):

    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

    *Note: The `requirements.txt` file is not in your screenshot, so you'll need to create it. It should contain `Flask` and `Flask-CORS`.*

4.  **Run the application:**

    ```bash
    python app.py
    ```

The server will start on `http://localhost:5000`.

## API Endpoints 🛣️

The API is protected with a simple header-based authentication where the `Authorization` header is used to identify the user.

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Checks the server's health. |
| `GET` | `/api/transactions` | Retrieves all confirmed and pending transactions, along with current balances. |
| `POST` | `/api/transactions` | Submits a new expense. It will be added to the pending list. |
| `POST` | `/api/transactions/<transaction_id>/confirm` | Confirms a pending transaction. |
| `POST` | `/api/pay_debt` | Records a debt payment. |

### Authentication

All endpoints that modify or retrieve user-specific data require an `Authorization` header.

  - **Header:** `Authorization`
  - **Value:** `Bearer meyan` or `Bearer kushal`

**Example cURL command:**

```bash
curl -X GET http://localhost:5000/api/transactions -H "Authorization: Bearer meyan"
```

## Data Persistence

The application stores all transaction data in a single file, `expense_data.json`. This file is automatically created with initial data if it doesn't exist when the server starts.

```json
{
  "transactions": [],
  "pending_transactions": [],
  "balances": {
    "meyan": 0.0,
    "kushal": 0.0
  }
}
```

## Contribution

This project is a personal utility, but feel free to fork and adapt it for your own needs.