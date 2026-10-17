# Vorschlag: Elementarmagie

Stand: Phase 1 ist umgesetzt (Version 0.31.0). Phase 2 und 3 sind noch offen. Die defensive Ausrichtung von Eis (Frostnova) kommt mit Phase 2.

## Umsetzung Phase 1 (0.31.0)

Umgesetzt:

- Wahl eines Elements ab Rekordwelle 50 (Menü → Kanone → Elemente), kostenloser Wechsel außerhalb des Laufs.
- Feuer, Eis und Licht mit Stamm (3 Knoten, 8 Punkte) und Grundform samt ihren Knoten (3 Knoten, 6 Punkte): Feuerball, Frostlanze, Prismastrahl. Die übrigen Formen sind als „folgt bald“ sichtbar.
- Der Baum ist ein echter Baum mit Sternkarte wie beim Kommandanten (0.31.2): Kern oben, darunter der Stamm (Wurzelknoten, der sich in zwei Äste gabelt), dann eine Schwelle (4 Punkte im Stamm) zu den drei Formsternen. Unter der gewählten Form wieder ein Wurzelknoten mit zwei Ästen; dort hängen in Phase 2 die Schlusssteine. Jeder Knoten braucht seinen Vorgänger, Zurücknehmen geht nur, wenn nichts darauf aufbaut. Antippen zeigt Beschreibung, nächste Stufe und Voraussetzung.

  | Element | Stamm: Wurzel → Äste | Grundform: Wurzel → Äste |
  | --- | --- | --- |
  | Feuer | Glutkern → Schnellzündung, Zunder | Munitionslager → Flächenbrand, Übersprung |
  | Eis | Permafrost → Sprödigkeit, Kälteschock | Eiskette → Splitterregen, Kältesog |
  | Licht | Bündelung → Lichtspeicher, Sonnenzelle | Glühen → Breitband, Blendung |
- Jeder Knoten und jede Form hat im Spiel eine Beschreibung und eine Erklärung der Bedienung.
- Elementar-Erfahrung durch Wirkung, Rang und Punkte je Element, Meisterschaft (×1,03 Elementschaden je Rang über dem vollen Baum).
- Vierter Knopf im Lauf (Taste 4), Autopilot-Regeln, Tipps beim ersten Einsatz, Meldung bei neuem Rang.
- Anzeige im eigenen Profil und auf der öffentlichen Profilkarte.
- Schadensquelle „Element“ im Werte-Tab und in den Schadensanteilen nach dem Lauf.
- `tools/elements.js` misst Schadensanteil und Erfahrung je Element.

Abweichungen vom Entwurf, nach Messung mit `tools/elements.js`:

- **Feuerball** offensiver: 6× statt 4× Kanonenschaden, Brandfeld 0,9× statt 0,6× pro Sekunde (0.31.1).

- **Frostlanze** stärker als geplant: 6× statt 3× Kanonenschaden, 8 s statt 12 s Abklingzeit, eingefrorene Ziele +40 % statt +30 % Schaden, Splitter 2× statt 1,5×. Der Mehrschaden auf eingefrorene Ziele zählt als Elementschaden.
- **Feuerball:** Statt „Dritte Ladung“ (1 Stufe) gibt es „Munitionslager“ mit 2 Stufen (+1 Ladung je Stufe).
- **Erfahrung:** Eis und Licht treffen weniger Schiffe und bekommen deshalb einen Ausgleich (Eis ×2, Licht ×1,6). Rangkurve `300 × 1,2^r`. Gegenüber dem Entwurf: 14 Punkte für einen vollen Baum statt 20, kein Reservepool.
- **Licht, Bedienung:** Statt Knopf halten und mit einem zweiten Finger führen: Knopf antippen schaltet den Strahlmodus ein, dann mit einem Finger im Feld führen. Das geht auf dem Handy mit einer Hand. Lange auf den Knopf drücken startet den selbstzielenden Strahl.

Messung (Rekord 160, 4 Fusionen, 6 Läufe je Variante, 14 Punkte im Baum). Der aktive Bot zielt wie ein Spieler: Feuerball in die dichteste Gruppe, Frostlanze auf die nächste Gefahr nahe der Mauer (sonst Boss), Strahl auf die dichteste Gruppe. Hüllenschaden ist der erlittene Schaden pro Sekunde bis kurz vor dem Ende, verglichen mit einem Lauf ohne Element.

| Element | Anteil aktiv | Anteil Autopilot | Hüllenschaden aktiv | Erfahrung je Welle aktiv |
| --- | --- | --- | --- | --- |
| Feuer | 25 % | 25 % | −45 % | 26 |
| Eis | 12 % | 8 % | −36 % | 28 |
| Licht | 16 % | 7 % | −15 % | 22 |

