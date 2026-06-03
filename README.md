# VocaStore — Taglish Voice-Enabled Sales and Inventory Management System

> A third-year Application Development course project demonstrating the integration of voice control, natural language processing, and full-stack web development in a practical retail management application.

🌐 **Live Demo:** https://vocastore-production.up.railway.app/

---

## 📋 Table of Contents

1. [Project Description](#-project-description)
2. [System Workflow](#-system-workflow)
3. [Features](#-features)
4. [Tech Stack](#-tech-stack)
5. [Installation / Setup Instructions](#-installation--setup-instructions)
6. [Usage](#-usage)
7. [Project Structure](#-project-structure)
8. [API Endpoints](#-api-endpoints)
9. [Contributors / Developers](#-contributors--developers)
10. [Academic Context](#-academic-context)
11. [License](#-license)
12. [Notes / Additional Information](#-notes--additional-information)

---

## 📌 Project Description

VocaStore is a web-based sales and inventory management system developed as a third-year Application Development project. The system was created to demonstrate the integration of voice control, natural language processing, database management, and cloud deployment within a practical retail management application.

The system allows users to manage inventory, record sales transactions, monitor stock levels, and view business summaries through both traditional graphical interfaces and a Taglish (Tagalog-English) command interface.

By combining PostgreSQL, pgvector, and natural language command processing, the project showcases how emerging technologies can be applied to improve usability and accessibility in small retail environments.

**Target Users:** Small store owners, sari-sari store operators, or retail operators who benefit from a conversational interface for day-to-day store management tasks.

---

## 🔄 System Workflow

1. The user enters a command through text or voice input.
2. Voice input is converted to text using browser speech recognition.
3. The command is normalized and processed by the text normalization module.
4. Sentence embeddings are generated using the Sentence Transformers model.
5. pgvector is used to compare the command against stored command patterns.
6. The command engine determines the user's intent.
7. Appropriate inventory, sales, analytics, or settings operations are executed.
8. PostgreSQL stores and updates the resulting data.
9. The user interface refreshes and displays the updated information.

---

## ✨ Features

- **Bilingual Natural Language Command Interface**
  - Accepts commands in both English and Filipino (Tagalog)
  - Understands intents such as SALE, RESTOCK, and CHECK STOCK
  - Converts Filipino number words (e.g., "dalawa", "tatlo") to numeric values

- **Inventory Management**
  - Add, edit, and delete products
  - Upload product images
  - Real-time stock level display
  - Low stock alerts with a configurable threshold

- **Sales Transactions**
  - Record individual product sales via command or UI
  - Shopping cart system with checkout flow
  - Sales history log with timestamps

- **Dashboard & Analytics**
  - Overview of total sales and transaction count
  - Top-selling product identification
  - Low stock product summary
  - Sales trend reporting

- **Summary Page**
  - Aggregated business summary view
  - Quick snapshot of revenue, transactions, and stock health

- **Data Export**
  - Export sales history as CSV
  - Export product list as CSV
  - Full data backup as JSON

- **Store Settings**
  - Configure store name, owner name, contact number, and address
  - Adjustable low stock threshold
  - Theme selection
  - Password change for the store account
  - Options to clear sales history or reset stock levels

- **User Authentication**
  - Session-based login and logout
  - Protected routes requiring authentication

- **Vector-Based Command Memory**
  - Stores past commands with embeddings using pgvector
  - Retrieves similar past commands to improve response accuracy

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | Python, Flask |
| Database | PostgreSQL (via psycopg2) |
| Vector Search | pgvector (PostgreSQL extension) |
| AI / NLP | sentence-transformers (`all-MiniLM-L6-v2`), custom text normalizer |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Server | Gunicorn (WSGI) |
| Deployment | Railway |
| Other Libraries | flask-cors, numpy, werkzeug |

---

## ⚙️ Installation / Setup Instructions

### Prerequisites

Make sure the following are installed on your machine before proceeding:

- **Python 3.9+** — [python.org](https://www.python.org/)
- **pip** — Python package manager (included with Python)
- **PostgreSQL with the pgvector extension** — [pgvector setup guide](https://github.com/pgvector/pgvector)
- **Git** — for cloning the repository

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/VocaStore.git
cd VocaStore
```

### Step 2 — Create and Activate a Virtual Environment

```bash
# Create the virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Activate it (macOS/Linux)
source venv/bin/activate
```

### Step 3 — Install Dependencies

```bash
pip install -r requirements.txt
```

> **Note:** `sentence-transformers` will download the `all-MiniLM-L6-v2` model on first run. This requires an internet connection and may take a few minutes.

### Step 4 — Set Up Environment Variables

Create a `.env` file in the root of the project with the following variables:

```env
PGHOST=your_postgres_host
PGDATABASE=your_database_name
PGUSER=your_postgres_user
PGPASSWORD=your_postgres_password
PGPORT=your_postgres_port
PGSSLMODE=require
```

> For local development, `PGSSLMODE` can be set to `disable` if your local PostgreSQL instance does not use SSL.

### Step 5 — Set Up the Database

1. Make sure PostgreSQL is running and the pgvector extension is installed.

2. Connect to your database and enable the pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Execute the schema provided in:

```
backend/models.sql
```

4. Configure the required database environment variables before running the application.

#### Security Note

This project was developed for educational purposes. Additional security enhancements, scalability improvements, and production hardening may be required before deployment in a real-world business environment.

### Step 6 — Run the Application

```bash
python app.py
```

The application will start on `http://localhost:5000` by default.

---

## 🖥 Usage

The application can be accessed in two ways:

- **Live (Deployed):** Visit https://vocastore-production.up.railway.app/ directly in any browser — no installation required.
- **Local:** After completing the setup steps above, open `http://localhost:5000` in your browser.

### Logging In

1. Open the app in your browser (via the live URL or localhost).
2. You will be redirected to the login page.
3. Enter your registered email and password to access the dashboard.

### Sample User Flows

**Recording a Sale via Command**
1. Navigate to the main page (AI command interface).
2. Type a command such as:
   - `sell 2 Safeguard` — sells 2 units of Safeguard
   - `benta 3 shampoo` — sells 3 units of shampoo (Filipino)
3. The system detects the intent, matches the product, deducts from stock, and logs the transaction.

**Restocking a Product**
1. Use the command interface:
   - `restock 10 Safeguard` — adds 10 units to stock
   - `dagdag 5 shampoo` — restocks 5 units (Filipino)

**Checking Stock**
1. Use the command interface:
   - `stock Safeguard` — returns the current stock count
   - `ilan shampoo` — checks stock in Filipino

**Managing Inventory via UI**
1. Go to the Inventory page.
2. Use the form to add a new product with name, price, stock, and optional image.
3. Click on existing products to edit or delete them.

**Viewing Analytics**
1. Go to the Dashboard or Summary page.
2. View total revenue, top-selling products, and low stock alerts.

**Exporting Data**
1. Go to Settings.
2. Use the export buttons to download sales or product data as CSV, or download a full JSON backup.

---

## 📁 Project Structure

```
VocaStore/
├── backend/                        # Backend logic and services
│   ├── scripts/
│   │   ├── __init__.py
│   │   └── backfill_embeddings.py  # Script to regenerate embeddings for past commands
│   ├── services/
│   │   ├── ai_brain.py             # Natural language command parser (English & Filipino)
│   │   ├── analytics_brain.py      # Analytics helper functions
│   │   ├── analytics_engine.py     # Core analytics computation logic
│   │   ├── analytics_service.py    # Analytics service layer
│   │   ├── command_engine.py       # Main command router and handler
│   │   ├── embedding_service.py    # Sentence-transformer embedding generation
│   │   ├── inventory_service.py    # Inventory CRUD operations
│   │   ├── sales_service.py        # Sales transaction handling
│   │   ├── settings_service.py     # Store settings management, export, and backup
│   │   ├── text_normalizer.py      # Converts Filipino/English number words to digits
│   │   └── vector_store.py         # pgvector command memory (save & find similar)
│   ├── __init__.py
│   └── models.sql                  # SQL schema for products and sales tables
│
├── static/                         # Static frontend assets
│   ├── assets/
│   │   └── images/                 # Product images and uploaded files
│   ├── css/
│   │   ├── dashboard.css           # Dashboard page styles
│   │   ├── inventory.css           # Inventory page styles
│   │   ├── sales.css               # Sales page styles
│   │   ├── style.css               # Global/shared styles
│   │   └── summary.css             # Summary page styles
│   └── js/
│       ├── app.js                  # Main AI command interface logic
│       ├── dashboard.js            # Dashboard page scripts
│       ├── inventory.js            # Inventory page scripts
│       ├── sales.js                # Sales page scripts
│       └── summary.js              # Summary page scripts
│
├── templates/                      # Jinja2 HTML templates
│   ├── dashboard.html              # Dashboard page
│   ├── index.html                  # Main command interface (home page)
│   ├── inventory.html              # Inventory management page
│   ├── login.html                  # Login page
│   ├── sales.html                  # Sales history page
│   ├── settings.html               # Store settings page
│   └── summary.html                # Business summary page
│
├── app.py                          # Flask application entry point; all routes defined here
├── db.py                           # PostgreSQL database connection helper
├── Procfile                        # Gunicorn start command for Railway deployment
├── railway.toml                    # Railway platform deployment configuration
└── requirements.txt                # Python dependencies
```

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/login` | Log in with email and password |
| POST | `/api/logout` | Log out and clear session |
| GET | `/api/session` | Check current session status |
| POST | `/api/profile/change-password` | Change the user's password |

### Products / Inventory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | Retrieve all products |
| POST | `/add-product` | Add a new product (with optional image upload) |
| POST | `/update-product` | Update an existing product |
| POST | `/delete-product` | Delete a product by ID |
| GET | `/search?q=<query>` | Search products by name |
| POST | `/upload-image` | Upload a product image independently |

### Sales

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/sales` | Retrieve all sales transactions |

### Summary & Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/summary` | Get total sales, transactions, top product, and low-stock items |

### AI Commands

| Method | Endpoint | Description |
|---|---|---|
| POST | `/process-command` | Process a natural language command (sale, restock, check, analytics) |

### Settings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/settings` | Get all store settings |
| POST | `/api/settings` | Update store settings |
| POST | `/api/settings/clearsales` | Clear all sales history |
| POST | `/api/settings/resetstock` | Reset all product stock to 0 |

### Export & Backup

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/export/sales` | Download sales history as CSV |
| GET | `/api/export/products` | Download product list as CSV |
| GET | `/api/backup` | Download full data backup as JSON |

### Page Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Home / command interface (redirects to login if not authenticated) |
| GET | `/login` | Login page |
| GET | `/dashboard` | Dashboard page |
| GET | `/inventory` | Inventory management page |
| GET | `/sales` | Sales history page |
| GET | `/summary` | Business summary page |
| GET | `/settings` | Store settings page |

---

## 👥 Contributors / Developers

The following third-year students collaborated in designing, developing, and deploying VocaStore as part of their Application Development course.

| Name | Role |
|---|---|
| Abando, Allyza V. | Full Stack Developer |
| Condes, Roanne V. | Full Stack Developer |
| Laplana, Tefanie Elaine A. | Project Manager |
| Tañala, Irenmel Viktoria P. | Frontend Developer |
| Villadiego, Renzy O. | Backend Developer |

---

## 🎓 Academic Context

This project was developed as a final requirement for a third-year Application Development course.

The objective was to design and develop a web-based system that integrates voice control and emerging technologies while applying software engineering principles learned throughout the course. The project demonstrates competencies in:

- Full-stack web development
- Database design and management
- Voice-enabled user interaction
- Natural language processing
- AI-assisted command interpretation
- Cloud deployment
- Version control using Git and GitHub

The project serves as an educational implementation and proof of concept rather than a commercial product.

---

## 📄 License

This project was developed as part of a third-year Application Development course.  
All rights reserved. Permission is required for reuse or distribution.

---

## 📝 Notes / Additional Information

- The system supports both English and Filipino (Tagalog) command input.
- PostgreSQL and pgvector are required for the semantic command matching features.
- Uploaded images may be lost after cloud redeployment if local filesystem storage is used.
- The application was developed primarily for academic and demonstration purposes.
- The project is deployed using Railway for cloud hosting and testing.
