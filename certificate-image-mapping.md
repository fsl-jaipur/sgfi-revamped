# Dynamic Certificate Image System Documentation

## Architecture & How It Works

The certificate system is fully dynamic, format-agnostic, and self-discovering. You can place or replace any certificate template image inside the `Image` folder (`frontend/public/Image/`) without making any code changes in HTML, CSS, or JavaScript.

### 1. Supported Image Formats
Any standard image format is supported:
- `.jpeg` / `.jpg`
- `.png`
- `.webp`
- `.svg`
- `.avif`

### 2. Multi-Tier Dynamic Discovery
1. **Tier 1 (Vite Glob Discovery)**:
   - Uses `import.meta.glob` to inspect `public/Image/*.*` at build/dev time.
   - Any image present in `public/Image/` is automatically discovered regardless of its filename or extension.
2. **Tier 2 (Runtime Candidate Probing)**:
   - Probes candidate filenames (`Image`, `Certificate`, `Template`, `cert`, `bg`, etc.) across all standard extensions (`.jpeg`, `.jpg`, `.png`, `.webp`, `.svg`, etc.).
3. **Tier 3 (Cache-Busting & Live Reload)**:
   - Generates cache-busting query strings (`?_v=${Date.now()}`) to prevent browser cache retention when replacing certificate images.

---

## Dynamic Recipient Name & Positioning

- **Configured Name Position**:
  - Horizontal Center: `50%` (`posX = exportWidth * 0.5`)
  - Vertical Center: `46.25%` (`posY = exportHeight * 0.4625`)
  - Font Style: Customizable (Defaults to `'Shrikhand', cursive, serif`)
  - Font Color: Customizable (Defaults to `#fb4d3d`)
  - Dynamic Font Sizing: Proportional to image resolution with automatic shrinking for long names.

- **Data Sources**:
  - **Backend**: In the Admin portal, clicking the Certificate icon on any player automatically populates the recipient's name via `setCertificateRecipient(player.player_name)`.
  - **Manual Input**: Users can type any custom name directly in the `#recipientInput` field for testing.

---

## High-Resolution Export

- High-resolution Canvas rendering automatically extracts the natural dimensions of the active certificate background image (`img.naturalWidth` × `img.naturalHeight`).
- Exports a crisp, unpixelated `.png` download matching the exact layout and typography of the live preview.
