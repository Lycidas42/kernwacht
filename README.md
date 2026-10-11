# Kernwacht

Idle Tower Defense im Neon-Look. Deine Kanone steht unten, Raumschiffe greifen von oben an. Wenn sie fällt, gibt es Kristalle für dauerhafte Upgrades im Labor.

Kein Shop, keine Werbung, keine Premiumwährung. Die Kurven sind auf faires Tempo ohne Kaufdruck ausgelegt.

**Spielen:** https://lycidas42.github.io/kernwacht/

## Aufs Handy installieren

- **Android (Chrome):** Seite öffnen → Menü → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone (Safari):** Seite öffnen → Teilen → „Zum Home-Bildschirm“.

Danach startet Kernwacht wie eine App im Vollbild und läuft auch offline. Der Spielstand liegt lokal auf dem Gerät.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `index.html` | Oberfläche, Grafik (Canvas), Bedienung, Speichern |
| `core.js` | Spielkern ohne DOM: Wellen, Gegner, Upgrades, Labor, Balancing-Parameter (`P`) |
| `sw.js` | Service Worker: online immer neueste Version, offline aus dem Cache |
| `manifest.webmanifest`, `icons/` | PWA-Metadaten und App-Icons |
| `tools/sim.js` | Simuliert Läufe mit einem Kauf-Bot und gibt die erreichten Wellen aus |
| `tools/tune.js` | Zufallssuche über die Balancing-Parameter gegen eine Zielkurve |
| `tools/build-single.js` | Baut `dist/kernwacht.html` als eigenständige Einzeldatei |

## Neue Version veröffentlichen

1. Änderungen an `index.html` / `core.js` machen.
2. In `sw.js` die Konstante `VERSION` erhöhen (z. B. `kw-1` → `kw-2`).
3. Committen und auf `main` pushen. GitHub Pages ist nach etwa einer Minute aktuell.

Wer das Spiel offen hat, sieht beim nächsten Laden einen Hinweis „Neue Version“. Installierte Apps holen sich die neue Version beim nächsten Start mit Internet.

## Balancing testen

```bash
node tools/sim.js 30              # 30 Läufe hintereinander simulieren
node tools/tune.js 300 240        # bis zu 300 Varianten, max. 240 s
```

Lokal spielen: `python3 -m http.server` im Repo-Ordner, dann `http://localhost:8000` öffnen. (Direkt per `file://` läuft der Service Worker nicht.)
