# Vorschlag: Elementarmagie

Stand: Entwurf, Runde 2. Noch nichts umgesetzt.

Änderungen gegenüber Runde 1:

- Freischaltung ab **Rekordwelle 50**.
- **Elementar-Erfahrung** kommt anders als beim Kommandanten nicht aus überstandenen Wellen, sondern aus dem, was das Element selbst bewirkt.
- Elementrang und Form werden im **Profil** angezeigt.
- Die Bäume bekommen **Formen**: Ab einer bestimmten Stelle im Baum verändert sich die Fähigkeit grundlegend, nicht nur ihre Zahlen.
- **Blitz ist raus**, weil sich der Kettenblitz mit dem Modul überschneidet. Kandidaten für das dritte Element stehen weiter unten.

## Problem

Ab der mittleren Phase bleibt im Lauf wenig zu tun: Ziel markieren, Orbitalschlag setzen, Stasis und Überladung auslösen. Es fehlt eine Aktion, die **oft** kommt und bei der es auf **Entscheidungen** ankommt.

## Idee

Ab Rekordwelle 50 wählt der Spieler ein Element. Jedes Element bringt genau eine neue manuelle Fähigkeit und hat einen eigenen Baum. Aktiv ist immer nur ein Element. Gewechselt wird kostenlos außerhalb eines Laufs; der Fortschritt jedes Elements bleibt erhalten, wächst aber nur, solange es aktiv ist.

Jedes Element stellt eine andere Frage:

| Element | Frage | Rolle |
| --- | --- | --- |
| Feuer | **Wo?** Platzieren auf dem Feld | Flächenschaden gegen Gruppen |
| Eis | **Wen?** Zielwahl, nutzt die Markierung | Kontrolle und Einzelziele, Bosse |
| drittes Element | siehe Kandidaten | eine dritte Rolle, z. B. Verteidigung oder Dauerbedienung |

Der Schaden ist immer ein Vielfaches des Kanonenschadens (`s.gunDmg`) und wächst so automatisch mit.

## Aufbau der Bäume: Stamm, Form, Schlussstein

Jeder Baum hat drei Ebenen:

1. **Stamm** (für alle Formen gleich, 3 Knoten, 8 Punkte): Schaden, Erholung, Wirkung. Damit lohnt jeder Punkt am Anfang.
2. **Form** (ab 4 Punkten im Stamm, genau eine wählbar): **verwandelt die Fähigkeit**, oft mit anderer Bedienung. Jede Form hat 3 eigene Knoten (6 Punkte).
3. **Schlussstein** der gewählten Form (ab 12 Punkten im Baum): eine starke Besonderheit.

Formwechsel ist außerhalb eines Laufs kostenlos; die Punkte in den Formknoten werden dabei zurückerstattet. So kann man ausprobieren, ohne etwas zu verlieren.

Bei 3 Formen je Element gibt es also 9 deutlich unterschiedliche Fähigkeiten, nicht 3.

## Feuer

**Stamm**

| Knoten | Stufen | Wirkung |
| --- | --- | --- |
| Glutkern | 3 | +20 % Feuerschaden je Stufe |
| Schnellzündung | 3 | −8 % Aufladezeit je Stufe |
| Zunder | 2 | Brandfelder halten +1,5 s je Stufe |

**Formen**

| Form | Bedienung | Wirkung | Knoten (je 2 Stufen) | Schlussstein |
| --- | --- | --- | --- | --- |
| **Feuerball** (Grundform) | Knopf, dann ins Feld tippen | Explosion R 50, 4× Kanonenschaden, Brandfeld 4 s. 2 Ladungen à 10 s | +1 Ladung · +15 % Radius · Übersprung (brennend sterbende Schiffe entzünden Nachbarn) | **Inferno:** überlappende Brandfelder addieren sich voll |
| **Flammenwand** | Knopf, dann im Feld **eine Linie ziehen** | Feuerwand bis 140 px Länge, 6 s. Schiffe, die sie durchfliegen, brennen 3 s (1× Kanonenschaden/s) und werden 30 % langsamer. 18 s Aufladung | +40 % Länge · +2 s Dauer · Hitzestau (Schiffe in der Wand nehmen je Sekunde +10 % mehr Schaden) | **Feuerring:** die Wand schließt sich auf Wunsch zum Kreis um eine Gruppe |
| **Meteor** | Knopf, dann ins Feld tippen; schlägt **nach 1,5 s** ein | 1 Ladung, 25 s Aufladung. 15× Kanonenschaden im Radius 70, betäubt 1 s, Krater brennt 5 s. Man muss vorhalten, wo die Schiffe in 1,5 s sind | −3 s Aufladung · +25 % Bossschaden · Splitterschauer (3 kleine Einschläge drumherum) | **Sternenfall:** jeder Meteor zieht 2 weitere auf die nächstdichten Gruppen nach |

