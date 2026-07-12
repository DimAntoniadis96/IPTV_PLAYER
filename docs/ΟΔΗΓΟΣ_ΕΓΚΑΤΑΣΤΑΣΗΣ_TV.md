# Οδηγός εγκατάστασης στην Samsung TV

## Σημαντική διευκρίνιση: δεν είναι `.exe`

Η Samsung Smart TV **δεν** τρέχει προγράμματα Windows (`.exe`). Το πακέτο της εφαρμογής
είναι ένα **`.wgt`** (Tizen Web Application) — ένα υπογεγραμμένο αρχείο που φτιάχνει το
Tizen Studio και το στέλνει στην τηλεόραση μέσω δικτύου (Developer Mode). Δηλαδή:

> Δεν αντιγράφεις κάτι σε USB. Το Tizen Studio **χτίζει το `.wgt`, το υπογράφει, και το
> εγκαθιστά κατευθείαν στην TV μέσω Wi-Fi/LAN.**

---

## Προϋπόθεση: Mac και TV στο ίδιο δίκτυο

Το Mac και η τηλεόραση πρέπει να είναι στο **ίδιο Wi-Fi/router**. (Η TV σου έχει IP
`192.168.1.2`.)

Ό,τι χρειάζεται είναι ήδη έτοιμο από εσένα:
- ✅ Tizen Studio + TV Extension
- ✅ Certificate profile **SAMSUNGTV** (author + distributor, με το DUID της TV)
- ✅ Developer Mode ενεργό στην TV
- ✅ Η TV συνδεδεμένη (`192.168.1.2:26101`)

---

## Βήματα εγκατάστασης (κάθε φορά που θέλεις να βάλεις/ανανεώσεις την εφαρμογή)

### 1) Rebuild του project
Επειδή κάναμε αλλαγές στον κώδικα, φτιάξε καινούριο υπογεγραμμένο πακέτο:
- Στο **VS Code (Tizen extension)**: δεξί κλικ στο project → **Build** (ή **Run Project**,
  που κάνει build + install μαζί).
- Ή στο **Tizen Studio**: δεξί κλικ → **Build Signed Package**.

Το αποτέλεσμα είναι ένα αρχείο τύπου `IPTV PROJECT.wgt` στον φάκελο `Debug/`.

### 2) Επιβεβαίωσε ότι η TV είναι συνδεδεμένη
- `Tools → Device Manager` (ή το Target panel του VS Code) → η TV πρέπει να φαίνεται
  **connected** (`192.168.1.2`).
- Αν όχι: στην TV **Apps → πληκτρολόγησε `12345` → Developer Mode ON**, βάλε ως **Host PC
  IP** την IP του Mac σου, και κάνε **restart** την TV. Μετά ξανά **Scan** στο Device Manager.

### 3) Εγκατάσταση στην TV
- **VS Code:** δεξί κλικ στο project → **Run** (ή "Run on device").
- **Tizen Studio:** δεξί κλικ → **Run As → Tizen Web Application**.

Το Tizen Studio: (α) χτίζει το `.wgt`, (β) το υπογράφει με το SAMSUNGTV profile, (γ) το
στέλνει στην TV, (δ) το εγκαθιστά, (ε) το ανοίγει.

### 4) Άνοιγμα από την τηλεόραση
Μετά την πρώτη εγκατάσταση, η εφαρμογή μένει στην TV:
**Apps → (κατηγορία Downloaded / Developer) → IPTV Player**.

### 5) Σύνδεση & θέαση
Στην οθόνη Login:
- **Server + Login** → Server URL (π.χ. `http://server.com:8080`), Username, Password,
  Playlist name → **Connect**.
- ή **M3U URL** → επικόλλησε το πλήρες `get.php?...` link.

Μετά βλέπεις Live TV / Movies / Series, με search, favorites, seasons και τον player
(seek, auto-next επεισοδίων) — απευθείας από την τηλεόραση.

---

## Αν το install αποτύχει (`failed to install the package`)

Αυτό το μήνυμα είναι **γενικό** — ο πραγματικός λόγος είναι στα logs της TV. Το signing
πετυχαίνει, οπότε ο συνηθέστερος λόγος είναι **DUID mismatch** ή **παλιά εγκατάσταση με
άλλη υπογραφή**. Τρέξε στο Terminal (στο ίδιο δίκτυο):

```bash
export PATH="$HOME/tizen-studio/tools:$HOME/tizen-studio/tools/ide/bin:$PATH"
sdb connect 192.168.1.2:26101
SERIAL=$(sdb devices | awk 'NR>1 && $1!=""{print $1; exit}')

# 1) Ξεφορτώσου τυχόν παλιά εγκατάσταση (πολύ συχνό μπλόκο)
tizen uninstall -p 1Ab2Cd3Ef4 -t "$SERIAL"

# 2) Καθάρισε logs, τρέξε ξανά Run από το VS Code, και δες τον πραγματικό λόγο:
sdb dlog -c
sdb dlog | grep -iE "pkg|install|cert|sig|privil|smack|deny|fail|118"
```

Το μήνυμα θα σου πει ακριβώς:
- `cert / signature / DUID not match` → το DUID στο distributor certificate δεν είναι
  **αυτής** της TV. Ξαναβάλε το σωστό DUID (Certificate Manager) — **χωρίς** να φτιάξεις
  νέο profile αν δεν χρειάζεται.
- `already installed` → κάνε πρώτα το `tizen uninstall` πιο πάνω.
- `privilege / cert level` → πες μου το μήνυμα και το προσαρμόζω στο `config.xml`.

---

## Πίνακας γρήγορης επίλυσης

| Σύμπτωμα | Πιθανή αιτία | Λύση |
|---|---|---|
| `failed to install the package` | DUID / παλιά εγκατάσταση | `tizen uninstall` + σωστό DUID στο cert |
| Δεν βλέπει την TV το Device Manager | Λάθος Host PC IP / firewall | Ξαναβάλε IP στο Developer Mode, επίτρεψε port 26101 |
| Μαύρη οθόνη στο βίντεο | Το `webapis.js` / CSP | Είναι ήδη σωστά· έλεγξε ότι το stream παίζει |
| «Server is unavailable» στη σύνδεση | (μόνο σε browser) CORS | Στην TV **δεν** ισχύει· δούλεψε στην TV |
| App δεν ανοίγει μετά από καιρό | Έληξε το developer certificate | Ανανέωσε το certificate και ξανα-install |

---

## Καλό να ξέρεις

- **Μετά από αλλαγές στον κώδικα** χρειάζεται μόνο **Rebuild + Run** — όχι νέο certificate,
  όχι ξανά Developer Mode.
- Τα developer certificates **λήγουν** μετά από κάποιο διάστημα· αν σταματήσει να ανοίγει η
  εφαρμογή, ανανέωσε το certificate (ίδιο DUID) και ξανα-εγκατέστησε.
- Το παλιό αναλυτικό build guide (στα Αγγλικά) είναι στο `docs/BUILD.md`.
