# 🕹️ Super Runner: Endless 2D Platformer

An endless, high-performance, physics-based 2D Mario-style platformer game built with **React**, **TypeScript**, and **HTML5 Canvas**. The application features retro 8-bit sound effects synthesized on-the-fly using the Web Audio API, power-ups (Super Mushrooms and Star Invincibility), a local high-score leaderboard, and real-time interactive challenges.

---

## 🚀 Quick Start (Local Development)

To run the game locally on your computer:

1. **Install Node.js** (v18 or higher recommended).
2. **Clone or copy this folder** to your computer.
3. Open a terminal in the project directory and install the dependencies:
   ```bash
   npm install
   ```
4. Start the local development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to the local URL (typically **`http://localhost:3000`** or the port printed in your terminal).

---

## 🌐 How to Host on GitHub Pages (Recommended)

We have pre-configured this repository with **relative assets (`base: './'`)** and a **GitHub Actions CI/CD pipeline** so that deploying your game is fully automated and completely free.

### Step 1: Create a Repository on GitHub
1. Go to [github.com](https://github.com) and log in.
2. Click the **New** button (or go to `github.com/new`) to create a new repository.
3. Name your repository (e.g., `super-runner-game`).
4. Keep it **Public** (required for free GitHub Pages hosting).
5. Leave "Add a README", ".gitignore", and "Choose a license" **unchecked** (since these files are already in your project).
6. Click **Create repository**.

### Step 2: Push your Code to GitHub
Open a terminal in your project's root folder and run the following commands (replace `your-username` and `super-runner-game` with your actual GitHub details):

```bash
# Initialize a git repository (if not already done)
git init

# Add all files to the staging area
git add .

# Commit the files
git commit -m "feat: initial commit for super runner game"

# Rename default branch to main
git branch -M main

# Add your GitHub repository as the remote origin
git remote add origin https://github.com/your-username/super-runner-game.git

# Force-push your files to the main branch
git push -u origin main --force
```

### Step 3: Enable GitHub Actions for Deployment
By default, GitHub repositories require you to select the Pages deployment source.
1. In your GitHub repository page, click on the **Settings** tab at the top.
2. In the left sidebar, click on **Pages** (under the "Code and automation" section).
3. Look for the **Build and deployment** section.
4. Under **Source**, change the dropdown from *Deploy from a branch* to **GitHub Actions**.

### Step 4: Done! Watch your Game Go Live
Your push in Step 2 automatically triggered the pre-configured workflow!
1. Click the **Actions** tab at the top of your GitHub repository.
2. You will see a running workflow named **Deploy to GitHub Pages**.
3. Once the workflow turns green (usually takes less than 1 minute), a link to your live game will be posted in the deployment summary!
4. Your game will be publicly accessible at:
   `https://<your-username>.github.io/super-runner-game/`

---

## 🎮 Arcade Game Controls

| Key | Action | Description |
|---|---|---|
| **Spacebar** / Click | **Jump / Flap** | Jump in the air to avoid pits or stomp on enemies. |
| **Double Spacebar** | **Double Jump** | Perform a second jump mid-air (refreshes when you stomp an enemy). |
| **S** or **Down Arrow** | **Slide** | Crouch-slide to dodge low-hanging flying birds. |
| **P** | **Pause Game** | Pause and resume your active run. |
| **R** | **Quick Restart** | Instantly restart your run from the Game Over or active screen. |

---

## 🛠️ Project Structure

- `/.github/workflows/deploy.yml` — Automated CI/CD Pages deployment pipeline.
- `/src/App.tsx` — Main application screen, HUD, Leaderboard, and Achievement management.
- `/src/components/GameCanvas.tsx` — Game loop, Canvas rendering, and object-oriented physics state.
- `/src/audio.ts` — Real-time retro 8-bit sound synthesizers using the browser's Web Audio API (no external asset downloads needed).
- `/src/types.ts` — Shared TypeScript type declarations.
- `/vite.config.ts` — Vite config enhanced with portable relative assets resolver (`base: './'`).
