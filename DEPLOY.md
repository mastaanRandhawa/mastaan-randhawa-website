# Deploy this site to GitHub Pages

Yes, you can host this Vite/React app on **GitHub Pages** (including with your custom domain **mastaanrandhawa.com**). Follow these steps.

---

## 1. Put static assets in `public/`

Vite only copies files from the **`public/`** folder into the built site. So:

- Create a **`public`** folder in this project (same level as `src/`).
- Move (or copy) into `public/`:
  - **`imgs/`** (favicon, etc.) so that `/imgs/favicon.webp` works.
  - **`ResumeMay2025Tech.pdf`** so the “Download Resume” link works.

Your layout should look like:

```
webpageMastaan/
  public/
    imgs/
      favicon.webp
      ...
    ResumeMay2025Tech.pdf
  src/
  index.html
  ...
```

Keep links as you have them (e.g. `href="imgs/favicon.webp"`, `href="ResumeMay2025Tech.pdf"`). Vite will serve them from the site root.

---

## 2. Same repo, app in folder `webpageMastaan`

The workflow is set up for **one repo** with the app inside a folder named **`webpageMastaan`**. Your repo layout should look like:

```
your-repo/
  .github/
    workflows/
      deploy-pages.yml    ← must be at repo root
  webpageMastaan/         ← the Vite app
    src/
    public/
    package.json
    CNAME
    ...
```

- **Important:** The **`.github`** folder must be at the **root** of the repo (same level as `webpageMastaan`), not inside `webpageMastaan`. If you only have the app folder, copy **`.github`** from inside `webpageMastaan` to the repo root so the workflow runs.
- Push to the branch that triggers the workflow (e.g. `main`).

**If your app is nested** (e.g. `website/newWebsite/webpageMastaan/`), edit **`.github/workflows/deploy-pages.yml`** and replace every **`webpageMastaan`** with **`website/newWebsite/webpageMastaan`** (in `cache-dependency-path`, `working-directory`, and `path`).

---

## 3. Turn on GitHub Pages and run the workflow

1. On GitHub: **Settings → Pages**.
2. Under **Build and deployment**:
   - **Source**: choose **GitHub Actions**.
3. Commit and push the workflow file (if you haven’t already). The **“Deploy to GitHub Pages”** workflow will run on every push to `main`.
4. After it finishes, open the URL shown in the workflow summary (or use your custom domain once it’s set).

---

## 4. Custom domain (mastaanrandhawa.com)

You already have a **CNAME** file with `mastaanrandhawa.com`. The workflow copies it into `dist/` so the deployed site keeps using that domain.

- In **Settings → Pages**, set **Custom domain** to `mastaanrandhawa.com` and save.
- In your DNS provider, add a CNAME record for `mastaanrandhawa.com` pointing to `YOUR_USERNAME.github.io` (or follow GitHub’s instructions).  
  Enabling **Enforce HTTPS** after DNS has propagated is recommended.

---

## 5. If you use a *project* page (e.g. `username.github.io/repo-name`)

If you’re **not** using a custom domain and the site will live at `https://username.github.io/REPO_NAME/`:

1. In **`.github/workflows/deploy-pages.yml`**, in the **Build** step, set:

   ```yaml
   env:
     BASE_PATH: "/REPO_NAME/"
   ```

   (Replace `REPO_NAME` with your repo name, e.g. `portfolio`.)

2. In **`vite.config.ts`**, the app already uses `process.env.BASE_PATH`, so the built assets will use that base path.

---

## Quick checklist

- [ ] Static files (e.g. `imgs/`, resume PDF) are in **`public/`**.
- [ ] Code is pushed to GitHub (new repo or existing repo with correct paths).
- [ ] **Settings → Pages** → Source is **GitHub Actions**.
- [ ] Workflow runs successfully on push to `main`.
- [ ] Custom domain (if used) is set in **Settings → Pages** and in DNS.

After that, the site is hosted on GitHub Pages (and optionally at mastaanrandhawa.com).