**Verbindung zu bestehenden Systemen:** Brandminen und Nachbeben zählen als Feuer und profitieren von *Glutkern*.

## Eis

**Stamm**

| Knoten | Stufen | Wirkung |
| --- | --- | --- |
| Permafrost | 3 | +0,5 s Frostdauer je Stufe |
| Sprödigkeit | 3 | +10 % Schaden auf gefrorene Ziele je Stufe |
| Kälteschock | 2 | −1 s Abklingzeit je Stufe |

**Formen**

| Form | Bedienung | Wirkung | Knoten (je 2 Stufen) | Schlussstein |
| --- | --- | --- | --- | --- |
| **Frostlanze** (Grundform) | ein Tipp: trifft das **markierte** Ziel (sonst Boss oder stärkstes Schiff) | 3× Kanonenschaden, friert 3 s ein (Bosse: −50 % Tempo). Gefrorene Ziele nehmen +30 % Schaden und zersplittern beim Tod. 12 s | Eiskette (springt auf 1/2 weitere) · +40 % Splitterschaden · Kältesog (lädt während Stasis doppelt) | **Nullpunkt:** normale Schiffe unter 20 % LP zerspringen beim Einfrieren; jede 3. Lanze friert auch Bosse 1 s komplett |
| **Frostnova** | ein Tipp, wirkt **um die Kanone** | Kältewelle bis 120 px: 1,5× Kanonenschaden, friert normale Schiffe 2 s ein, Bosse −30 % Tempo. 16 s. Notbremse, wenn es eng wird | +25 % Radius · Raureif (Schiffe nahe der Mauer bleiben doppelt so lange gefroren) · Kalte Hülle (je gefrorenem Schiff 0,5 % Reparatur) | **Eiszeit:** zersplitternde Schiffe frieren Nachbarn 1 s ein, Kettenreaktionen möglich |
| **Eissturm** | Knopf, dann ins Feld tippen | Hagelfeld R 70 für 6 s: 0,8× Kanonenschaden/s, jede Sekunde im Feld +1 Kältestufe; bei 3 Stufen friert das Schiff 2 s ein. 20 s | +2 s Dauer · Treibeis (das Feld wandert langsam mit dem markierten Ziel) · Glatteis (Schiffe im Feld −20 % Tempo) | **Polarwirbel:** das Feld zieht Schiffe leicht zur Mitte |

**Verbindung zu bestehenden Systemen:** Vom Kryowerfer oder vom Modul Kältebruch verlangsamte Schiffe zählen für *Sprödigkeit* zur Hälfte als gefroren.

## Drittes Element: Kandidaten

Der Kettenblitz entfällt. Für das dritte Element sollte eine **Rolle** her, die Feuer und Eis nicht abdecken, und die Überschneidungen mit Modulen und Kommandant (Kettenblitz, Nova, Schwarzes Loch, Gift, Drohnen) vermeiden.

### A) Licht: Prismastrahl (Empfehlung)

*Frage: Wohin führe ich den Strahl?* Die einzige Fähigkeit mit **Dauerbedienung**. Sie zielt damit direkt auf das Problem, dass es im Lauf zu wenig zu tun gibt.

- Knopf gedrückt halten, dann mit dem Finger im Feld **den Strahl führen**. Er schießt von der Kanone zum Finger.
- Der Strahl macht 1,5× Kanonenschaden pro Sekunde, und zwar an **allen** Schiffen auf seiner Linie. Bleibt er auf demselben Schiff, steigt der Schaden alle 0,5 s um 10 % (bis +100 %).
- **Energie-Leiste:** Der Strahl hält 4 s und lädt in 12 s wieder voll. Man kann ihn auch kurz und gezielt einsetzen.
- Ohne Finger (Knopf antippen oder Autopilot) richtet er sich selbst auf das markierte Ziel, aber mit halbem Schaden.
- Formen:
  - **Prismastrahl** (Grundform, wie oben).
  - **Brennglas**: fester Fokus auf das markierte Ziel, der Schaden steigt viel stärker (bis +300 %). Für Bosse.
  - **Spiegelfeld**: Man tippt bis zu drei Spiegel ins Feld; der Strahl wird über sie gelenkt und kann so Umwege durch Gruppen nehmen.

