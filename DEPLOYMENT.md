# Vision Library Deployment Guide

This document describes how to deploy the Vision Library application to a production environment.

## 1. Prerequisites
- **GitHub Account**: To host the source code repository.
- **Supabase Account**: For the managed PostgreSQL database and backend API.
- **Vercel Account**: For hosting the frontend and API routes.

---

## 2. Setting Up the Database (Supabase)

The application uses Supabase to store data securely.

1. Go to [Supabase](https://supabase.com) and create a new project.
2. Under **Project Settings -> API**, find your `Project URL` and `anon public` key.
3. Keep these details safe; you will need them for environment variables.

### Running Migrations (Schema Setup)
To create the necessary tables (including the 71 seats for the library):
1. Navigate to the **SQL Editor** in your Supabase dashboard.
2. Open `supabase/migrations/20260917000000_init.sql` from your project source code.
3. Copy the contents of this file and paste it into the SQL Editor.
4. Run the query. This will create all tables.
5. If there are any other files like `20260917000001_fix_rls.sql`, copy and run them in sequence to secure the database.

---

## 3. Deployment (Vercel)

Vercel is the recommended platform because it natively supports the TanStack Start framework.

1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com) and create a **New Project**.
3. Import your GitHub repository.
4. In the **Configure Project** section:
   - Framework Preset: Vercel will usually auto-detect Vite.
   - Build Command: `npm run build`
   - Output Directory: `.vercel/output` or `dist` (Auto-detected by TanStack Start)
5. **Environment Variables**: Add the following variables (found in your Supabase dashboard):
   - `SUPABASE_PROJECT_ID` = `your-project-id`
   - `SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY` = `your-anon-public-key`
   - `VITE_SUPABASE_PROJECT_ID` = `your-project-id`
   - `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `your-anon-public-key`
6. Click **Deploy**.

---

## 4. Setting up a Custom Domain
Once deployed, Vercel gives you a default domain (e.g., `https://vision-hub-xyz.vercel.app`).

1. Go to your Vercel Project Settings -> **Domains**.
2. Add your custom domain (e.g., `visionlibrary.example.com`).
3. Follow the DNS configuration instructions provided by Vercel to update your domain registrar (e.g., Godaddy, Namecheap).

---

## 5. Security & CORS
- **CORS**: By default, Supabase allows connections from anywhere. To secure it, go to Supabase Dashboard -> **Authentication** -> **URL Configuration** and add your production domain (`https://visionlibrary.example.com`) to the **Site URL** and **Additional Redirect URLs**.
- Ensure no sensitive credentials (like database passwords) are entered into the frontend environment variables (`VITE_*`).

---

## 6. Owner Handover
After deployment is successful, the library owner needs:
1. The **Production URL** (e.g., `https://visionlibrary.example.com`).
2. An **Admin Login**. You can create the first user in the Supabase Dashboard -> **Authentication** -> **Add User**. Provide the email and password to the owner.

The owner will manage the library entirely through the web browser and will not need access to code or development servers.
