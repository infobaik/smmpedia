// app/client.ts
import { createClient } from 'honox/client'

// Titik masuk (Entry Point) untuk bundler Vite sisi klien.
// Dibutuhkan oleh HonoX untuk hidrasi interaktivitas (Islands Architecture).
createClient()
