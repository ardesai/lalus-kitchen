# Lalu's Kitchen

A personal recipe website with a public browsing experience and a protected
admin panel for managing recipes. Ingredients and cooking temperatures can be
toggled between Metric (grams, milliliters, Celsius) and Imperial (ounces,
cups, Fahrenheit) on the fly, without a page reload.

## Features

- **Public site** — home page grid of recipes; each recipe page has a hero
  photo, an ingredient checklist, numbered cooking steps, and a tips section.
- **Metric/Imperial toggle** — a global toggle in the header and a per-recipe
  toggle convert ingredient amounts (g → oz, ml → cups) and oven temperatures
  (°C → °F) client-side. The choice is remembered across pages via
  `localStorage`.
- **Admin panel** (`/admin`, login-protected) — create, edit, and delete
  recipes. A hero photo is required before a recipe can be published.
- **Image uploads** — stored locally under `public/uploads/`.
- **JSON file storage** — each recipe is a plain JSON file under
  `data/recipes/`, no database to install or run.

## Tech stack

- Node.js + Express
- EJS templates
- Plain JSON files (data), `multer` (image uploads), `express-session` +
  `bcryptjs` (admin auth)

## Project structure

```
lalus-kitchen/
├── server.js              # App entry point
├── models/recipe.js        # Recipe data access (reads/writes JSON files)
├── routes/
│   ├── public.js          # Home page, recipe detail page
│   └── admin.js            # Login, dashboard, create/edit/delete
├── middleware/
│   ├── auth.js             # Session-based admin gate
│   └── upload.js           # multer image upload config
├── utils/
│   ├── recipe.js            # Slug/ingredient/step parsing, HTML escaping
│   └── hash-password.js     # CLI helper to generate an admin password hash
├── views/                  # EJS templates (public pages + admin/)
├── public/
│   ├── css/style.css
│   ├── js/unit-toggle.js    # Client-side metric/imperial conversion
│   ├── js/admin.js          # Image preview on the admin form
│   └── uploads/             # Uploaded recipe photos
└── data/
    ├── seed.js              # Optional sample recipes
    └── recipes/             # One JSON file per recipe, created automatically
```

## Prerequisites

- Node.js 18 or later
- npm

## Setup

1. Install dependencies:

   ```bash
   cd /Users/defra/Desktop/projects/webapps/lalus-kitchen
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Generate a bcrypt hash for your admin password and set it in `.env`:

   ```bash
   node utils/hash-password.js "yourStrongPassword"
   ```

   Copy the printed hash into `ADMIN_PASSWORD_HASH` in `.env`, and set
   `ADMIN_USERNAME` to whatever username you want to log in with.

4. Set `SESSION_SECRET` in `.env` to a long random string (used to sign the
   admin session cookie). For example:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

Your `.env` should end up looking like:

```
PORT=3000
SESSION_SECRET=<long random string>
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash from step 3>
```

## Running the app

Start the server:

```bash
npm start
```

Or, for auto-restart on file changes during development:

```bash
npm run dev
```

The site will be available at `http://localhost:3000` (or whatever `PORT` you
set). The `data/recipes/` folder is created automatically on first run — no
separate database setup needed. Each recipe is saved as its own
`<slug>.json` file there, so you can inspect, back up, or hand-edit recipes
directly if you ever want to.

### Loading sample recipes (optional)

To populate the site with two example recipes so it isn't empty on first
look:

```bash
npm run seed
```

This is safe to re-run — it skips any recipe whose title it has already
seeded.

## Using the admin panel

1. Go to `http://localhost:3000/admin` — you'll be redirected to
   `/admin/login` if not signed in.
2. Log in with the `ADMIN_USERNAME` / password you set in `.env`.
3. From the dashboard you can add a new recipe, edit an existing one, or
   delete one.

When adding or editing a recipe:

- **Ingredients** — one per line, with the amount in metric units, e.g.:

  ```
  250g flour
  200ml milk
  2 tsp vanilla extract
  3 eggs
  Salt to taste
  ```

  Only `g`, `kg`, `ml`, and `l` amounts are converted automatically when a
  visitor switches to Imperial. Other lines (eggs, tsp, pinch, "to taste",
  etc.) are shown as written in both unit systems.

- **Steps** — one per line. Write oven temperatures as e.g. `180°C` so they
  convert to Fahrenheit automatically when toggled:

  ```
  Preheat the oven to 180°C.
  Mix flour and sugar in a bowl.
  Bake for 25 minutes.
  ```

- **Hero photo** — required when creating a new recipe (JPEG, PNG, WEBP, or
  GIF, up to 8MB). Optional when editing — uploading a new photo replaces the
  existing one.

## Notes on production use

- Sessions are currently stored in memory, so logged-in admin sessions are
  cleared whenever the server restarts. Fine for personal/local use; swap in
  a persistent session store (e.g. a database-backed one) if you deploy this
  somewhere long-running.
- Set a strong, unique `SESSION_SECRET` and `ADMIN_PASSWORD_HASH` before
  exposing the app beyond your own machine, and serve it over HTTPS.
