# 🛍️ E-Commerce Platform with MongoDB (NoSQL Course Project)

## 📘 Project Overview

This project is a full-stack e-commerce web application developed as part of a NoSQL database course.  
It demonstrates the use of **MongoDB**, a document-based NoSQL database, to build a practical application showcasing key NoSQL concepts and benefits.  
The application allows users to browse products, add items to a cart, place orders, leave reviews, and manage products (for admins).

**Chosen NoSQL Type & DB:** Document Database (MongoDB)  
**Key NoSQL Benefit Demonstrated:** Flexible Schema

---

## ✨ Features

- **Product Catalog:** Display products, view details, search, and filter by category.  
- **User Authentication:** Registration and login functionality.  
- **Role-Based Access Control:** Admin users can add, edit, and delete products; regular users can browse, review, and order.  
- **CRUD Operations:** Full create, read, update, and delete functionality for products (Admin) and reviews (User).  
- **Flexible Schema Demonstration:** Admins can add custom fields (e.g., *RAM*, *Color*) when editing products, showcasing MongoDB’s schema flexibility.  
- **Shopping Cart:** Add/remove items and update quantities.  
- **Order Placement:** Checkout process using data snapshotting for historical accuracy.  
- **Order History:** Users can view past orders.  
- **Product Reviews & Ratings:** Users can submit ratings and comments; averages are calculated and displayed.  
- **Dark/Light Mode:** UI theme toggle.

---

## 🧱 Tech Stack

**Frontend:** React.js, Tailwind CSS (via CDN), lucide-react (icons)  
**Backend:** Node.js, Express.js  
**Database:** MongoDB (using Mongoose ODM)  
**Development Tools:** nodemon (for backend auto-restart)

---

## 📂 Project Structure

ECommerceProject/  
├── .git/  
├── .gitignore  
├── backend/  
│   ├── .gitignore  
│   ├── node_modules/  
│   ├── .env  
│   ├── package.json  
│   ├── server.js  
│   └── ...  
└── frontend/  
    ├── .gitignore  
    ├── node_modules/  
    ├── build/  
    ├── package.json  
    ├── public/  
    ├── src/  
    └── ...  
└── README.md  

---

## ⚙️ Setup and Running Instructions

### Prerequisites

- **Node.js & npm:** Install from [nodejs.org](https://nodejs.org/) (LTS recommended).  
- **MongoDB:**  
  - Install MongoDB Community Server locally.  
  - Install **MongoDB Compass** for GUI management.  
  - Ensure the MongoDB service is running (`mongod` command if needed).

---

### 🖥️ Backend Setup

1. Navigate to the backend folder:  
   `cd ECommerceProject/backend`

2. Install dependencies:  
   `npm install`

3. Create a `.env` file with:  
   `MONGODB_URI="mongodb://127.0.0.1:27017/ecommerceDB"`

4. Run the backend:  
   `npm run dev`

Backend will start at http://localhost:3001 and confirm a successful MongoDB connection.

---

### 💻 Frontend Setup

1. Navigate to the frontend folder:  
   `cd ECommerceProject/frontend`

2. Install dependencies:  
   `npm install`

3. Start the frontend server:  
   `npm start`

The app should open automatically at http://localhost:3000.

---

## 👑 Creating an Admin User

1. Register a new user via the Sign-Up form.  
2. Open **MongoDB Compass** and connect to `mongodb://127.0.0.1:27017`.  
3. Navigate to `ecommerceDB → users` collection.  
4. Find the new user document.  
5. Edit and set `isAdmin` to `true`.  
6. Save and log back in — admin privileges (Add/Edit/Delete) will now be available.

---

## 🗃️ Database Environment Setup

The database environment was configured using modern tools:

- **Database Server:** *MongoDB Community Server (Local)*  
  Runs locally as the core development database.

- **Management Tool:** *MongoDB Compass*  
  - Used for setup, connection, and data inspection.  
  - Connected to: `mongodb://127.0.0.1:27017`.  
  - Used to verify API writes, edit user documents (`isAdmin` flag), and clear collections for debugging.

- **Backend Runtime:** *Node.js with Express*  
  Provides the REST API layer between React frontend and MongoDB.

- **Application Layer:** *Mongoose (ODM)*  
  Defines flexible schemas within the application.  
  **Setup Steps:**  
  1. Defined schemas for *users*, *products*, *reviews*, and *orders*.  
  2. Included types, validation rules, and defaults.  
  3. Connected using a single URI stored in `.env`.

---

## 3️⃣ Data Model Design

The data model uses **Embedding**, **Referencing**, and **Snapshotting** to balance flexibility and performance.

---

### Collection 1: users  
**Design Strategy:** Embedding  

{
  "_id": "ObjectId(...)",
  "name": { "first": "Jane", "middle": "", "last": "Doe" },
  "phone": "555-1234",
  "address": { "city": "New York", "state": "NY", "country": "USA" },
  "email": "jane.doe@example.com",
  "password": "userpassword",
  "isAdmin": true
}

**Justification:**  
Name and address are tightly coupled with each user and always needed in queries. Embedding improves read speed and avoids multiple lookups.

---

### Collection 2: products  
**Design Strategy:** Denormalization  

{
  "_id": "ObjectId(...)",
  "name": "Wireless Mouse",
  "description": "A high-precision wireless mouse.",
  "price": 49.99,
  "category": "Electronics",
  "imageUrl": "...",
  "avg_rating": 4.5,
  "review_count": 12
}

**Justification:**  
Fields `avg_rating` and `review_count` are denormalized for fast reads.  
This avoids repeated aggregations when displaying product lists.

---

### Collection 3: reviews  
**Design Strategy:** Referencing  

{
  "_id": "ObjectId(...)",
  "product_id": "ObjectId('...')",
  "user_id": "ObjectId('...')",
  "rating": 5,
  "comment": "This mouse is fantastic!",
  "createdAt": "2025-10-28T..."
}

**Justification:**  
Each product can have thousands of reviews.  
Using references keeps product documents small and efficient while still allowing lookup joins via `$lookup` or `.populate()`.

---

### Collection 4: orders  
**Design Strategy:** Data Snapshotting  

{
  "_id": "ObjectId(...)",
  "user_id": "ObjectId('...')",
  "items": [
    { "product_id": "ObjectId('...')", "name": "Wireless Mouse", "price": 49.99, "quantity": 1 },
    { "product_id": "ObjectId('...')", "name": "Keyboard", "price": 89.99, "quantity": 1 }
  ],
  "total_amount": 139.98,
  "status": "Pending",
  "createdAt": "2025-10-28T..."
}

**Justification:**  
Snapshotting stores product details (name, price) at purchase time to preserve order history.  
This ensures accurate past data even if product information changes later.

---

## 🧩 NoSQL Feature Demonstration: Flexible Schema

**Key Feature:** Flexible Schema (Document-based design)

**Implementation:**  
`const productSchema = new mongoose.Schema({}, { strict: false });`

**Demonstration Steps:**  
1. Log in as **Admin**.  
2. Edit any product.  
3. In **Custom Attributes**, click **+ Add Field**.  
4. Add new fields (e.g., `Color`, `RAM`, `Material`) with values.  
5. Save and view changes — new fields appear in product details.  

These attributes are stored directly in MongoDB without schema migration.  
Each product can have unique fields, showcasing MongoDB’s **schema flexibility**.

---

## 🧠 Summary

This project demonstrates how **MongoDB’s document model** supports flexible, scalable data design.  
By combining **embedding**, **referencing**, **denormalization**, and **snapshotting**, the application achieves strong performance and adaptability for real-world e-commerce systems.