### B) Erde: Kristallsäule

*Frage: Wo blocke ich?* Die **defensive** Rolle, die bisher nur passiv im Bollwerk-Ast existiert.

- Tipp ins Feld setzt eine Säule. Schiffe, die auf sie treffen, bleiben stehen und schießen auf sie (wie am Schutzwall). Die Säule hat 20 % der Hülle als Lebenspunkte und hält 10 s.
- Formen:
  - **Bollwerk-Säule**: blockt wie oben.
  - **Dornensäule**: wirft Schaden zurück.
  - **Geysir**: stößt Schiffe nach oben zurück (Rückstoß).
- Eingriff in die Bewegung der Gegner: etwas aufwendiger umzusetzen, aber spielerisch sehr eigenständig.

### C) Wind: Sturmbö

*Frage: In welche Richtung?* **Wischen** als neue Geste.

- Wischen im Feld schiebt alle Schiffe in einem Streifen in Wischrichtung, mit wenig Schaden.
- Zurückschieben verschafft Zeit; seitlich zusammenschieben gruppiert Gegner für Orbitalschlag, Minen und Bombardement.
- Stark als Begleiter der übrigen Waffen, schwach allein. Für Spieler, die gern kombinieren.

### D) Zeit: Chronoriss

*Frage: Wann?* Ein Riss, in dem die Zeit rückwärts läuft: Schiffe darin werden 3 s zurückgespult, also auf ihre Position von vor 3 s gesetzt, und erleiden den in dieser Zeit erlittenen Schaden noch einmal.

- Einzigartig, aber nah an Stasis und am Modul Echo. Eher als spätes viertes Element denkbar.

**Empfehlung:** **Licht** als drittes Element. Es fügt die einzige neue Eingabeform mit Dauerbedienung hinzu, löst das Ausgangsproblem am direktesten und lässt sich ohne Eingriff in die Gegnerbewegung bauen. **Erde** käme später als viertes Element, wenn das System läuft.

## Fortschritt: Elementar-Erfahrung (anders als beim Kommandanten)

Der Kommandant wächst durch Durchhalten (überstandene Wellen). Das Element soll durch **Einsetzen** wachsen:

- **Erfahrung durch Wirkung:** Jedes Schiff, das durch die Elementfähigkeit zerstört wird oder in den 3 s davor von ihr getroffen wurde, gibt Erfahrung (`1 + Welle / 50`, Bosse ×20). Wer das Element nicht einsetzt, bekommt nichts.
- **Von Hand zählt doppelt:** Was der Autopilot auslöst, bringt nur die Hälfte.
- **Elementproben:** Je Element etwa 8 einmalige Aufgaben mit großem Erfahrungsbonus. Sie zeigen nebenbei, was die Formen können, zum Beispiel:
  - Feuer: „12 Schiffe mit einem Feuerball“, „Boss mit einem Meteor erledigt“, „30 Schiffe durch eine Flammenwand“.
  - Eis: „20 Schiffe zersplittert in einer Welle“, „Heiler eingefroren, bevor er heilt“, „Frostnova rettet die Hülle unter 10 %“.
- Rangkurve: `300 × 1,2^r`. Ein Rang gibt einen Punkt, mit 20 Punkten ist der Baum voll (8 Stamm, 6 Form, 1 Schlussstein, dazu 5 Reserve, damit man bei einem Formwechsel nicht bei null anfängt).
- Danach eine **Meisterschaft**: je weiterem Rang +3 % Elementschaden, ohne Obergrenze.
- Ränge und Bäume überdauern die Fusion.

## Anzeige im Profil

