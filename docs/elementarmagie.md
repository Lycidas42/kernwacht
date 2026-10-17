# Vorschlag: Elementarmagie

Stand: Entwurf, noch nichts umgesetzt.

## Problem

Ab der mittleren Phase bleibt im Lauf wenig zu tun: Ziel markieren, Orbitalschlag setzen, Stasis und Überladung auslösen. Die beiden Fähigkeiten haben 25 bis 45 s Abklingzeit und der Autopilot (`autopilot()` in `game.js`) bedient alle drei ordentlich. Es fehlt eine Aktion, die **oft** kommt und bei der es auf **Entscheidungen** ankommt, nicht nur auf „Knopf leuchtet, Knopf drücken“.

## Idee in einem Satz

Ab Rekordwelle 60 wählt der Spieler ein Element: **Feuer, Eis oder Blitz**. Jedes Element bringt genau eine neue manuelle Fähigkeit und hat einen eigenen kleinen Skilltree. Aktiv ist immer nur ein Element.

Die drei Elemente sollen sich nicht nur in der Optik unterscheiden, sondern in der **Frage, die sie dem Spieler stellen**:

| Element | Fähigkeit | Die Frage | Rhythmus |
| --- | --- | --- | --- |
| Feuer | Feuerball | **Wo?** Platzieren auf dem Feld | 2 Ladungen, je 10 s |
| Eis | Frostlanze | **Wen?** Welches Ziel (nutzt die Markierung) | 12 s Abklingzeit |
| Blitz | Kettenblitz | **Wann?** Im richtigen Takt auslösen | 6 s Abklingzeit, Takt-Bonus |

Damit gibt es je nach Spielstil eine passende Wahl, und das Markieren bekommt beim Eis eine zweite Bedeutung.

## Die drei Fähigkeiten

Schaden immer als Vielfaches des Kanonenschadens (`s.gunDmg`), wie bei Ladeschuss, Bombardement und Co. Dadurch wächst er automatisch mit Labor, Fusion und Modulen mit und braucht keine eigene Skalierung.

### Feuer: Feuerball

- Antippen des Knopfs macht ihn scharf, dann ins Feld tippen (gleicher Ablauf wie beim Orbitalschlag, `armed = 'elem'`). Langes Drücken setzt ihn automatisch auf die dichteste Gruppe (`strikeTarget()` wiederverwenden).
- Explosion mit Radius 50: **4× Kanonenschaden**.
- Hinterlässt ein **Brandfeld** für 4 s mit 0,6× Kanonenschaden pro Sekunde (vorhandenes `this.fires` nutzen).
- **2 Ladungen**, jede lädt in 10 s nach. Man kann also zwei auf einmal werfen oder sie verteilt einsetzen.

### Eis: Frostlanze

- Ein Tipp auf den Knopf schießt auf das **markierte Ziel**. Ohne Markierung: Boss, sonst das Schiff mit den meisten Lebenspunkten in Reichweite.
- **3× Kanonenschaden**, das Ziel ist 3 s **eingefroren** (Bosse: 3 s um 50 % verlangsamt).
- Eingefrorene Ziele erleiden **+30 % Schaden** aus allen Quellen.
- Stirbt ein eingefrorenes Ziel, **zersplittert** es: 1,5× Kanonenschaden im Umkreis 45, die Splitter verlangsamen 2 s.
- 12 s Abklingzeit.
- Der Reiz liegt in der Zielwahl: Heiler (Sektor 5) einfrieren, einen Bomber kurz vor der Mauer stoppen, den Boss in seiner gefährlichen Phase bremsen oder ein zähes Schiff in einer Gruppe einfrieren und dann zersplittern lassen.

### Blitz: Kettenblitz

- Ein Tipp auf den Knopf: Blitz springt vom Turm auf das nächste Schiff und dann auf 4 weitere. Jeweils **2× Kanonenschaden**, je Sprung 15 % weniger.
- 6 s Abklingzeit.
- **Spannung (Takt-Mechanik):** Wird der Blitz innerhalb von **1,5 s, nachdem er bereit ist**, ausgelöst (der Knopf pulsiert in diesem Fenster), steigt die Spannung um 1, bis höchstens 10. Jede Stufe gibt +8 % Blitzschaden, bei 5 und 10 kommt je ein Sprung dazu.
- Wer das Fenster verpasst, verliert nicht alles: Die Spannung fällt um 1 je 3 s, die der Blitz ungenutzt bereit ist. Wer kurz wegschaut, wird also nicht hart bestraft.
- Das ist bewusst das Element für aktive Spieler: Kleine, häufige Entscheidungen mit spürbarer Belohnung für Aufmerksamkeit.

## Die Skilltrees

Gleiches Muster wie beim Kommandanten (`SKILLS` mit `par`, `max`, `cap`), damit Logik und Darstellung wiederverwendet werden können: je Element 7 Knoten mit zusammen 14 Punkten, dazu 2 Schlusssteine, von denen einer gewählt wird (ab 10 Punkten im Baum). Jeder Baum hat Knoten für Schaden, schnellere Erholung, Wirkung, eine eigene Mechanik und eine Verbindung zu bestehenden Systemen.

### Feuer

| Knoten | Stufen | Wirkung |
| --- | --- | --- |
| Glutkern | 3 | +20 % Feuerballschaden je Stufe |
| Schnellzündung | 3 | −8 % Aufladezeit je Stufe |
| Zunder | 2 | Brandfeld hält +2 s je Stufe |
| Flächenbrand | 2 | +15 % Radius von Explosion und Brandfeld je Stufe |
| Dritte Ladung | 1 | +1 Ladung |
| Übersprung | 2 | Schiffe, die brennend sterben, entzünden ein kleines Brandfeld (25 % / 50 % Stärke) |
| Glutnetz | 1 | Alle Felder (Brandminen, Nachbeben) machen +25 % Schaden |
| **Schlussstein: Meteor** | – | Jeder 3. Feuerball wird ein Meteor: 3× Schaden, doppelter Radius, betäubt 1 s |
| **Schlussstein: Inferno** | – | Überlappende Brandfelder addieren ihren Schaden vollständig statt nebeneinander zu wirken (+50 % je Überlappung) |

### Eis

| Knoten | Stufen | Wirkung |
| --- | --- | --- |
| Permafrost | 3 | +0,5 s Frostdauer je Stufe |
| Sprödigkeit | 3 | +10 % Schaden auf eingefrorene Ziele je Stufe |
| Kälteschock | 3 | −1 s Abklingzeit je Stufe |
| Splitterregen | 2 | +40 % Splitterschaden und +15 % Radius je Stufe |
| Eiskette | 2 | Die Lanze springt auf 1 / 2 weitere Schiffe (halbe Frostdauer) |
| Kältesog | 1 | Während Stasis lädt die Frostlanze doppelt so schnell |
| Gefrierpunkt | 1 | Vom Kryowerfer oder Kältebruch verlangsamte Ziele zählen für Sprödigkeit zur Hälfte als eingefroren |
| **Schlussstein: Nullpunkt** | – | Normale Schiffe unter 20 % Lebenspunkten zerspringen sofort beim Einfrieren; jede 3. Lanze friert auch Bosse 1 s ganz ein |
| **Schlussstein: Eiszeit** | – | Zersplittern friert die Schiffe im Umkreis 1 s ein, Kettenreaktionen sind möglich |

### Blitz

| Knoten | Stufen | Wirkung |
| --- | --- | --- |
| Hochspannung | 3 | +20 % Blitzschaden je Stufe |
| Kondensator | 3 | −0,5 s Abklingzeit je Stufe |
| Leitfähigkeit | 2 | +1 Sprung je Stufe |
| Gleichtakt | 2 | Takt-Fenster +0,5 s je Stufe |
| Erdung | 1 | Spannung fällt halb so schnell |
| Ionisierung | 2 | Getroffene Schiffe erleiden 3 s lang +8 % Schaden je Stufe |
| Gewitterfront | 1 | Während Überladung halbe Abklingzeit des Blitzes |
| **Schlussstein: Gewitter** | – | Bei voller Spannung schlägt jeder Takt-Treffer zusätzlich dreimal in zufällige Schiffe ein (je 2× Kanonenschaden) |
| **Schlussstein: Supraleiter** | – | Spannung fällt nie mehr, ist dafür auf 6 begrenzt; Blitz löst bei 6 Spannung automatisch im Takt aus |

Der Blitz bekommt damit absichtlich einen Schlussstein für Präzision (Gewitter) und einen für entspanntes Spielen (Supraleiter).

## Fortschritt: Elementrang

- Jedes Element hat **eigene Erfahrung und eigene Ränge**, ein Rang gibt einen Punkt im Baum dieses Elements. Erfahrung gibt es für jede überstandene Welle, in der das Element aktiv war (gleiche Formel wie beim Kommandanten, `xpFor(w)`).
- **Bonus für aktives Spielen:** ×1,5 Erfahrung für Wellen, in denen die Fähigkeit mindestens zweimal von Hand ausgelöst wurde. Das belohnt genau das Verhalten, das das Feature fördern soll, sperrt Autopilot-Spieler aber nicht aus.
- Ränge und Bäume **überdauern die Fusion** (wie der Kommandant).
- Mit Rang 15 ist ein Baum voll. Danach kann eine kleine Meisterschaft folgen (z. B. +3 % Elementschaden je Rang), damit Erfahrung nie wertlos wird.
- Vorschlag Rangkurve: `500 × 1,18^r`. So kommt der erste Punkt schon im ersten Lauf, und volle Bäume brauchen einige Wochen.

## Wahl und Wechsel

- Freischaltung bei **Rekordwelle 60**, also kurz nach der ersten Fusion, wenn Kommandant und Labor schon bekannt sind. Neuer Eintrag in `ROADMAP` und `GATES`.
- Gewählt wird im Kommandanten-Fenster auf einem neuen Reiter **„Elemente“**: drei Karten, eine davon aktiv, darunter der Baum des gerade angesehenen Elements.
- Wechseln geht **nur außerhalb eines Laufs und ist kostenlos**. Der Fortschritt jedes Elements bleibt erhalten, man levelt aber nur das aktive. Wer wechselt, verliert also nichts, fängt beim neuen Element aber unten an. Das macht die Wahl bedeutsam, ohne dass sie endgültig ist.
- Punkte in einem Baum lassen sich wie beim Kommandanten außerhalb des Laufs kostenlos zurücksetzen.

## Bedienung im Lauf

- Ein **vierter Knopf** in der Fähigkeitsleiste, in der Farbe des Elements (Feuer orange, Eis hellblau, Blitz violett). Taste `4`.
- Feuer: wie der Orbitalschlag (scharf machen, ins Feld tippen; lang drücken setzt ihn automatisch). Eis und Blitz: ein Tipp genügt.
- Anzeige am Knopf: Feuer zeigt die Ladungen als Punkte, Eis die Abklingzeit, Blitz die Spannung als Ring und pulsiert im Takt-Fenster.
- Neuer Tipp beim ersten Lauf mit Element (`tips`), z. B. für Blitz: „Löse den Blitz aus, sobald er pulsiert, das baut Spannung auf.“

## Andere Modi

