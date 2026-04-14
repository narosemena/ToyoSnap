# System Prompt: WorkflowCapture Engine (Zero-Egress ID Tool)

**Primary Objective:** Build a secure, offline-capable browser extension for instructional designers. It records web-based software workflows and exports them as video, image chains, interactive HTML/CSS, or layered SVGs, alongside a generated design system document.
**Core Constraint:** The extension must be strictly "Zero-Egress." No data can ever leave the local machine to ensure compliance with stringent financial enterprise InfoSec standards.

## Phase 1: Enterprise Security & Architecture Setup
* **Framework:** Initialize a Vite + React + TypeScript project configured for browser extensions (Manifest V3). Use Tailwind CSS for the UI.
* **Security Constraints:** Configure a strict Content Security Policy (CSP) in the manifest that explicitly denies all external network requests (no external APIs, cloud analytics, or remote scripts). All libraries must be bundled locally.
* **Data Handling:** Implement an ephemeral storage model. Captured DOM/video data must only live in temporary memory (`Blob` or session-level `IndexedDB`) and must be programmatically wiped when the user closes the editor or downloads the export.

## Phase 2: Multi-Modal Capture Engine
Build the recording mechanisms within the content script, confined strictly to the active tab context:
* **Mode 1 (Video):** Native `MediaRecorder` API.
* **Mode 2 (Flat Image Chain):** Native `chrome.tabs.captureVisibleTab` triggered by clicks or hotkeys.
* **Mode 3 (Interactive HTML/CSS):** Local `rrweb` DOM tracking.
* **Mode 4 (Layered SVG):** Integrate a local DOM-to-SVG parsing library. Serialize the DOM at each interaction into distinct SVG layers (e.g., Background, Text Nodes, Images, UI Containers) for easy editing in vector software.
* **Cross-Domain Navigation & State Persistence:** The capture engine must survive SSO redirects (e.g., Okta, PingIdentity) and page reloads. Have the Background Service Worker act as the master state controller. When the user initiates a recording, store an `isRecording: true` flag in `chrome.storage.session`. Every time a new page loads, the content script must check this flag; if true, it should immediately resume `rrweb` and DOM capturing, appending the new data to the existing session payload rather than overwriting it.

## Phase 3: Mouse Pointer Tracking & Rendering Logic
Implement a global toggle (`captureCursor: boolean`) in the popup UI before recording begins.
* **Video:** Pass the cursor preference to the capture API constraints.
* **HTML/CSS:** Toggle `rrweb`'s native mouse tracking or hide the `.rr-mouse` CSS class during export.
* **Image/SVG:** Listen for `X/Y` coordinates. If enabled, inject a temporary `<svg id="virtual-cursor">` exactly one millisecond before the snapshot/SVG generation, placing it on its own top-level `<g>` layer, then remove it immediately.

## Phase 4: Instructional Design Auto-Enhancements
* **Auto-Generated Action Steps:** Intercept click events to read the target element's `aria-label`, `title`, or inner text. Generate a continuous text log of steps (e.g., "Clicked the 'Submit' button") to serve as alt-text or written instructions.
* **Auto-Spotlight & Dimming:** In the HTML/CSS and SVG exports, automatically inject visual cues—apply an active highlight (e.g., a colored stroke/glow) to the clicked element and a semi-transparent dark overlay to the surrounding screen data to focus the learner's attention.

## Phase 5: Local PII Sanitization Studio (UI/UX Optimized)
* **Editor UI:** Build a React/Tailwind dashboard running entirely inside a local extension page (`chrome-extension://[id]/editor.html`). Allow users to preview outputs. For HTML/CSS mode, allow users to click rendered DOM elements to apply a Tailwind `.blur-sm` class or replace text nodes with variables (e.g., `[PII_REMOVED]`). Include a prominent "Purge Memory" button to manually clear all cached capture data.
* **UX Pre-Delivery Standards:** The studio interface must strictly adhere to the following accessibility and polish constraints:
    * Maintain a minimum WCAG AA text contrast ratio of 4.5:1.
    * Implement smooth hover state transitions (150ms–300ms) and highly visible focus states.
    * Utilize SVGs exclusively for iconography; strictly prohibit emojis.
    * Enforce `cursor-pointer` on all interactive targets and respect OS-level `prefers-reduced-motion`.
    * Structure responsive layouts scaled specifically for 375px, 768px, 1024px, and 1440px.

## Phase 6: Automated Design System & Master/Override Extraction
* **Style Computation:** Use `window.getComputedStyle()` during DOM capture to sample typography, colors, and Key Effects (shadow depths, border radii).
* **Metadata Tagging:** Silently capture the Page Title and URL path for every step of the recorded workflow to create a structural breadcrumb trail.
* **Anti-Pattern Logging:** Flag UI/UX anti-patterns within the captured workflow (e.g., text failing contrast checks) so the designer knows what to avoid.
* **Master + Overrides Output Pattern:** Generate a hierarchical Markdown structure:
    * `design-system/MASTER.md`: The global source of truth containing core Hex/RGB codes, primary typography scales, base effects, and the overall style pattern.
    * `design-system/pages/[url-path].md`: Page-specific override files generated from the URL breadcrumbs, detailing localized style deviations from the Master file.
