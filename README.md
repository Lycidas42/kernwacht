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
| `index.html` | Markup und Styles |
| `core.js` | Spielkern ohne DOM: Wellen, Gegner, Mutterschiff, Upgrades, Labor, Fähigkeiten, Balancing-Parameter (`P`) |
| `game.js` | Steuerung: Zustand, Bedienung, Speichern, Werte-Tab, Admin-Modus, Spielschleife |
| `render.js` | Grafik (Canvas 2D): Schiffe, Kanone, Minen, Effekte |
| `audio.js` | Soundeffekte und Musik, komplett per WebAudio erzeugt |
| `online.js`, `config.js`, `supabase.sql` | Online-Anzeige und Bestenliste (optional, siehe unten) |
| `sw.js` | Service Worker: online immer neueste Version, offline aus dem Cache |
| `manifest.webmanifest`, `icons/` | PWA-Metadaten und App-Icons |
| `tools/sim.js` | Simuliert Läufe mit einem Kauf-Bot und gibt die erreichten Wellen aus |
| `tools/check.js` | Fortschritt über viele Läufe, dazu Sprungtor, Mutterschiff und Schaden pro Quelle |
| `tools/tune.js` | Zufallssuche über die Balancing-Parameter gegen eine Zielkurve |
| `tools/build-single.js` | Baut `dist/kernwacht.html` als eigenständige Einzeldatei |

## Neue Version veröffentlichen

1. Änderungen an `index.html` / `core.js` machen.
2. In `sw.js` die Konstante `VERSION` erhöhen (z. B. `kw-1` → `kw-2`).
3. Committen und auf `main` pushen. GitHub Pages ist nach etwa einer Minute aktuell.

Wer das Spiel offen hat, sieht beim nächsten Laden einen Hinweis „Neue Version“. Installierte Apps holen sich die neue Version beim nächsten Start mit Internet.

## Balancing testen

```bash
node tools/check.js 30            # 30 Läufe mit Labor-Käufen, danach Sprungtor- und Boss-Test
node tools/sim.js 30              # einfache Simulation
node tools/tune.js 300 240        # bis zu 300 Varianten, max. 240 s
```

## Online: Spieler online und Bestenliste

Läuft über [Supabase](https://supabase.com) (kostenloser Tarif reicht). Ohne Eintrag in `config.js` bleibt alles aus.

1. Projekt anlegen, Region **Frankfurt (eu-central-1)** wählen.
2. Im **SQL Editor** den Inhalt von `supabase.sql` ausführen.
3. Unter **Project Settings → API** die *Project URL* und den *anon public* Key in `config.js` eintragen.
4. `sw.js`: `VERSION` erhöhen, committen, pushen.

Der anon Key ist für den Browser gedacht und darf öffentlich sein. Jeder Spieler bekommt eine zufällige ID im Browser; Spielstände mit Admin-Eingriffen werden nicht eingetragen.

## Admin-Modus

Im Startmenü fünfmal schnell auf den Titel tippen, dann Passwort eingeben. Danach gibt es auch im Pausenmenü einen Admin-Knopf.

Passwort ändern: Hash erzeugen und in `game.js` bei `ADMIN_HASH` eintragen.

```bash
node -e "console.log(require('crypto').createHash('sha256').update('kernwacht:' + process.argv[1]).digest('hex'))" 'neues-passwort'
```

Das ist ein Schutz gegen versehentliches Öffnen, keine echte Sicherheit: Wer den Code liest, kann den Admin-Modus umgehen.

Lokal spielen: `python3 -m http.server` im Repo-Ordner, dann `http://localhost:8000` öffnen. (Direkt per `file://` läuft der Service Worker nicht.)