Feuer ist bewusst das offensive Element (Feuerball 6× statt 4× Kanonenschaden, Brandfeld 0,9× statt 0,6× pro Sekunde). Eis zahlt sich zusätzlich über verhinderten Hüllenschaden aus. In der Simulation schützt allerdings auch Feuer stark, weil schnell zerstörte Schiffe keinen Schaden mehr machen. Die klar defensive Form soll in Phase 2 die Frostnova werden. Beim Feuer wirft der Autopilot so gut wie der Bot, weil beide in die dichteste Gruppe zielen; der Autopilot greift nur beim Nachrechnen im Hintergrund.

Erfahrungsausgleich: Eis ×2, Licht ×1,6 (Feuer ×1).

## Problem

Ab der mittleren Phase bleibt im Lauf wenig zu tun: Ziel markieren, Orbitalschlag setzen, Stasis und Überladung auslösen. Es fehlt eine Aktion, die **oft** kommt und bei der es auf **Entscheidungen** ankommt.

## Idee

Ab Rekordwelle 50 wählt der Spieler ein Element. Jedes Element bringt genau eine neue manuelle Fähigkeit und hat einen eigenen Baum. Aktiv ist immer nur ein Element. Element und Form lassen sich jederzeit außerhalb eines Laufs kostenlos wechseln; der Fortschritt jedes Elements bleibt erhalten, wächst aber nur, solange es aktiv ist.

Jedes Element stellt eine andere Frage:

| Element | Frage | Rolle |
| --- | --- | --- |
| Feuer | **Wo?** Platzieren auf dem Feld | Flächenschaden gegen Gruppen |
| Eis | **Wen?** Zielwahl, nutzt die Markierung | Kontrolle und Einzelziele, Bosse |
| Licht | **Wohin?** Strahl mit dem Finger führen | Dauerbedienung, Durchschlag und Bosse |

Der Schaden ist immer ein Vielfaches des Kanonenschadens (`s.gunDmg`) und wächst so automatisch mit.

## Aufbau der Bäume: Stamm, Form, Schlussstein

Jeder Baum hat drei Ebenen:

1. **Stamm** (für alle Formen gleich, 3 Knoten, 8 Punkte): Schaden, Erholung, Wirkung. Damit lohnt jeder Punkt am Anfang.
2. **Form** (ab 4 Punkten im Stamm, genau eine wählbar): **verwandelt die Fähigkeit**, oft mit anderer Bedienung. Jede Form hat 3 eigene Knoten (6 Punkte).
3. **Schlussstein** der gewählten Form (ab 12 Punkten im Baum): eine starke Besonderheit.

Formwechsel ist jederzeit außerhalb eines Laufs kostenlos; die Punkte in den Formknoten werden dabei zurückerstattet. So kann man ausprobieren, ohne etwas zu verlieren.

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

## Licht

*Frage: Wohin führe ich den Strahl?* Die einzige Fähigkeit mit **Dauerbedienung**.

**Grundmechanik**

- Den Knopf gedrückt halten und mit dem Finger im Feld den Strahl führen. Der Strahl geht von der Kanone zum Finger. Am Desktop geht das mit gedrückter Maus.
- **Energie-Leiste:** Der Strahl hält 4 s und lädt in 12 s wieder voll. Er lässt sich jederzeit loslassen, auch für kurze, gezielte Stöße. Der Rest bleibt erhalten.
- Ohne Finger (Knopf antippen oder Autopilot) richtet sich der Strahl selbst auf das markierte Ziel, ohne Markierung auf den Boss oder das stärkste Schiff. Dann wirkt er mit halbem Schaden.
- Der Strahl ist hell und gut sichtbar, verdeckt aber keine Bomben und keine Bossangriffe (Darstellung halbtransparent).

**Stamm**

| Knoten | Stufen | Wirkung |
| --- | --- | --- |
| Bündelung | 3 | +20 % Lichtschaden je Stufe |
| Lichtspeicher | 3 | +0,5 s Strahldauer je Stufe |
| Sonnenzelle | 2 | −1,5 s Ladezeit je Stufe |

**Formen**

