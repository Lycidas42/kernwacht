# Kernwacht

Idle Tower Defense im Neon-Look. Deine Kanone steht unten, Raumschiffe greifen von oben an. Wenn sie fällt, gibt es Kristalle für dauerhafte Upgrades im Labor.

Herausforderungen (ab Rekordwelle 40): Läufe mit Handicap wie „Ohne Abwehr“, „Hetzjagd“ oder „Nur Minen“. Jede erreichte Stufe gibt einen dauerhaften Bonus, der auch die Kernfusion überdauert.

Tageslauf (ab Rekordwelle 15): Alle spielen am selben Tag dieselben Wellen mit derselben Standard-Ausrüstung und einer Tages-Besonderheit. Der erste Versuch am Tag bringt einen Kristallbonus, der beste Versuch kommt in die Tages-Bestenliste. Das ist die Vorstufe zum späteren Battle Mode.

Langzeit-Ziele: Alle 50 Wellen beginnt ein neuer Sektor mit eigenem Biom, neuem Gegnertyp und neuer Boss-Fähigkeit. Mutterschiffe lassen Module fallen (je Sektor eigene Typen). Ab Bestwelle 50 setzt die Kernfusion Labor und Kristalle zurück und bringt Kernfragmente für dauerhafte Technik, darunter Raketen- und Kryowerfer.

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
| `online.js`, `config.js` | Online-Anzeige und Bestenliste (optional, siehe unten) |
| `supabase/` | Supabase-Projekt: `config.toml` und Datenbank-Migrationen (GitHub-Integration) |
| `vendor/` | `supabase-js`, die offizielle Client-Bibliothek |
| `sw.js` | Service Worker: online immer neueste Version, offline aus dem Cache |
| `manifest.webmanifest`, `icons/` | PWA-Metadaten und App-Icons |
| `tools/sim.js` | Simuliert Läufe mit einem Kauf-Bot und gibt die erreichten Wellen aus |
| `tools/check.js` | Fortschritt über viele Läufe, dazu Sprungtor, Mutterschiff und Schaden pro Quelle |
| `tools/strategies.js` | Vergleicht Kaufstrategien (nur Angriff, ausgewogen, Abwehr); Varianten per `KW_P='{...}'` |
| `tools/fusion.js` | Mehrere Fusionszyklen mit Bot: Läufe pro Zyklus, Fragmente, wie schnell die alte Bestwelle wieder erreicht wird |
| `tools/curve.js` | Schnelle Fortschrittskurve des ersten Zyklus, Varianten per `KW_P` |
| `tools/diag_boss.js` | Protokolliert einen Mutterschiff-Kampf bei einer Welle |
| `tools/tune.js` | Zufallssuche über die Balancing-Parameter gegen eine Zielkurve |
| `tools/challenges.js` | Herausforderungen und Tageslauf: welche Wellen ein Bot bei typischem Fortschritt schafft |
| `tools/build-single.js` | Baut `dist/kernwacht.html` als eigenständige Einzeldatei |

## Neue Version veröffentlichen

1. Änderungen an `index.html` / `core.js` machen.
2. In `sw.js` die Konstante `VERSION` erhöhen (z. B. `kw-1` → `kw-2`).
3. Committen und auf `main` pushen. GitHub Pages ist nach etwa einer Minute aktuell.

Wer das Spiel offen hat, sieht beim nächsten Laden einen Hinweis „Neue Version“. Installierte Apps holen sich die neue Version beim nächsten Start mit Internet.

## Balancing testen

```bash
node tools/check.js 30            # 30 Läufe mit Labor-Käufen, danach Sprungtor- und Boss-Test
node tools/strategies.js 20       # lohnt sich Abwehr? drei Kaufstrategien im Vergleich
node tools/fusion.js 120          # Fusionszyklen: kommt man nach jeder Fusion schnell zurück?
node tools/challenges.js 45 6     # Herausforderungen bei Bestwelle 45, je 6 Läufe
node tools/sim.js 30              # einfache Simulation
node tools/tune.js 300 240        # bis zu 300 Varianten, max. 240 s
```

## Online: Spieler online und Bestenliste

Läuft über [Supabase](https://supabase.com) (kostenloser Tarif reicht). Ohne Eintrag in `config.js` bleibt alles aus. Die Datenbank-Struktur liegt als Migration in `supabase/migrations/` und wird über die GitHub-Integration automatisch eingespielt.

1. Projekt anlegen, Region **Frankfurt (eu-central-1)** wählen.
2. **Project Settings → Integrations → GitHub**: Repo `Lycidas42/kernwacht` verbinden, Working directory `.`, Produktionszweig `main`, **Deploy to production** an. Automatische Preview-Branches aus (kosten pro Stunde und fallen nicht unter die Ausgabengrenze).
3. Unter **Project Settings → API Keys** die *Project URL* und den **Publishable Key** (`sb_publishable_…`) in `config.js` eintragen. Nie den Secret Key.
4. `sw.js`: `VERSION` erhöhen, committen, pushen. Der Push spielt auch die Migration ein.

Neue Tabellen oder Regeln: neue Datei `supabase/migrations/<Zeitstempel>_<name>.sql` anlegen und pushen. Ohne GitHub-Integration lässt sich eine Migration auch von Hand im **SQL Editor** ausführen.

Die Client-Bibliothek `supabase-js` liegt unter `vendor/` und wird erst geladen, wenn Zugangsdaten eingetragen sind.

Der Publishable Key ist für den Browser gedacht und darf öffentlich sein; geschützt wird über Row Level Security. Jeder Spieler bekommt eine zufällige ID im Browser; Spielstände mit Admin-Eingriffen werden nicht eingetragen.

## Admin-Modus

Fünfmal schnell auf den Titel im Startmenü oder auf „Pause“ im Pausenmenü tippen, dann Passwort eingeben. Nach der Anmeldung gibt es im Pausenmenü zusätzlich einen Admin-Knopf.

Passwort ändern: Hash erzeugen und in `game.js` bei `ADMIN_HASH` eintragen.

```bash
node -e "console.log(require('crypto').createHash('sha256').update('kernwacht:' + process.argv[1]).digest('hex'))" 'neues-passwort'
```

Das ist ein Schutz gegen versehentliches Öffnen, keine echte Sicherheit: Wer den Code liest, kann den Admin-Modus umgehen.

Lokal spielen: `python3 -m http.server` im Repo-Ordner, dann `http://localhost:8000` öffnen. (Direkt per `file://` läuft der Service Worker nicht.)
