# Kernwacht – Monetarisierung und Store (Zwischenstand)

Stand: 13.10.2026 · Status: **Überlegung, nichts entschieden.** Keine Rechts- oder Steuerberatung; vor einem Start prüfen lassen.

## Kurzfassung

- Kernwacht bleibt vorerst ein **Hobbyprojekt ohne Werbebudget**. Bezahlte Nutzergewinnung lohnt sich mit einem fairen Modell praktisch nirgends (siehe Modell unten). Wachstum also organisch.
- Nächster sinnvoller Schritt: **kostenlos und ohne Käufe in den Play Store** als Test, dabei die **Bindung messen** (seit 0.26.1 eingebaut, Reiter „Bindung“ in der Verwaltung).
- Erst wenn die Bindung trägt (Tag-30-Bindung über ~10 %), über Käufe nachdenken. Bevorzugt ein **fairer Shop** (kein Pay-to-win), um das Alleinstellungsmerkmal „kein P2W“ zu halten.

## 1. Weg in den Play Store

| | TWA (Trusted Web Activity) | Capacitor |
|---|---|---|
| Plattformen | nur Android | Android und iOS |
| Updates | sofort per Push auf GitHub | neue Store-Version (oder Live-Update-Dienst) |
| Eigene Domain + `/.well-known/assetlinks.json` | nötig | nicht nötig |
| Käufe | Digital Goods API (nur Google Play) | Plugins für beide Stores (z. B. RevenueCat) |
| Belohnte Werbung | praktisch nicht möglich | AdMob-Plugin |
| Benachrichtigungen („Lager voll“) | Web-Push, eingeschränkt | nativ |
| Aufwand | gering | mittel (Android-Studio/Xcode-Projekt, Signierung) |

Tendenz: **Capacitor**, falls iOS oder Benachrichtigungen gewünscht; **TWA**, wenn nur Android mit minimalem Pflegeaufwand. Das Spiel selbst (Vanilla JS) bleibt in beiden Fällen unverändert, die Webversion auf GitHub Pages bleibt bestehen.

### Konto
- **Privat über die Freiberuflichkeit** möglich (25 $ einmalig, Identitätsprüfung).
  - Neue private Konten: **geschlossener Test mit mindestens 12 Testern über 14 Tage** vor dem öffentlichen Start.
  - Als Unternehmer (spätestens mit Einnahmen) werden Name, Anschrift, Telefon und E-Mail im Store angezeigt (EU-Digital-Services-Act). Für eine kostenlose Testversion in der Regel als Nicht-Unternehmer möglich.
  - App lässt sich später in ein anderes Entwicklerkonto (z. B. eine GmbH) **übertragen**, Bewertungen und Installationen bleiben.
- **Organisationskonto** über eine GmbH: keine 12-Tester-Pflicht, braucht D-U-N-S-Nummer.

### Pflichtangaben
- Datenschutzerklärung und Impressum (Supabase speichert Name, Spielstand, Feedback, tägliche Aktivität; Serverregion und AVV prüfen)
- Formular „Datensicherheit“ in der Play Console, Altersfreigabe über IARC-Fragebogen
- Steuer: kostenlose App ohne Einnahmen unkritisch; mit Einnahmen vermutlich gewerblich (Gewerbeanmeldung) – mit Steuerberater klären

## 2. Monetarisierungsmodelle

### Fair (bevorzugt)
Feste Euro-Preise, kein Zufall, keine Premiumwährung, Tageslauf und Challenge bleiben kauffrei, Käufer optional als „Unterstützer“ markiert.

- Unterstützer- bzw. Starterpaket (einmalig, z. B. 3–5 €)
- Dauerhafte Komfort- und Tempo-Boni: Kristalle ×2, längere Offline-Zeit (24 h → 48 h), zweites Auto-Kauf-Profil
- Kosmetik: Kanonen-Skins, Effekte, Profilrahmen

**Balancing-Simulation „Kristalle ×2 dauerhaft“** (Bot, 40 Läufe):

| | nach ca. 1,5 h | nach ca. 4,5 h |
|---|---|---|
| kostenlos | Rekord 50 | Rekord 84 |
| mit Kauf | Rekord ~77 | Rekord ~97 |

Früh deutlich schneller, später schrumpft der Abstand, weil Fusion und Bosse den Fortschritt bestimmen. Kostenlose Spieler fallen nicht dauerhaft zurück.

### Hart (Pay-to-win), nur zur Einordnung
- Premiumwährung (wenig kostenlos), Ausgaben für Fusion/Lager sofort, Zeitsprünge, Modulplätze, exklusive Module
- Zeitlich begrenzte Angebote, Saisonpass, belohnte Werbung
- Grob **3–5-facher Umsatz pro täglichem Spieler**, aber: Bestenliste verzerrt, Balancing bremst kostenlose Spieler absichtlich, schlechtere Bewertungen, hoher laufender Aufwand
- Rechtlich: Preise in Euro anzeigen, **keine bezahlten Zufallsinhalte** (Lootboxen), kein Kaufdruck auf Kinder

