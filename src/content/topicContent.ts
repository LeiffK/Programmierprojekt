export const topicHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Was sind Banditen und Algorithmen?</title>
  <style>
    body {
      background: #0e0e0e;
      color: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      line-height: 1.7;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 48px;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: #4fc3f7;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 1.2rem;
      color: #aaa;
    }
    section {
      background: #171717;
      border: 1px solid #2a2a2a;
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    h2 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: #f0f0f0;
    }
    p {
      margin-bottom: 16px;
      color: #d5d5d5;
    }
    strong {
      color: #fff;
      font-weight: 600;
    }
    .info-box {
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 16px;
      border-radius: 12px;
      margin-top: 16px;
    }
    .info-box p {
      margin: 8px 0;
    }
    .info-box-title {
      font-weight: 600;
      color: #f0f0f0;
      margin-bottom: 8px;
    }
    a {
      color: #4fc3f7;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Lerne Banditen und ihre Algorithmen kennen</h1>
      <p class="subtitle">Eine Einführung mit Beispielen aus YouTube-Thumbnails</p>
    </header>

    <section>
      <h2>✨ Was ist ein Bandit?</h2>
      <p>Stell dir vor, du stehst in einer Spielhalle mit vielen Spielautomaten. Jeder Automat sieht etwas anders aus und du darfst immer nur an einem spielen. Dein Ziel: möglichst viel gewinnen. Aber du weißt nicht, welcher Automat am meisten auszahlt. Vielleicht ist der rote Automat der beste, vielleicht der blaue, du musst es ausprobieren. Genau so funktioniert ein <strong>Multi-Armed Bandit</strong> (mehrarmiger Bandit). Jeder „Arm" ist eine Option, die du ausprobieren kannst.</p>
      <p>In unserem Projekt nutzen wir dieses Prinzip, um <strong>YouTube Thumbnails</strong> zu testen. Stell dir vor, du hast mehrere Vorschaubilder für dein Video. Welches bringt die meisten Klicks? Welches sorgt dafür, dass Zuschauer möglichst lange dranbleiben? Wir müssen immer wieder entscheiden: Probieren wir ein neues Bild aus oder bleiben wir bei dem, was bisher am besten funktioniert hat? Genau dieses Abwägen macht das Banditen-Problem spannend und praxisrelevant. Es ist quasi ein Modell für <strong>A/B-Testing</strong>.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>🎥 <strong>Video:</strong> <a href="https://www.youtube.com/watch?v=QTZYOPiQTUc" target="_blank">Einführung Multi‑Armed Bandits</a></p>
        <p>📖 <strong>Erklärung:</strong> <a href="https://doi.org/10.48550/arXiv.1904.10040" target="_blank">Arxiv Paper zu Multi‑Armed Bandits</a></p>
      </div>
    </section>

    <section>
      <h2>❓ Was ist ein Bernoulli Bandit?</h2>
      <p>Der Bernoulli Bandit ist die einfachste Variante. Er kennt nur zwei Ergebnisse: Erfolg oder Misserfolg. Bei YouTube bedeutet das: Jemand klickt auf dein Thumbnail (1) oder er klickt nicht (0). Mehr Informationen gibt es hier nicht.</p>
      <p><strong>Warum nutzt man den?</strong> Er ist perfekt, wenn wir nur eine einfache Ja/Nein-Frage beantworten wollen: Klickt ein Zuschauer oder nicht? Gerade am Anfang reicht das oft aus, um einen Überblick zu bekommen. Außerdem ist er die Grundlage vieler bekannter Algorithmen, weil er mathematisch leichter zu berechnen ist.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>🎥 <strong>Video:</strong> <a href="https://studyflix.de/statistik/bernoulli-experiment-4205" target="_blank">Bernoulli Experiment erklärt</a></p>
        <p>📖 <strong>Erklärung:</strong> <a href="https://web.stanford.edu/~bvr/pubs/TS_Tutorial.pdf" target="_blank">Stanford Tutorial (Kapitel zu Bernoulli)</a></p>
      </div>
    </section>

    <section>
      <h2>🌐 Was ist ein Gaussian Bandit?</h2>
      <p>Der Gaussian Bandit geht einen Schritt weiter. Statt nur 0 oder 1 zu liefern, gibt er einen Zahlenwert zurück. In unserem Projekt ist das die Watchtime in Sekunden. Also: Nicht nur „hat jemand geklickt?", sondern „wie lange hat die Person geschaut?". Das ist realistischer, weil nicht jeder Klick gleich wertvoll ist. Ein Klick mit 2 Sekunden Watchtime bringt weniger als einer mit 5 Minuten Watchtime.</p>
      <p><strong>Warum nutzt man den?</strong> Weil er uns mehr Details liefert. Wir lernen nicht nur, ob etwas funktioniert, sondern auch, wie gut es funktioniert. Damit können wir Thumbnails auswählen, die nicht nur viele Klicks, sondern auch lange Zuschauerzeiten bringen. Das ist für YouTube besonders wichtig.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>🎥 <strong>Video:</strong> <a href="https://www.youtube.com/watch?v=iDzaoEwd0N0" target="_blank">Normalverteilung / Gauß-Verteilung erklärt</a></p>
        <p>📖 <strong>Erklärung:</strong> <a href="https://www.datacamp.com/de/tutorial/gaussian-distribution" target="_blank">Tutorial: Einführung in die Gauß-Verteilung</a></p>
      </div>
    </section>

    <section>
      <h2>📊 Greedy Algorithmus</h2>
      <p>Der Greedy Algorithmus („gierig") ist sehr direkt: Er wählt immer die Option, die bisher am besten abgeschnitten hat. Wenn also Thumbnail A bisher die meisten Klicks gebracht hat, dann wird immer wieder A angezeigt. Das klingt erstmal clever, hat aber einen Haken: Was ist, wenn Thumbnail B zwar am Anfang schlechter war, aber langfristig viel besser wäre? Greedy würde das nie herausfinden.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>🎥 <strong>Video:</strong> <a href="https://www.youtube.com/watch?v=fM6mwe4ZRz4" target="_blank">Greedy Algorithmus erklärt</a></p>
        <p>📖 <strong>Erklärung:</strong> <a href="https://link.springer.com/book/10.1007/978-3-8348-2339-7" target="_blank">Buchkapitel zu Greedy-Strategien</a></p>
      </div>
    </section>

    <section>
      <h2>🎯 ε-Greedy Algorithmus</h2>
      <p>ε-Greedy (gesprochen: „Epsilon-Greedy") versucht, dieses Problem zu lösen. Meistens wählt er die beste Option, aber in einem kleinen Prozentsatz der Fälle (zum Beispiel 10 %) probiert er etwas anderes aus. Dadurch wird sichergestellt, dass auch neue Thumbnails getestet werden und man nicht in einer möglicherweise falschen Entscheidung hängenbleibt.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>🎥 <strong>Video:</strong> <a href="https://www.youtube.com/watch?v=EjYEsbg95x0" target="_blank">ε-Greedy erklärt</a></p>
        <p>📖 <strong>Erklärung:</strong> <a href="https://www.geeksforgeeks.org/machine-learning/epsilon-greedy-algorithm-in-reinforcement-learning/" target="_blank">Artikel bei GeeksforGeeks</a></p>
      </div>
    </section>

    <section>
      <h2>📈 Gradient Bandit</h2>
      <p>Der Gradient Bandit denkt ein bisschen anders. Er bewertet nicht einfach jede Option mit einem festen Wert, sondern er berechnet eine Art „Beliebtheitswahrscheinlichkeit". Mit jeder neuen Erfahrung passt er diese Wahrscheinlichkeiten an. Je öfter ein Thumbnail Erfolg bringt, desto größer wird die Wahrscheinlichkeit, dass es ausgewählt wird. Der Vorteil: Der Algorithmus reagiert dynamisch und passt sich im Laufe der Zeit an Veränderungen an, zum Beispiel wenn Zuschauer plötzlich andere Vorlieben haben.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>🎥 <strong>Video:</strong> <a href="https://www.youtube.com/watch?v=tZcXP4MkEP0" target="_blank">Gradient Bandit erklärt</a></p>
        <p>📖 <strong>Erklärung:</strong> <a href="https://www.cs.mcgill.ca/~dprecup/courses/Winter2023/Lectures/3-gradient-bandit-2023.pdf" target="_blank">Lecture Notes zu Gradient Bandit</a></p>
      </div>
    </section>

    <section>
      <h2>🔎 Upper Confidence Bound (UCB)</h2>
      <p>Der UCB-Algorithmus hat einen cleveren Trick: Er berücksichtigt nicht nur, welche Option bisher am besten war, sondern auch, wie sicher diese Erkenntnis ist. Wenn ein Thumbnail nur sehr wenige Male getestet wurde, gibt er ihm einen „Bonus", um es öfter auszuprobieren. So wird verhindert, dass potenziell gute Thumbnails nie eine faire Chance bekommen. UCB ist wie ein neugieriger Spieler, der nicht nur auf den aktuellen Gewinn schaut, sondern auch ausprobiert, ob er vielleicht etwas übersehen hat.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>🎥 <strong>Video:</strong> <a href="https://www.youtube.com/watch?v=FgmMK6RPU1c" target="_blank">UCB Algorithmus erklärt</a></p>
        <p>📖 <strong>Erklärung:</strong> <a href="https://medium.com/@numsmt2/reinforcement-learning-chapter-2-multi-armed-bandits-part-4-upper-confidence-bound-action-589213a8a722" target="_blank">Medium-Artikel zu UCB</a></p>
      </div>
    </section>

    <section>
      <h2>🎲 Thompson Sampling</h2>
      <p>Thompson Sampling arbeitet mit Wahrscheinlichkeiten. Man kann es sich so vorstellen: Für jedes Thumbnail gibt es eine „Wahrscheinlichkeitsverteilung", wie gut es sein könnte. Bei jeder Entscheidung wird quasi ein Los gezogen und das Thumbnail mit dem besten Los gewinnt. Dadurch wird von Natur aus eine gute Mischung aus Erkunden und Ausnutzen erreicht. Viele Studien zeigen, dass Thompson Sampling in der Praxis oft besonders effizient ist.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>🎥 <strong>Video:</strong> <a href="https://www.youtube.com/watch?v=TdjOAfk7iVA" target="_blank">Thompson Sampling erklärt</a></p>
        <p>📖 <strong>Erklärung:</strong> <a href="https://web.stanford.edu/~bvr/pubs/TS_Tutorial.pdf" target="_blank">Stanford Tutorial zu Thompson Sampling</a></p>
      </div>
    </section>

    <section>
      <h2>🚀 Optimistic Initial Values (OIV)</h2>
      <p>Hier startet jede Option mit einem unrealistisch hohen Anfangswert. Dadurch denkt der Algorithmus am Anfang: „Alle Optionen sind super!". Also probiert er sie auch wirklich alle einmal aus. Mit der Zeit stellt sich dann heraus, welche tatsächlich gut sind und welche nicht. Vorteil: Kein Thumbnail wird vergessen, alle haben zu Beginn die gleiche Chance, sich zu beweisen.</p>
      <div class="info-box">
        <div class="info-box-title">Weiterführende Links:</div>
        <p>📖 <strong>Erklärung:</strong> <a href="https://medium.com/@farbluestar/reinforcement-learning-part-03-355be5c7cae4" target="_blank">Artikel zu Optimistic Initial Values</a></p>
      </div>
    </section>
  </div>
</body>
</html>
`;
