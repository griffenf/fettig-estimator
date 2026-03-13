# Fettig Millwork & Windows — Window Estimator App

A mobile-friendly web app for creating window estimates on-site and submitting PDFs directly to JobTread.

---

## Features
- Add multiple windows with style, size, colors, glass, grid, and notes
- Generates a professional branded PDF
- Sends the PDF directly to a JobTread job record
- Works on phone, tablet, and desktop browser
- 100% free to host on Vercel

---

## Deploy to Vercel (Free — takes ~5 minutes)

### Step 1: Create a GitHub account
Go to https://github.com and sign up if you don't have one.

### Step 2: Upload this project to GitHub
1. Go to https://github.com/new to create a new repository
2. Name it `fettig-estimator`
3. Upload all the files from this folder into it

### Step 3: Deploy on Vercel
1. Go to https://vercel.com and sign up (free, use your GitHub account)
2. Click **"Add New Project"**
3. Import your `fettig-estimator` GitHub repo
4. Vercel will auto-detect it as a Vite app — just click **Deploy**
5. In ~60 seconds you'll have a live URL like `fettig-estimator.vercel.app`

That's it! Open the URL on your phone and you can use it like an app.

---

## JobTread Integration Setup

To send PDFs directly to JobTread:

1. Log in to JobTread
2. Go to **Settings → API**
3. Generate an API Key and copy it
4. In the app, after downloading a PDF you'll see a **"Send to JobTread"** button
5. Paste your API key when prompted (it stays in your browser session only)
6. Make sure to enter the **JobTread Job ID** in the Job Info step so it links to the right job

---

## Adding More Options Later

All the dropdowns are easy to edit. Open `src/App.jsx` and look for these arrays at the top of the file:

```js
const WINDOW_STYLES = ['Single Hung', 'Double Hung', ...]
const EXTERIOR_COLORS = ['White', 'Bronze', ...]
const INTERIOR_COLORS = ['White', 'Natural Wood', ...]
const GLASS_OPTIONS = ['Clear', 'Low-E', ...]
const GRID_PATTERNS = ['No Grid', 'Colonial', ...]
```

Just add or remove items from these lists, save, and redeploy.

---

## Adding More Product Types (Patio Doors, Entry Doors, etc.)

This is the next phase! When you're ready, just ask and we can add tabs for each product type.