### Kämpfe gegeneinander (Ideen)
| Form | Aufwand | Bemerkung |
|---|---|---|
| Wochenliga (gleicher Lauf für alle, Auf- und Abstieg) | gering, baut auf dem Tageslauf auf | fair, stärkt Bindung – **empfohlener erster Schritt** |
| Asynchrone Angriffe (Flotte eines anderen Spielers) | mittel | sehr anfällig für P2W |
| Clans/Allianzen mit Boss-Raids | mittel bis hoch | erst bei genug Spielern |
| Live-Duell | hoch | nur mit gleicher Ausrüstung fair |

## 3. Einnahmen-Modell (Größenordnung, keine Prognose)

Annahmen aus öffentlichen Branchenberichten 2025/26:
- Bindung Branchenschnitt: Tag 1 25–30 %, Tag 7 10–15 %, Tag 30 3–6 % (sehr gut: 45 / 25 / 12 %)
- Umsatz pro täglichem Spieler (fairer Shop, USA): 0,015 / 0,035 / 0,07 $ (schwach / mittel / gut); Regionsfaktoren DACH 0,8, übriges Westeuropa 0,65, Lateinamerika 0,15, Indien/Südostasien 0,08
- Store-Gebühr 15 % (erste Million pro Jahr), in Europa zusätzlich Mehrwertsteuer
- Kosten pro Install über Werbung: USA 2,50 $, DACH 1,40 $, Westeuropa 1,00 $, Lateinamerika 0,25 $, Indien/Südostasien 0,10 $

**Ertrag pro Install im ersten Jahr (netto)**

| Szenario | Spieltage/Install | USA | DACH | Westeuropa | Lateinamerika | Indien/SOA |
|---|---|---|---|---|---|---|
| schwach | 6,6 | 0,08 $ | 0,06 $ | 0,05 $ | 0,01 $ | 0,01 $ |
| mittel | 12,9 | 0,38 $ | 0,26 $ | 0,21 $ | 0,05 $ | 0,03 $ |
| gut | 24,8 | 1,48 $ | 0,99 $ | 0,80 $ | 0,19 $ | 0,10 $ |

Rückfluss je Werbe-Euro: mittel 15–27 %, gut 59–80 % → **bezahlte Werbung trägt sich mit fairem Shop nicht.** Erst mit etwa dreifachem Umsatz pro Spieler (hartes Modell) und guter Bindung würde sie sich in USA/Europa knapp rechnen.

**Jahreseinnahmen bei organischen Installs** (Ländermix, 40 % USA/DACH)

| Installs/Jahr | schwach | mittel | gut |
|---|---|---|---|
| 5.000 | ~190 $ | ~850 $ | ~3.300 $ |
| 20.000 | ~740 $ | ~3.400 $ | ~13.000 $ |
| 100.000 | ~3.700 $ | ~17.000 $ | ~65.000 $ |

## 4. Wachstum ohne Werbebudget

Kosten: 25 $ Play-Konto, ca. 10–30 €/Jahr Domain.

- Reddit: r/incremental_games (Zielgruppe, Feedback), r/AndroidGaming, r/WebGames – ehrlich als Hobbyprojekt ohne P2W
- itch.io: Webversion kostenlos einstellen
- Store-Optimierung: Titel, Schlagworte („idle tower defense, no pay to win, offline“), gute Screenshots
- Kurze Clips (Wellensprung, Leviathan, Durchmarsch) für Shorts/TikTok
- Community halten: Bestenliste, Umfragen, Feedback mit Antwort (alles vorhanden)
- „Kein Pay-to-win“ als Stärke in einem von KI-Spielen überfluteten Markt

## 5. Nächste Schritte

1. Weiter testen; **Bindung messen** (Reiter „Bindung“, einige Wochen)
2. Domain, Datenschutzerklärung, Impressum
3. Android-Paket (TWA oder Capacitor), kostenlos ohne Käufe, geschlossener Test mit 12+ Testern über 14 Tage
4. Öffentlicher Start, organisch bewerben
5. Bei guter Bindung: fairen Shop konzipieren und simulieren; ggf. App in eine GmbH übertragen

## Quellen

- Play Billing in einer TWA: https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing
- Testpflicht für neue private Konten: https://support.google.com/googleplay/android-developer/answer/14151465
- Play-Gebühr 15 %: https://support.google.com/paymentscenter/answer/112622
- Bindungs-Benchmarks: https://appagent.com/blog/mobile-game-retention-benchmarks/
- Umsatz pro Spieler nach Genre: https://www.juegostudio.com/blog/arpdau-benchmarks-by-game-genre
- Kosten pro Install 2026: https://foxdata.com/en/blogs/2026-mobile-game-user-acquisition-cost-benchmarks-how-much-should-you-spend/
- Unternehmer-Status (DSA): https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq
