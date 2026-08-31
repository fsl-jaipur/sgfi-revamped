# Dynamic Certificate Image, Cloudinary Uploader & Name Position Editor Documentation

## Architecture & How It Works

The certificate system is fully dynamic, format-agnostic, and self-discovering. You can either:
1. **Upload a new certificate directly from the Admin Panel** to Cloudinary without touching any project files.
2. Or place/replace template images inside `frontend/public/Image/`.

---

### 1. Supported Image Formats
Any standard image format is supported:
- `.png`
- `.jpg` / `.jpeg`
- `.webp`
- `.svg`
- `.avif`

---

### 2. Change Certificate Image from Admin (Cloudinary Integration)

Admins can change the certificate template directly from their PC:
1. Open **Certificate Studio** in the Admin panel.
2. Switch to the **"Change Image"** tab.
3. Click **"Choose File from PC"** (or drag & drop). Supported: `.png`, `.jpg`, `.jpeg`, `.webp` (Max 10 MB).
4. The selected certificate image appears in an instant thumbnail preview card with filename and size.
5. Click **"Upload / Change Certificate"**.
6. The file is uploaded securely to the existing Cloudinary configuration via the protected `/api/upload` endpoint.
7. The returned Cloudinary URL is automatically stored in `localStorage` under `sgfi_active_certificate_url` and immediately activated across:
   - **Live HTML Certificate Preview**
   - **High-Resolution Canvas PNG Export**
8. **Position Preservation**: The currently saved recipient name position `{ x, y }` is completely preserved.
9. **Reset Option**: Admins can click **"Reset Default Image"** at any time to restore the bundled local template.

---

### 3. Interactive Name Position Editor

1. Open the **"Set Name Position"** tab in the Certificate Studio.
2. Drag the sample name with the mouse or touch to place it on the new certificate.
3. Click **"Save Position"** to persist `{ x, y }` in `localStorage` under `sgfi_cert_name_position`.

---

### 4. Position Coordinate Storage Model

Coordinates are stored as percentages relative to the certificate dimensions:

```json
{
  "x": 50.0,
  "y": 46.25
}
```

- `x = 0` → Left edge, `x = 50` → Center, `x = 100` → Right edge
- `y = 0` → Top edge, `y = 50` → Center, `y = 100` → Bottom edge

---

### 5. Single Source of Truth

Both the live DOM preview and the Canvas export draw from the exact same active image and coordinate configuration:

- **Active Image Source**:
  1. Priority 1: Cloudinary custom upload stored in `localStorage` (`sgfi_active_certificate_url`)
  2. Priority 2: Discovered image in `public/Image/*.*`
  3. Priority 3: Fallback candidate probing
- **Preview Element**: `left: ${x}%; top: ${y}%; transform: translate(-50%, -50%);`
- **Canvas Rendering**:
  - `posX = exportWidth * (x / 100)`
  - `posY = exportHeight * (y / 100)`
  - `ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name, posX, posY);`
