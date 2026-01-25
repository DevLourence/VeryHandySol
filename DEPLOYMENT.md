# 🚀 VH Autoglass - Deployment Guide

This application is built with **HTML/JS (Frontend)** and **Supabase (Backend)**. 
To deploy this project to the web, we recommend using **Vercel** for hosting the frontend, as it is zero-config and free for hobby use.

---

## 🟢 Prerequisites

1.  **GitHub Account**: You need to handle your code versioning.
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
3.  **Supabase Project**: You already have this (`glnzltetqxpvxsoqwerz`).

---

## 📦 Step 1: Push Code to GitHub

1.  Initialize a git repository in your project folder:
    ```bash
    git init
    git add .
    git commit -m "Final release ready for deployment"
    ```
2.  Create a new repository on GitHub (e.g., `vh-autoglass-app`).
3.  Link and push your code:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/vh-autoglass-app.git
    git branch -M main
    git push -u origin main
    ```

---

## 🌐 Step 2: Deploy Frontend to Vercel

1.  Log in to your **Vercel Dashboard**.
2.  Click **"Add New..."** -> **"Project"**.
3.  Select your GitHub repository (`vh-autoglass-app`).
4.  **Build Settings**:
    *   Framework Preset: `Other` (since it's raw HTML/JS).
    *   Root Directory: `./` (default).
5.  Click **Deploy**.

Vercel will build your site and give you a live URL (e.g., `https://vh-autoglass.vercel.app`).

---

## ⚡ Step 3: Deploy Edge Functions

To ensure emails work in production, you must deploy your Supabase Edge Function.

1.  Install Supabase CLI (if you haven't):
    ```bash
    npm install -g supabase
    ```
2.  Login:
    ```bash
    supabase login
    ```
3.  Link your project:
    ```bash
    supabase link --project-ref glnzltetqxpvxsoqwerz
    ```
4.  Deploy the function:
    ```bash
    supabase functions deploy send-booking-update --no-verify-jwt
    ```
5.  **Set Secrets** (Production Environment):
    *   Go to your Supabase Dashboard -> **Edge Functions**.
    *   Click on `send-booking-update` -> **Manage Secrets**.
    *   Add your `RESEND_API_KEY` (`re_CYNDWQhL_...`) here (optional but recommended for security vs hardcoding).

---

## 🔒 Step 4: Final Security Check

1.  **Site URL**: Go to Supabase Dashboard -> **Authentication** -> **URL Configuration**.
2.  **Site URL**: Change this from `localhost` to your new Vercel URL (e.g., `https://vh-autoglass.vercel.app`).
3.  **Redirect URLs**: Add `https://vh-autoglass.vercel.app/**` to the allow list.

---

## 🎉 Done!

Your application is now live.
- **Admins** access via `/admin_dashboard.html` (auto-redirect logic handles this).
- **Clients** access via `/client_dashboard.html`.
- **Public** sees the landing page.

*Built with ❤️ by your AI Agent.*