- **Eigenes Profil:** eine Karte „Elemente“ mit den drei Elementen. Für jedes: Rang, Erfahrungsbalken, gewählte Form und erledigte Elementproben. Das aktive Element ist hervorgehoben.
- **Öffentliche Profilkarte** (`publicCard()` in `game.js`): aktives Element, Form und Rang, zum Beispiel „🔥 Meteor · Rang 14“.
- **Bestenliste und Online-Liste:** ein kleines Elementsymbol neben dem Kommandantenrang.
- Profil-Statistik: Elementarschaden insgesamt und meistgenutzte Form.

## Bedienung im Lauf

- Ein **vierter Knopf** in der Fähigkeitsleiste, in der Farbe des Elements (Feuer orange, Eis hellblau, Licht weiß-gold), dazu Taste `4`.
- Die Anzeige am Knopf hängt von der Form ab: Ladungen als Punkte, Abklingzeit als Ring, Licht als Energie-Leiste.
- Neue Gesten: **Linie ziehen** (Flammenwand) und **Halten und führen** (Licht). Am Desktop jeweils mit gedrückter Maus.
- Beim ersten Lauf mit einer neuen Form erklärt ein kurzer Tipp (`tips`) die Bedienung.

## Andere Modi

- **Autopilot / Nachrechnen:** einfache Regeln je Form in `autopilot()`, bewusst schwächer als aktives Spiel; dazu die halbe Erfahrung.
- **Tageslauf:** kein eigenes Element. Neue Besonderheit „Elementtag“: Element und Form sind für alle vorgegeben, mit festem Baum.
- **Herausforderungen:** Das Element wirkt, außer bei „Nur Minen“. Später vielleicht eine eigene Herausforderung „Nur Elemente“.
- **Ergebnis nach dem Lauf:** neue Schadensquelle `'elem'` in `SOURCES`.

## Balancing-Ziel

- Aktiv gespielt sollte das Element **15–20 % des Gesamtschadens** liefern, mit dem Autopilot **8–10 %**.
- Die Formen sollen etwa gleich stark sein, aber verschieden glänzen: Feuerball und Eissturm gegen Schwärme, Meteor und Frostlanze gegen Bosse, Flammenwand und Frostnova bei Druck auf die Mauer.
- Messen mit `tools/shares.js` (je Form ein Durchlauf, dazu ein „aktiver“ Bot) und `tools/check.js`.

## Umsetzung (grob)

| Datei | Was |
| --- | --- |
| `core.js` | `ELEMENTS` mit Formen, `ELEM_SKILLS` (Stamm/Form/Schlussstein), Erfahrung, Rang und Proben je Element, `GATES`/`ROADMAP` (Welle 50), im `Run`: `useElement(...)`, Wirkungen in `skillTick`, Einfrieren (`frozenUntil`) in Bewegung und `hurt()`, Quelle `'elem'`, Zählung „vom Element getroffen“ für die Erfahrung |
| `game.js` | vierter Knopf, Gesten (tippen, Linie ziehen, halten und führen), Reiter „Elemente“ im Kommandanten-Fenster, Profilkarte, `publicCard()`, Speichern in `meta.elem = { act, form: {}, xp: {}, sk: {}, probes: {} }`, Autopilot, Tipps |
| `render.js` | Effekte je Form, Knopfanzeige |
| `audio.js` | Klänge je Form |
| `online.js`, `supabase/` | Element im Profil und in der Bestenliste (steht schon in `card`, ggf. ohne Migration) |
| `i18n-en.js` | alle neuen Texte |
| `tools/` | `shares.js` und `check.js` erweitern |
| `sw.js`, `core.js` | `VERSION` erhöhen |

Reihenfolge:

1. **Phase 1:** Wahl, Feuer und Eis jeweils mit Stamm und Grundform (Feuerball, Frostlanze), Elementar-Erfahrung, Anzeige im Profil.
2. **Phase 2:** die übrigen Formen und Schlusssteine von Feuer und Eis, Elementproben.
3. **Phase 3:** drittes Element (Licht), Elementtag im Tageslauf.

## Offene Fragen

1. **Drittes Element:** Licht (Empfehlung), Erde, Wind oder Zeit?
2. **Formwechsel:** jederzeit außerhalb eines Laufs kostenlos, oder einmal pro Tag kostenlos, damit die Wahl mehr Gewicht hat?
3. **Elementproben:** Reichen sie als Zusatz zur Erfahrung, oder sollen sie zusätzlich etwas freischalten, zum Beispiel die Schlusssteine?