| Form | Bedienung | Wirkung | Knoten (je 2 Stufen) | Schlussstein |
| --- | --- | --- | --- | --- |
| **Prismastrahl** (Grundform) | halten und führen | 1,5× Kanonenschaden pro Sekunde an **allen** Schiffen auf der Linie. Bleibt der Strahl auf demselben Schiff, steigt der Schaden alle 0,5 s um 10 % (bis +100 %) | Glühen (+50 % höchster Aufbau) · Breitband (+40 % Strahlbreite) · Blendung (getroffene Schützen und Heiler setzen 1 s aus) | **Fächer:** der Strahl teilt sich am Ende in 3 Strahlen |
| **Brennglas** | ein Tipp, hält dann **selbst** auf das markierte Ziel | ein dünner Strahl, nur ein Ziel. Der Schaden steigt alle 0,5 s um 25 % (bis +300 %). Wechselt man die Markierung, beginnt der Aufbau neu. Gegen Bosse | Hitzepunkt (Aufbau beginnt bei +50 %) · Nachglühen (Aufbau bleibt nach dem Ende 3 s erhalten) · Schwachstelle (das Ziel nimmt während des Strahls +15 % Schaden aus allen Quellen) | **Sonnenfeuer:** bei vollem Aufbau explodiert das Ziel beim Tod und überträgt halben Aufbau aufs nächste |
| **Spiegelfeld** | bis zu 3 Spiegel ins Feld tippen, dann halten | der Strahl läuft von der Kanone über die Spiegel. So nimmt er Umwege durch Gruppen. 1,2× Kanonenschaden pro Sekunde, Spiegel halten 15 s | +1 Spiegel · Brechung (+20 % Schaden je Spiegel, über den der Strahl läuft) · Linsen (Spiegel schießen selbst einen kurzen Strahl aufs nächste Schiff, 0,3× pro Sekunde) | **Lichtkäfig:** schließt der Strahl einen Kreis über die Spiegel, sind Schiffe darin 2 s gefangen |

**Verbindung zu bestehenden Systemen:** Während Überladung lädt die Energie-Leiste doppelt so schnell. Ein vom Leitstrahl (Kommandant) markiertes Ziel übernimmt das Brennglas sofort.

## Fortschritt: Elementar-Erfahrung (anders als beim Kommandanten)

Der Kommandant wächst durch Durchhalten (überstandene Wellen). Das Element soll durch **Einsetzen** wachsen:

- **Erfahrung durch Wirkung:** Jedes Schiff, das durch die Elementfähigkeit zerstört wird oder in den 3 s davor von ihr getroffen wurde, gibt Erfahrung (`1 + Welle / 50`, Bosse ×20). Wer das Element nicht einsetzt, bekommt nichts.
- **Von Hand zählt doppelt:** Was der Autopilot auslöst, bringt nur die Hälfte.
- **Elementproben:** Je Element etwa 9 einmalige Aufgaben, drei je Form. Jede gibt einmalig **viel Elementar-Erfahrung**, etwa einen bis drei Ränge auf der jeweiligen Höhe, und schaltet sonst nichts frei. Sie zeigen nebenbei, was die Formen können, zum Beispiel:
  - Feuer: „12 Schiffe mit einem Feuerball“, „Boss mit einem Meteor erledigt“, „30 Schiffe durch eine Flammenwand“.
  - Eis: „20 Schiffe zersplittert in einer Welle“, „Heiler eingefroren, bevor er heilt“, „Frostnova rettet die Hülle unter 10 %“.
  - Licht: „8 Schiffe mit einem Strahl getroffen“, „Brennglas auf vollem Aufbau gegen einen Boss“, „Lichtkäfig mit 10 Schiffen“.
- Belohnung der Proben: fester Betrag nach Stufe der Probe (leicht/mittel/schwer: 500 / 2000 / 6000 Erfahrung). So können neue Spieler eines Elements schnell aufholen.
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
- Die Formen sollen etwa gleich stark sein, aber verschieden glänzen: Feuerball, Eissturm und Prismastrahl gegen Schwärme, Meteor, Frostlanze und Brennglas gegen Bosse, Flammenwand, Frostnova und Spiegelfeld bei Druck auf die Mauer.
- Licht wird mit dem Finger geführt, also bekommt der Autopilot nur den halben Schaden. Aktiv sollte Licht etwa gleich stark sein wie Feuer und Eis aktiv.
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

1. **Phase 1:** Wahl der Elemente; Feuer, Eis und Licht jeweils mit Stamm und Grundform (Feuerball, Frostlanze, Prismastrahl); Elementar-Erfahrung; Anzeige im Profil.
2. **Phase 2:** die übrigen sechs Formen und alle Schlusssteine, Elementproben.
3. **Phase 3:** Elementtag im Tageslauf, Feinschliff am Balancing.

## Offene Fragen

Keine grundsätzlichen. Genaue Zahlen (Schaden, Ladezeiten, Erfahrungskurve) werden bei der Umsetzung mit `tools/shares.js` und `tools/check.js` eingestellt.
