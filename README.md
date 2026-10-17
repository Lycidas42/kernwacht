# Kernwacht

Idle Tower Defense im Neon-Look. Deine Kanone steht unten, Raumschiffe greifen von oben an. Wenn sie fällt, gibt es Kristalle für dauerhafte Upgrades im Labor.

Challenges (ab Rekordwelle 40): Läufe mit Handicap wie „Ohne Abwehr“, „Hetzjagd“ oder „Nur Minen“, je 8 Stufen. Jede Stufe vervielfacht einen dauerhaften Bonus (×1,05 bis ×1,08), der auch die Kernfusion überdauert. Gestartet wird am zuletzt erreichten Stufenziel mit passender Startenergie.

Erfolge: 11 Erfolge mit je 4–7 Stufen (Wellen, Höchste Welle, Abschüsse, Kristalle, Bosse, Modulkopien, Fusionen, Tagesläufe, Erz, Orbitalschläge, Challenge-Stufen). Jede Stufe gibt einen kleinen dauerhaften Bonus. Erfolgsstufen erscheinen im Profil und in der Bestenliste.

Tageslauf (ab Rekordwelle 15): Alle spielen am selben Tag dieselben Wellen mit derselben Standard-Ausrüstung und einer Tages-Besonderheit. Der erste Versuch am Tag bringt einen Kristallbonus, der beste Versuch kommt in die Tages-Bestenliste. Das ist die Vorstufe zum späteren Battle Mode.

Bergbau (ab Rekordwelle 25): Fünf Planeten mit eigener Optik und Eigenschaft. Je Planet Bohrturm, Erzsilo, Sammeldrohnen, Schmelze und Lasermeißel (Abbau per Tippen, eigene Bohrkraft-Leiste je Planet). Förderung in Echtzeit, auch offline. Erz wird in der Raffinerie zu Kristallen oder stärkt in der Werkstatt Module des gleichen Sektors. Grafik in `mine-view.js`.

Hangar: Farbe, Turmform, Fundament und Anbauteile der Kanone; neue Teile werden über den Fortschritt freigeschaltet. Musik: sechs generative Stücke (Synthwave, 8-Bit, Ambient, Techno, Episch, Lo-Fi) oder Zufall.

Langzeit-Ziele: Alle 50 Wellen beginnt ein neuer Sektor mit eigenem Biom, neuem Gegnertyp und neuer Boss-Fähigkeit. Bosse lassen Module fallen (je Sektor eigene Typen). Ab Bestwelle 50 setzt die Kernfusion Labor und Kristalle zurück und bringt Kernfragmente für dauerhafte Technik, darunter Raketen- und Kryowerfer.

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
| `core.js` | Spielkern ohne DOM: Wellen, Gegner, Boss, Upgrades, Labor, Fähigkeiten, Balancing-Parameter (`P`) |
| `game.js` | Steuerung: Zustand, Bedienung, Speichern, Werte-Tab, Admin-Modus, Spielschleife |
| `render.js` | Grafik (Canvas 2D): Schiffe, Kanone, Minen, Effekte |
| `mine-view.js` | Bergbau-Ansicht: Planeten, Einrichtungen, Abbau per Tippen |
| `audio.js` | Soundeffekte und Musik, komplett per WebAudio erzeugt |
| `online.js`, `config.js` | Online: Anzeige, Profil, Highscores, Cloud-Spielstand, Feedback, Umfragen (optional, siehe unten) |
| `admin.html` | Verwaltungsseite: Feedback, Umfragen, Spieler |
| `supabase/` | Supabase-Projekt: `config.toml`, Datenbank-Migrationen (GitHub-Integration) und Edge Function `push` |
| `vendor/` | `supabase-js`, die offizielle Client-Bibliothek |
| `sw.js` | Service Worker: online immer neueste Version, offline aus dem Cache; zeigt Push-Benachrichtigungen |
| `manifest.webmanifest`, `icons/` | PWA-Metadaten und App-Icons |
| `tools/sim.js` | Simuliert Läufe mit einem Kauf-Bot und gibt die erreichten Wellen aus |
| `tools/check.js` | Fortschritt über viele Läufe, dazu Sprungtor, Boss und Schaden pro Quelle |
| `tools/strategies.js` | Vergleicht Kaufstrategien (nur Angriff, ausgewogen, Abwehr); Varianten per `KW_P='{...}'` |
| `tools/fusion.js` | Mehrere Fusionszyklen mit Bot: Läufe pro Zyklus, Fragmente, wie schnell die alte Bestwelle wieder erreicht wird |
| `tools/curve.js` | Schnelle Fortschrittskurve des ersten Zyklus, Varianten per `KW_P` |
| `tools/diag_boss.js` | Protokolliert einen Boss-Kampf bei einer Welle |
| `tools/tune.js` | Zufallssuche über die Balancing-Parameter gegen eine Zielkurve |
| `tools/shares.js` | Schadensanteile je Quelle in späten Läufen, mit verschiedenen Modulen |
| `tools/challenges.js` | Herausforderungen und Tageslauf: welche Wellen ein Bot bei typischem Fortschritt schafft |
| `tools/build-single.js` | Baut `dist/kernwacht.html` als eigenständige Einzeldatei |

## Neue Version veröffentlichen

1. Änderungen an `index.html` / `core.js` machen.
2. In `sw.js` die Konstante `VERSION` erhöhen (z. B. `kw-1` → `kw-2`).
3. Committen und auf `main` pushen. GitHub Pages ist nach etwa einer Minute aktuell.

