# Build & Install Guide — IPTV Player (Samsung Tizen TV)

This guide covers building the app, generating the signed `.wgt` package, and installing it
on a Samsung Smart TV (2021+, Tizen 6.0+) via **Developer Mode**.

---

## 1. Prerequisites

1. **Tizen Studio** (with the **TV Extension**) — download from the Samsung Developer site
   and install the *Tizen SDK*. During install, open **Package Manager → Extension SDK** and
   install **Samsung Certificate Extension** and **TV Extensions-6.0** (or newer).
2. **Java 8+** (bundled installer usually handles this).
3. A Samsung TV on the **same local network** as your PC.
4. This project folder.

---

## 2. Import the project

1. Launch **Tizen Studio**.
2. `File → Import…`
3. Choose **Tizen → Tizen Project**, click **Next**.
4. Select **Select root directory** and browse to this `IPTV PROJECT` folder.
5. Finish. The project (`IPTVPlayer`) appears in the **Project Explorer**.

> The included `.project` / `.tproject` files make it import as a **TV Web** project automatically.

---

## 3. Create a signing certificate (one-time)

Every Tizen package must be signed. For personal installs you create an **author** certificate
and a **distributor** (Samsung TV) certificate together via the Certificate Manager.

1. `Tools → Certificate Manager`.
2. Click **+** → **Samsung** → **Next**.
3. Choose **TV** as the device type → **Next**.
4. **Create a new author certificate** — fill in name + password, save the `author.p12`.
5. **Create a distributor certificate** — you must enter the **DUID** of your TV
   (see step 5 below to get it). Add the DUID so the TV will accept the package.
6. Finish. The profile is now the **active signing profile** — Tizen Studio signs builds with it.

> Keep the `.p12` files private. They are already in `.gitignore`; never commit them.

---

## 4. Enable Developer Mode on the TV

1. Open **Apps** on the TV.
2. On the Apps screen, type **12345** using the remote number pad (or on-screen keypad).
3. A **Developer Mode** dialog opens. Toggle it **On**.
4. Enter your **PC's IP address** in the **Host PC IP** field.
5. **Restart** the TV when prompted.

---

## 5. Connect the TV to Tizen Studio & get the DUID

1. Open **Device Manager** (`Tools → Device Manager`).
2. Click **Scan**, or **+ Remote Device** and enter the TV's IP (port 26101).
3. Toggle the connection **On**. The TV should show as connected.
4. Right-click the connected device → the **DUID** is shown (also under the device info).
   Use this DUID when creating the distributor certificate in step 3.

---

## 6. Build the `.wgt` package

**Option A — GUI**
1. Right-click the project → **Build Signed Package** *(or `Build Project` then `Package`)*.
2. Tizen Studio compiles and signs, producing `IPTVPlayer.wgt` in the project's
   `.buildResult/` (or the project root, depending on version).

**Option B — Command line** (uses the `tizen` CLI in `<tizen-studio>/tools/ide/bin/`):
```bash
# From the project directory:
tizen build-web -- .                      # prepare web build output (.buildResult)
tizen package -t wgt -s <your-profile> -- .buildResult
# -> produces IPTVPlayer.wgt signed with <your-profile>
```
Replace `<your-profile>` with the signing profile name from the Certificate Manager.

---

## 7. Install on the TV

**Option A — GUI (run directly)**
1. Ensure the TV is connected in **Device Manager**.
2. Right-click the project → **Run As → Tizen Web Application**.
3. Tizen Studio installs and launches the app on the TV.

**Option B — Command line**
```bash
tizen install -n IPTVPlayer.wgt -t <device-name>
```
`<device-name>` is the name shown in Device Manager / `sdb devices`.

After install, the app appears on the TV under **Apps → Downloaded / Developer** and can be
launched with the remote.

---

## 8. Certificate expiry & re-signing notes

- Developer certificates typically expire; if the app stops launching after a period,
  regenerate the certificate (step 3) and reinstall.
- If you add another TV, add its **DUID** to the distributor certificate and rebuild.

---

## 9. Quick troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| App won't install (`Author certificate not matched`) | DUID missing/wrong in distributor cert | Recreate distributor cert with the correct TV DUID |
| Black screen / video won't play | `webapis.js` not loaded, or CSP blocking media | Confirm the `$WEBAPIS/webapis/webapis.js` script tag; check `media-src`/`connect-src` in `config.xml` |
| Remote keys ignored | keys not registered | Ensure Module 5 registers keys via `tizen.tvinputdevice.registerKey` and the `tv.inputdevice` privilege is present |
| Can't connect to server | HTTP blocked / self-signed cert | Prefer HTTPS with a valid cert; `access origin="*"` is already set |
| Device Manager can't see TV | Wrong Host PC IP / firewall | Re-enter PC IP in Developer Mode, allow port 26101 |

---

## 10. Development on desktop (optional)

The UI can be previewed in Chrome for layout work: serve the folder with any static server
(`python3 -m http.server`) and open it. Note that **AVPlay, the remote-key API and volume
control only exist on the TV** — those code paths are feature-detected and no-op in a browser,
so playback and hardware keys will not work off-device.
