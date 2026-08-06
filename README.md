# To-Do App

A React (web, built with Vite) to-do list — tasks organized into Today /
Tomorrow / Upcoming, with priority levels, an edit modal, and localStorage
persistence.

This is a **browser** React app,
## Run it locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build for production

```bash
npm run build
```

Output goes to `dist/`.

## Deploy to GitHub

1. Create a new repo on GitHub (e.g. `todo-app`) and push this project:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

2. **Set the base path.** Open `vite.config.js` and set `base` to match your
   repo name:

   ```js
   base: '/<repo-name>/',
   ```

   (If you're deploying to a *user/org* page — `<username>.github.io` — or to
   Netlify/Vercel instead, set `base: '/'`.)

3. **Enable GitHub Pages via Actions.** In your repo on GitHub:
   Settings → Pages → Build and deployment → Source → **GitHub Actions**.

   A workflow is already included at `.github/workflows/deploy.yml` — it
   builds and deploys automatically on every push to `main`. After the first
   push, check the "Actions" tab for progress; your site will be live at
   `https://<your-username>.github.io/<repo-name>/`.

### Alternative: deploy manually with `gh-pages`

```bash
npm run build
npm run deploy
```

This pushes the `dist/` folder to a `gh-pages` branch (the `gh-pages` package
is already in `devDependencies`). Then in Settings → Pages, set the source
branch to `gh-pages`.