* **Document Generation:** Use a client-side library (`pptxgenjs` or `docx`) to parse the Markdown into an offline presentation document with color swatches and font specimens.

## Phase 6.5: Zero-PII Bulk Data Templating (ToyotaGPT Workflow)
* **Goal:** Allow users to bulk-replace massive data structures (tables, forms) with synthetic data without ever exposing actual PII to external or internal LLMs.
* **Zero-PII Schema Extraction:** Implement a feature that parses the active DOM state for data-heavy `<form>` and `<table>` elements. It must extract the structural DOM IDs (`data-rrweb-id`) but **strictly strip out the actual inner text/PII**.
* **Template Generation:** Output a `synthetic-template.json` file. The keys will be the DOM IDs, and the values will be blank strings or contextual placeholders based on the table headers (e.g., `{"node_123_name": "", "node_124_vin": ""}`).
* **Re-Injection Logic:** Build a "Bulk Import" dropzone in the Studio UI. The user will manually copy this blank schema into their approved AI tool, ask it to generate synthetic data for the blank fields, and drop the filled JSON back into the studio. The script will iterate through the JSON keys, locate the matching `data-rrweb-id` in the DOM, and replace the real text nodes with the synthetic data.

## Phase 6.6: Global Propagation Ledger (Efficiency Engine)
* **Goal:** Eliminate redundant sanitization tasks by propagating user edits across the entire captured timeline.
* **Cascading State Management:** To prevent edit conflicts, the system must maintain two distinct state ledgers: a `GlobalLedger` (for JSON bulk imports and "Apply Globally" edits) and a `LocalOverrideLedger` (for single-step manual edits). Specificity Rule: When rendering the DOM for preview or export, check the `LocalOverrideLedger` first. If a `data-rrweb-id` has a local edit for that specific step, strictly apply the local edit and ignore the `GlobalLedger` entirely. Non-Destructive Uploads: Re-uploading a new `synthetic-template.json` only updates the `GlobalLedger`.
* **Manual Blur Propagation:** When a user clicks an element in the Studio UI to apply a blur or text variable, include a checkbox to "Apply Globally." If checked, extract the target's `innerText` or `src` URL, add it to the `GlobalLedger`, and programmatically scan all captured DOM steps to apply the identical CSS blur or variable replacement to matching nodes.
* **Bulk JSON Propagation:** When the user imports the filled `synthetic-template.json`, the system must map the original extracted strings to the new synthetic strings in the `GlobalLedger` and execute a global "Find & Replace" across every `rrweb` event step in the timeline.
* **Timeline Override Indicators:** The React timeline component must subscribe to the `LocalOverrideLedger`. If a specific step index contains one or more local overrides, the UI must render a distinct visual indicator (e.g., a high-visibility yellow alert badge) on that specific step's thumbnail.

## Phase 7: Secure Export Generation
* Package all artifacts securely to the local hard drive using local `Blob` objects and `URL.createObjectURL()`.
* Output options: Trimmed video, `.zip` of sequential PNGs, `.zip` of grouped SVGs, standalone HTML replay file, text log of action steps, the hierarchical `.md` files, and the PPTX/DOCX Design System document.

## Phase 8: Subagent-Driven Development Protocol
* **Role Delegation:** Utilize a subagent-driven architecture. Before writing code, outline a sequential checklist and assign distinct development phases to logical subagents (e.g., Manifest/Security Architect, React UI Engineer, Capture Specialist). 
* **Artifact Generation:** Render the React/Tailwind UI components as interactive artifacts for visual review before migrating the approved code into the Vite extension bundle.
* **Checkpoint Reviews:** Enforce a test-driven development loop. Halt and require explicit human approval at the end of each subagent's phase before advancing.

## Phase 9: Playwright Verification Engine
* **Automated Interaction:** Generate a suite of local Playwright test scripts alongside the extension code.
* **Simulated Workflows:** Mount the extension locally, simulate rapid user clicks, form inputs, and hover states, and verify that the UI data is accurately serialized into all export modalities.
* **Security Validation:** The test suite must actively monitor network traffic to guarantee the Zero-Egress rule is maintained.

## Phase 10: MCP-Ready Export for Local Inference
* **Data Standardization:** Structure the final exported `.json` logs, step-by-step text actions, and the Master/Overrides design documents to conform to Model Context Protocol (MCP) standards. 
* **Local Orchestration Pipeline:** Format the artifacts to ensure they can be instantly ingested and parsed locally by Kimi, allowing the securely captured workflow data to be analyzed and utilized without relying on cloud APIs.
