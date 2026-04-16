/**
 * Exports a self-contained HTML file with inlined rrweb-player.
 * All rrweb event data, player JS, and player CSS are embedded inline.
 * Zero external requests — safe for Zero-Egress policy.
 */
import { getStepsBySession, getStep } from "@/storage/ephemeral-db";
// Vite ?raw imports bundle the file content as a string at build time
import rrwebPlayerJs from "rrweb-player/dist/index.js?raw";
import rrwebPlayerCss from "rrweb-player/dist/style.css?raw";

export async function exportHtmlReplay(sessionId: string): Promise<Blob> {
  const steps = await getStepsBySession(sessionId);

  // Collect all rrweb event arrays in step order
  const allEvents: unknown[] = [];
  let lastHostname = "";

  for (const step of steps) {
    // getStepsBySession returns steps with rrwebEvents: null — load full step to decrypt
    const fullStep = await getStep(step.sessionId, step.stepIndex) ?? step;

    const hostname = (() => {
      try {
        return new URL(fullStep.url).hostname;
      } catch {
        return fullStep.url;
      }
    })();

    if (hostname !== lastHostname && lastHostname !== "") {
      allEvents.push({ type: "page-transition", hostname });
    }
    lastHostname = hostname;

    if (fullStep.rrwebEvents) {
      allEvents.push(...fullStep.rrwebEvents);
    }
  }

  const eventsJson = JSON.stringify(allEvents);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ToyoSnap Replay</title>
  <style>
    body { margin: 0; background: #111; display: flex; flex-direction: column; align-items: center; padding: 24px; font-family: system-ui, sans-serif; }
    .toyosnap-page-transition { width: 100%; max-width: 800px; padding: 8px 16px; margin: 16px 0; background: #2a2a00; border: 1px solid #666600; border-radius: 4px; color: #cccc00; font-size: 13px; }
    #player { width: 800px; }
  </style>
  <style>${rrwebPlayerCss}</style>
</head>
<body>
  <div id="player"></div>
  <script>${rrwebPlayerJs}</script>
  <script>
    window.__TOYOSNAP_EVENTS__ = ${eventsJson};
    new rrwebPlayer({
      target: document.getElementById('player'),
      props: { events: window.__TOYOSNAP_EVENTS__, width: 800, height: 600 }
    });
  </script>
</body>
</html>`;

  return new Blob([html], { type: "text/html" });
}
