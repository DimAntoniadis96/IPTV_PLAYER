# Installation Guide

How to get this IPTV player running on your TV. Please read **"Before you start"** first — it
will save you a lot of time.

---

## Before you start (please read)

- **This app is for Samsung (Tizen) and LG (webOS) TVs only.** It does **not** run on Android TV,
  Google TV, Fire TV, Roku or VIDAA. Check your TV's operating system first — see
  [Compatibility in the README](../README.md#️-compatibility--will-it-run-on-my-tv).
- **You cannot install it from a USB stick.** For security reasons Samsung and LG do not allow
  installing apps this way. You need a **computer on the same Wi‑Fi as the TV**, plus the TV's
  **Developer Mode**. Budget about **20–40 minutes** the first time.
- **The app contains no channels.** After installing, you connect **your own** server (Xtream
  login or an M3U URL). See [Connect your server](#3-connect-your-server) below.
- This is not on any TV app store, so there is no one‑click install. That is normal for a
  sideloaded app — it is not a limitation of this app specifically.

> **The honest summary:** installing takes some technical steps and a computer. If you are not
> comfortable with that, ask someone who is — the process below is the same for everyone.

---

## Which guide do I follow?

| Your TV | Go to |
|---------|-------|
| **Samsung** (Tizen) | [Section 1 — Samsung](#1-install-on-samsung-tizen) |
| **LG** (webOS), incl. Tesla/other webOS models | [Section 2 — LG](#2-install-on-lg-webos) |

---

## 1. Install on Samsung (Tizen)

> **Important:** A Samsung app package (`.wgt`) is **cryptographically tied to the specific TV**
> it was signed for (via your TV's unique **DUID**). This means **you cannot use someone else's
> pre‑built `.wgt`** — it will refuse to install. **Each person must build and sign the app for
> their own TV.** There is no way around this on retail Samsung TVs.

So for Samsung, "installing" = doing the build yourself. It is well documented:

**Follow the full step‑by‑step in [BUILD.md](BUILD.md).** In short:

1. Install **Tizen Studio** (with the *TV Extension*) on your computer.
2. Turn on **Developer Mode** on the TV:
   - Open **Apps**, type **1 2 3 4 5** on the remote.
   - Toggle **Developer mode ON**, enter your **computer's IP address**, and restart the TV.
3. In **Tizen Studio → Certificate Manager**, create an **author** + **distributor** certificate.
   You will be asked for your **TV's DUID** — this is the step that binds the app to your TV.
4. Import this project, then **Run** it (or build the `.wgt` and install it) onto the TV over the
   network. The app appears on your TV's apps row.

If you hit `failed to install the package` and your file name has a space in it, rename it to
something without spaces (e.g. `IPTVPlayer.wgt`) and install again — a space breaks the installer.

---

## 2. Install on LG (webOS)

Good news: on LG, a **pre‑built `.ipk` can be installed on any TV** that is in Developer Mode —
it is **not** DUID‑locked. So you can download the `.ipk` from the project's **Releases** page
(or build it yourself) and install it.

**Step 1 — Enable Developer Mode on the TV**

1. Create a free **LG developer account** at the LG Developer site.
2. On the TV, open the **Content Store** and install the **"Developer Mode"** app.
3. Open it, sign in with your LG developer account, and toggle **Dev Mode Status: ON**. The TV
   restarts.
   > ⚠️ LG Developer Mode **expires after ~50 hours** and must be re‑enabled (there is a "Key
   > Server / extend" button in the Developer Mode app to renew it). This is an LG rule, not ours.

**Step 2 — Install the tools on your computer**

```bash
npm install -g @webosose/ares-cli
```

**Step 3 — Connect to the TV and install**

1. In the TV's Developer Mode app, note the **IP address** and **passphrase**.
2. On your computer:
   ```bash
   ares-setup-device            # add your TV (name, IP, passphrase) — one time
   ares-install ./iptv-player.ipk   # install the app package
   ```
3. The app appears in your TV's launcher. Done.

To build the `.ipk` yourself instead of downloading it:
```bash
npm run build          # builds dist/app.js + media libs
ares-package .         # produces com.iptvplayer.app_1.0.0_all.ipk
```

---

## 3. Connect your server

The app ships empty — it plays only what **you** point it to. On first launch:

- **Xtream Codes:** enter your **server URL** (e.g. `http://example.com:8080`), **username** and
  **password**.
- **M3U:** paste your full **M3U playlist URL**.

Your details are saved on the TV so the app reconnects automatically next time. Nothing is sent
anywhere except to the server you entered.

---

## FAQ

**Can I just copy the app to a USB stick and install it?**
No. Samsung and LG block installing apps from USB for security. You need a computer + Developer
Mode as described above.

**Can my friend use the `.wgt` I built for my Samsung TV?**
No — a Samsung `.wgt` only installs on the exact TV(s) whose DUID was in your certificate. Your
friend must build and sign it for their own TV.

**Does the install stay forever?**
- **Samsung:** the app stays installed, but keep Developer Mode enabled. If Developer Mode is
  reset, you may need to reinstall.
- **LG:** the app stays, but **Developer Mode expires (~50h)** and must be renewed, or dev apps
  stop launching.

**Is it free?**
Yes. The app is free and open source. It includes no channels or content of any kind.

**Which TVs are supported?**
Samsung (Tizen) and LG (webOS) only. See the
[Compatibility table](../README.md#️-compatibility--will-it-run-on-my-tv). Android TV / Fire TV /
Roku / VIDAA are **not** supported.
