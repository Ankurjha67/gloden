# 🌟 Golden Properties — Full-Stack Dynamic Real Estate Portal & Admin Dashboard

Ek modern, luxury real estate web application jisme **Tailwind CSS** ka luxury frontend aur **Node.js (Express)** ka dynamic backend + **Admin Dashboard** banaya gaya hai.

Is document mein poora step-by-step documentation diya gaya hai taaki koi bhi developer ya user isko asaani se samajh sake aur live chala sake.

---

## 📑 Table of Contents
1. [Humne Kya-Kya Banaya Hai (What Was Built)](#1-humne-kya-kya-banaya-hai)
2. [Project Folder Structure](#2-project-folder-structure)
3. [Admin Dashboard & Features](#3-admin-dashboard--features)
4. [Property ke Saare Rich Fields](#4-property-ke-saare-rich-fields)
5. [Frontend Pages & Dynamic Connectivity](#5-frontend-pages--dynamic-connectivity)
6. [Local System Par Kaise Run Karein (How to Run)](#6-local-system-par-kaise-run-karein)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Live Hosting Guide (Server & Domain Setup)](#8-live-hosting-guide)

---

## 1. Humne Kya-Kya Banaya Hai

Pehle yeh website static HTML templates par thi. Humne isko **fully dynamic** banaya:

1. **Node.js + Express Backend (`server.js`)**:
   - RESTful APIs create ki gayi hain Blogs, Properties, Leads aur Auth ke liye.
   - **Multer** ke zariye photos aur floor plans upload karne ka system banaya gaya hai.
   - Zero-setup local JSON database create kiya gaya hai taaki koi heavy database (MongoDB/MySQL) install na karna pade.
2. **Luxury Admin Console (`/admin/`)**:
   - Poora dashboard website ke **Golden/Copper luxury theme** mein **Tailwind CSS** se banaya gaya hai.
   - Password-protected login session system.
   - Nayi property aur blog computer se photo upload karke add/edit/delete karne ki suvidha.
   - Client contact inquiries (Leads) ko manage aur status change karne ka CRM.
3. **Frontend Dynamic Integration**:
   - **Home Page (`index.html`)**: Project / Collection slider ab direct backend se real-time properties load karta hai aur direct project slug page se linked hai.
   - **Properties Page (`properties.html`)**: Saari properties dynamic aati hain aur cards direct respective project slug page par point karte hain.
   - **Dynamic Project Details Page (`project-details.html` & `/project/:slug`)**: Landmark projects ka dedicated dynamic presentation page jisme Overview, Amenities, Configurations/Price List, Master Plan layout zoom, Specifications, Location advantages aur direct Lead booking form hai.
   - **Blog Page (`blog.html` & `blogs.html`)**: Published articles dynamic aate hain with live category tabs & search.
   - **Blog Detail (`blog-details.html?id=...`)**: Dynamic blog post reading page.

---

## 2. Project Folder Structure

```text
golden/
├── server.js                   # Main Backend Server, File Uploads & REST APIs
├── package.json                # Project dependencies (express, cors, multer)
├── README.md                   # Complete Step-by-Step Documentation (This file)
│
├── uploads/                    # Admin dwara upload ki gayi sabhi photos
│   ├── 1792860063911-*.jpg     # Property cover photos
│   └── 1792860063945-*.jpg     # Site Layout / Master Plan photos
│
├── data/                       # Zero-Configuration Database (JSON Store)
│   ├── properties.json         # Saari property listings with rich details
│   ├── blogs.json              # Published articles & market insights
│   ├── leads.json              # Contact form inquiries & customer leads
│   └── admin.json              # Admin login credentials
│
├── admin/                      # Luxury Management Console (Tailwind CSS)
│   ├── login.html              # Secure Admin Login page
│   ├── index.html              # Dashboard overview with live analytics
│   ├── properties.html         # Property Management (Add, Edit, View Brochure, Delete)
│   ├── blogs.html              # Blog Management (Add, Edit, Cover Upload, Delete)
│   └── leads.html              # Lead Management Pipeline (New ➔ Contacted ➔ Closed)
│
├── index.html                  # Main Website Homepage (Dynamic Project Slider)
├── properties.html             # All Properties Listing (Dynamic Cards + Filters)
├── project-details.html        # Dynamic Project Details Page (/project/:slug)
├── blog.html & blogs.html      # Editorial Journal Listing (Dynamic Grid)
├── blog-details.html           # Single Article Detail Reader (?id=...)
└── about.html                  # About Us & Legacy page
```

---

## 3. Admin Dashboard & Features

Admin panel access karne ke liye URL: **`http://localhost:3000/admin`**

### 🔑 Default Login Credentials:
- **Username:** `admin`
- **Password:** `password123`
*(Isko aap `data/admin.json` file mein jaakar kabhi bhi change kar sakte hain).*

### Admin Modules:
1. **Dashboard Overview (`/admin/index.html`)**:
   - Real-time counters: Total Properties, Total Published Blogs, Total Inquiries, New Inquiries.
   - Recent inquiries table with quick actions.
2. **Property Management (`/admin/properties.html`)**:
   - **"+ Add New Property"** button jisme 8 structured sections ka comprehensive form open hota hai.
   - **Dual Image Upload**: Main property photo + Site layout map dono computer se upload ho sakte hain.
   - **"View" Button**: Har property row ke aage ek "View" button hai jo property ka complete digital brochure pop-up mein dikhata hai.
   - **"Edit" & "Delete"**: Live update aur delete karne ki poori suvidha.
3. **Blog Management (`/admin/blogs.html`)**:
   - Editorial articles likhna, cover image upload karna, tags lagana aur cover story banana.
4. **Client Inquiries / Leads (`/admin/leads.html`)**:
   - Customer name, phone, email, query aur date dekhna.
   - Lead ka status dropdown se **New ➔ Contacted ➔ Closed** update karna.

---

## 4. Property ke Saare Rich Fields

Admin panel aur database mein property ke liye yeh exact fields configure kiye gaye hain:

| # | Field Name | Description |
| :- | :--- | :--- |
| 1 | **Name** (`name` / `title`) | Project ka brand name (e.g. *BPTP Parklands Pride*, *DLF The Camellias*) |
| 2 | **Location** (`location`, `city`) | Poora address + City selection (Gurugram, Noida, Delhi, etc.) |
| 3 | **OVERVIEW** (`overview`) | Detailed project concept, acreage, green buffer, towers aur RERA details |
| 4 | **Features & Amenities** (`amenities`) | Multiline list (e.g. *50,000 Sq.Ft Club*, *Lap Pool*, *Private Elevators*, *EV Charging*) |
| 5 | **Price List & Area** (`priceList`) | Configuration breakdown (e.g. *3 BHK: 2,400 Sq.Ft @ ₹3.67 Cr*) |
| 6 | **Specifications** (`specifications`) | Finishing materials (e.g. *Italian Marble, Modular Kitchen, Acoustic Glazing*) |
| 7 | **Site Layout** (`siteLayout`) | Computer se Master Plan / Layout photo upload + Layout description notes |
| 8 | **Project Location Advantages** (`locationAdvantages`) | Bullet points (e.g. *12 Mins to IGI Airport*, *0 Mins to Expressway*) |
| 9 | **Media & Extra Controls** | Main Cover Photo upload, Display Price (`₹ 1.1 Cr*`), Numeric Price for filtering, BHK, Status, Featured Flag |

---

## 5. Frontend Pages & Dynamic Connectivity

Jab bhi aap Admin Panel se naya data post ya edit karte hain:

1. **Home Page (`index.html`)**:
   - Section **`02 — Collection` (`#property`)** ka `#propSlider` automatically `/api/properties` call karta hai.
   - Aapki upload ki hui photo, price aur location ke sath slider mein property live display ho jati hai.
2. **Properties Page (`properties.html`)**:
   - `#propertyCardsContainer` `/api/properties` se saare active projects load karta hai.
   - Left-hand sticky sidebar filters (City, Budget slider, BHK selector, Status checkboxes) dynamically kaam karte hain.
3. **Blog Page (`blog.html` & `blogs.html`)**:
   - `#blogCardsGrid` `/api/blogs` se saare published insights load karta hai.
   - Live category pills filter aur search bar dynamically cards ko filter karta hai.
4. **Blog Details (`blog-details.html?id=...`)**:
   - URL parameter `?id=...` se specific blog fetch karke title, excerpt, cover photo aur body dynamically render karta hai.

---

## 6. Local System Par Kaise Run Karein

Aapke computer par **Node.js (v18+)** hona chahiye.

### Step 1: Terminal kholein project folder mein
```bash
cd c:\Users\DELL\Desktop\golden\golden
```

### Step 2: Dependencies install karein (Sirf pehli baar)
```bash
npm install
```

### Step 3: Server Start karein
```bash
npm start
```

Terminal mein yeh message dikhega:
```text
=================================================
  🌟 Golden Properties Server running on port 3000
  🌐 Website:         http://localhost:3000
  👑 Admin Dashboard: http://localhost:3000/admin
  🔑 Default Login:   Username: admin | Password: password123
=================================================
```

Ab aap apne browser mein jaakar check kar sakte hain:
- Website: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

---

## 7. API Endpoints Reference

Backend par banayi gayi saari REST APIs:

### Authentication
- `POST /api/auth/login` - Admin login verify karta hai aur session token return karta hai.
- `POST /api/auth/change-password` - Admin username aur password update karta hai.

### Properties
- `GET /api/properties` - Sabhi properties ki list return karta hai.
- `GET /api/properties/:id` - Single property ki complete details return karta hai.
- `POST /api/properties` - Nayi property add karta hai (Supports `imageFile` and `siteLayoutFile` uploads).
- `PUT /api/properties/:id` - Existing property ko edit/update karta hai.
- `DELETE /api/properties/:id` - Property ko delete karta hai.

### Blogs
- `GET /api/blogs` - Sabhi published articles return karta hai.
- `GET /api/blogs/:id` - Single blog article details return karta hai.
- `POST /api/blogs` - Naya article publish karta hai (Supports cover `imageFile` upload).
- `PUT /api/blogs/:id` - Existing blog edit karta hai.
- `DELETE /api/blogs/:id` - Blog delete karta hai.

### Leads / Client Inquiries
- `GET /api/leads` - Sabhi client inquiries return karta hai (Admin view).
- `POST /api/leads` - Website ke contact form se nayi lead save karta hai.
- `PATCH /api/leads/:id/status` - Lead ka status update karta hai (`New`, `Contacted`, `Closed`).
- `DELETE /api/leads/:id` - Lead delete karta hai.

### Stats & Analytics
- `GET /api/stats` - Total counts return karta hai: `{ totalBlogs, totalProperties, totalLeads, newLeads }`.

---

## 8. Live Hosting Guide (Server & Domain Setup)

Aapko is website ke liye koi mehenga VPS ya dedicated server lene ki zaroorat nahi hai.

### Option A: Render.com (100% Free Hosting + Free Custom Domain SSL)
1. Apne code ko GitHub par push karein.
2. [Render.com](https://render.com) par free account banayein.
3. **"New Web Service"** chunein aur apna repository connect karein.
4. Settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Deploy click karein. Aapki website 2 minute mein live ho jayegi.
6. Settings mein jakar apna normal domain (`yourdomain.com`) add karein aur DNS records point kar dein.

### Option B: Hostinger / cPanel Web Hosting
1. Agar aapke paas Hostinger hai, toh hPanel mein jakar **"Node.js"** search karein.
2. **"Create Node.js Application"** par click karein.
3. Node Version: `20.x` ya `22.x` select karein.
4. Application root: project folder upload karein.
5. Application startup file: `server.js` set karein aur **"Start"** dabayein.

---

## 💡 Summary
Aapka project ab **100% Dynamic, Production-Ready aur Self-Contained** hai. Koi bhi nayi property ya blog aap direct Admin Panel se add kar sakte hain, aur woh bina code edit kiye website ke sabhi pages par live show hoti rahegi! 🚀