- **Autopilot / Nachrechnen:** einfache Regeln in `autopilot()`. Feuerball auf die dichteste Gruppe, sobald eine Ladung voll ist; Frostlanze auf Boss oder stärkstes Schiff; Blitz sofort bei Bereitschaft, aber ohne Takt-Bonus. Damit liegt der Autopilot spürbar unter aktivem Spiel.
- **Tageslauf:** feste Ausrüstung, daher kein eigenes Element. Neue Tages-Besonderheit „Elementtag“ mit einem vorgegebenen Element samt festem halben Baum für alle.
- **Herausforderungen:** Element wirkt, außer bei „Nur Minen“ (dort gesperrt wie die anderen Schadensquellen). Optional später eine eigene Herausforderung „Nur Elemente“.
- **Ergebnis nach dem Lauf:** neue Schadensquelle `'elem'` in `SOURCES`, damit der Anteil in der Schadensübersicht erscheint.

## Balancing-Ziel

- Aktiv gespielt sollte das Element **15–20 % des Gesamtschadens** liefern, mit dem Autopilot etwa **8–10 %**. So lohnt es sich spürbar, ist aber nicht Pflicht.
- Die drei Elemente sollen bei aktivem Spiel etwa gleich stark sein, aber unterschiedlich glänzen: Feuer gegen Schwärme, Eis gegen Bosse und Heiler, Blitz bei konstant vielen Gegnern.
- Messen mit `tools/shares.js` (erweitern um ein Element pro Durchlauf und einen „aktiven“ Bot, der im Takt auslöst) und `tools/check.js`, damit sich die Fortschrittskurve nicht zu stark verschiebt. Falls doch, eher den Grundschaden senken als die Gegner anpassen.

## Umsetzung (grob)

| Datei | Was |
| --- | --- |
| `core.js` | `ELEMENTS` (Grundwerte), `ELEM_SKILLS` im Format von `SKILLS`, Rang/Punkte je Element, `GATES`/`ROADMAP`, im `Run`: `elemCd`, `elemCharges`, `tension`, `useElement(x, y)`, Effekte in `skillTick`, Einfrieren (`frozenUntil`) in der Bewegung und in `hurt()`, Quelle `'elem'` |
| `game.js` | vierter Knopf, `armed = 'elem'`, Taste `4`, Reiter „Elemente“, Speichern in `meta.elem = { act, xp: {fire, ice, bolt}, sk: {} }`, Autopilot, Tipps |
| `render.js` | Feuerball, Brandfeld in Elementfarbe, Eisblock und Splitter, Blitzketten, pulsierender Knopf |
| `audio.js` | drei neue Effekte |
| `i18n-en.js` | alle neuen Texte |
| `tools/` | `shares.js` und `check.js` um Elemente erweitern |
| `sw.js`, `core.js` | `VERSION` erhöhen |

Vorschlag für die Reihenfolge:

1. **Phase 1:** Wahl, die drei Fähigkeiten in Grundform, Elementrang, je Baum die ersten 4 Knoten. Damit lässt sich schnell testen, ob sich das Spielgefühl verbessert.
2. **Phase 2:** restliche Knoten, Schlusssteine, Synergien mit Kommandant und Modulen.
3. **Phase 3:** Elementtag im Tageslauf, Herausforderung „Nur Elemente“, Erfolg „Elementarmeister“.

## Offene Fragen

1. **Währung für die Bäume:** Elementrang aus Erfahrung (wie oben) oder Erz aus dem Bergbau (Kryokristall für Eis, Plasmaerz für Feuer, Sternenstaub für Blitz)? Erz würde den Bergbau stärker einbinden, Erfahrung belohnt dagegen das Spielen mit dem Element selbst. Mein Vorschlag: Erfahrung für Punkte, Erz eventuell später für die Meisterschaft.
2. **Freischaltung:** Rekordwelle 60 oder erst mit der ersten Fusion?
3. **Wechsel mitten im Lauf:** bewusst ausgeschlossen. Passt das?
4. **Takt-Mechanik beim Blitz:** Ist das zu fordernd fürs Idle-Publikum? Der Schlussstein Supraleiter ist als Ausweg gedacht.