Das Spiel prüft beim Start, alle 5 Minuten und beim Zurückkehren in die App, ob es eine neue Version gibt (Vergleich mit `VERSION` in `sw.js`), und zeigt dann oben „Neue Version – tippen zum Laden“. Im Startmenü steht die aktuelle Version mit dem Knopf „Nach Update suchen“. `VERSION` in `core.js` muss deshalb immer gleich `sw.js` sein.

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

### Spielercode, Cloud-Spielstand, Feedback, Umfragen

- **Spielercode:** Jeder Spieler bekommt im Browser einen geheimen Geräteschlüssel (25 Zeichen). Die Datenbank speichert nur dessen Hash.
- **Geräte koppeln:** Profil → „Code für anderes Gerät erzeugen“ zeigt einen Kurzcode (z. B. `K7M-4QX`, 10 Minuten gültig) und einen QR-Code. Auf dem anderen Gerät eingeben oder scannen: Beide Geräte sind danach derselbe Spieler. Jedes Gerät hat seinen eigenen Schlüssel (`player_keys`).
- **Schreiben** geht nur über die Datenbankfunktionen `kw_*`, die den Code prüfen. Gelesen werden dürfen nur Profilname, Profilbild und Highscore-Werte.
- **Verwaltung:** `admin.html` (Link auch im Admin-Modus des Spiels) zeigt Feedback, Umfragen und Spieler. Zugang mit dem Verwaltungsschlüssel; in der Migration steht nur sein Hash. Neuen Schlüssel setzen: im SQL Editor
  `insert into admin_keys values (encode(sha256(convert_to('kernwacht-admin:' || 'NEUER-SCHLÜSSEL', 'UTF8')), 'hex'));` und den alten Eintrag löschen.
- **Lokal sichern:** Profil → Export als Text oder Datei, Import auf einem anderen Gerät, ganz ohne Online-Dienst.

### Push-Benachrichtigungen

Optionen → Benachrichtigungen: „Lager voll“ (ein Silo im Bergbau ist voll) und „Bohrkraft aufgeladen“ (Lasermeißel auf allen Planeten voll). Funktioniert auf Android und am Desktop im Browser, auf iPhone/iPad (ab iOS 16.4) nur in der installierten App vom Home-Bildschirm.

Ablauf: Beim Verlassen der App meldet das Spiel, wann das nächste Silo voll und wann die Bohrkraft aufgeladen ist (`kw_push_plan`), beim Zurückkehren löscht es den Plan. Ein `pg_cron`-Job sucht jede Minute die fälligen Einträge und gibt sie per `pg_net` an die Edge Function `supabase/functions/push`, die sie verschlüsselt an die Push-Dienste (Google, Apple, Mozilla, Microsoft) schickt. Nach einer „Lager voll“-Meldung kommt keine weitere, bis die App wieder geöffnet wurde.

Einmalig einrichten:

1. VAPID-Schlüsselpaar erzeugen: `npx web-push generate-vapid-keys`. Den öffentlichen Schlüssel in `config.js` bei `vapidKey` eintragen. Neue Schlüssel machen alle bestehenden Abos ungültig.
2. **Edge Functions → Secrets**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (z. B. `mailto:du@example.com`, Kontakt für die Push-Dienste) und `PUSH_SECRET` (langes Zufallspasswort).
3. Dasselbe Passwort im **SQL Editor** in den Vault legen: `select vault.create_secret('PUSH-SECRET', 'push_secret');`
4. Function deployen: `supabase functions deploy push` (übernimmt `verify_jwt = false` aus `config.toml`). Alternativ im Dashboard unter **Edge Functions** eine Function `push` anlegen, `index.ts` und `webpush.ts` einfügen und „Verify JWT“ ausschalten.

`pg_cron` und `pg_net` aktiviert die Migration. Ohne den Vault-Eintrag bleibt der Versand aus. Fehler des Versands stehen unter **Edge Functions → push → Logs**, die Aufrufe der Datenbank in `net._http_response`.

## Admin-Modus

Fünfmal schnell auf den Titel im Startmenü oder auf „Pause“ im Pausenmenü tippen, dann Passwort eingeben. Nach der Anmeldung gibt es im Pausenmenü zusätzlich einen Admin-Knopf. Unten im Admin-Fenster: „Admin-Modus verlassen“ meldet ab, „Admin-Markierung entfernen“ lässt einen Spielstand mit Admin-Eingriffen wieder in die Highscores.

Passwort ändern: Hash erzeugen und in `game.js` bei `ADMIN_HASH` eintragen.

```bash
node -e "console.log(require('crypto').createHash('sha256').update('kernwacht:' + process.argv[1]).digest('hex'))" 'neues-passwort'
```

Das ist ein Schutz gegen versehentliches Öffnen, keine echte Sicherheit: Wer den Code liest, kann den Admin-Modus umgehen.

Lokal spielen: `python3 -m http.server` im Repo-Ordner, dann `http://localhost:8000` öffnen. (Direkt per `file://` läuft der Service Worker nicht.)

Sprachen: Deutsch und Englisch (Optionen → Sprache). Der Code enthält die deutschen Texte; `i18n.js` übersetzt beim Anzeigen anhand des Wörterbuchs `i18n-en.js` (Schlüssel = deutscher Text, `{0}`, `{1}` … als Platzhalter). Neue Texte dort ergänzen.

Kommandant (Skilltree): Jede überstandene Welle gibt Erfahrung, jeder Rang einen Skillpunkt (Rang übersteht die Fusion, rückwirkend aus dem Rekord). Vier Äste – Präzision, Arsenal, Bollwerk, Taktik – mit eigenen Mechaniken (Gift, Vampir, Hinrichtung, Brandfelder, Drohnen, Reflexion, Betäubung, Phönix, Aegis, Schwarzes Loch …) und je einem wählbaren Schlussstein. Zurücksetzen außerhalb eines Laufs kostenlos.
