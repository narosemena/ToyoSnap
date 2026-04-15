import os

# Mojibake character sequences and their ASCII replacements.
# These are double-encoded chars: UTF-8 bytes were misread as Windows-1252 then re-encoded.
replacements = [
    # em dash (U+2014): bytes E2 80 94 -> Win-1252 gives a + euro + right-double-quote
    ('\u00e2\u20ac\u201d', ' - '),
    # en dash (U+2013): bytes E2 80 93 -> Win-1252 gives a + euro + left-double-quote
    ('\u00e2\u20ac\u201c', ' - '),
    # rightwards arrow (U+2192): bytes E2 86 92 -> Win-1252 gives a + dagger + right-single-quote
    ('\u00e2\u2020\u2019', '->'),
    # leftwards arrow (U+2190): bytes E2 86 90 -> Win-1252 gives a + dagger + left-single-quote
    ('\u00e2\u2020\u2018', '<-'),
    # ellipsis (U+2026): bytes E2 80 A6 -> Win-1252 gives a + euro + broken-bar
    ('\u00e2\u20ac\u00a6', '...'),
    # bullet (U+2022): bytes E2 80 A2 -> Win-1252 gives a + euro + copyright
    ('\u00e2\u20ac\u00a2', '*'),
]

files_with_mojibake = [
    'src/manifest.ts',
    'src/action-logger/action-detector.ts',
    'src/capture/rrweb-capture.ts',
    'src/capture/video-capture.ts',
    'src/content/content-script.ts',
    'src/editor/store/pii-store.ts',
    'src/export-engine/docx-exporter.ts',
    'src/export-engine/html-replay-exporter.ts',
    'src/ledger/ledger-resolver.ts',
    'src/lib/csp.ts',
    'src/lib/idb.ts',
    'src/lib/template-injector.ts',
    'src/lib/template-parser.ts',
    'src/security/dom-sanitizer.ts',
    'src/security/idb-crypto.ts',
    'src/storage/ephemeral-db.ts',
    'src/storage/purge.ts',
    'src/types/storage.ts',
]

def clean_remaining_mojibake(text):
    """Clean up any remaining mojibake: sequences starting with U+00E2 followed
    by high-unicode chars that are artifacts of double-encoding."""
    result = []
    i = 0
    while i < len(text):
        c = text[i]
        if ord(c) == 0x00E2 and i+1 < len(text) and ord(text[i+1]) in (0x20AC, 0x2020, 0x2021, 0x2022, 0x2026):
            # Remaining mojibake sequence - output hyphen and skip 2-3 chars
            result.append('-')
            i += 2
            if i < len(text) and 0x0080 <= ord(text[i]) <= 0x27FF:
                i += 1  # skip 3rd char too
        else:
            result.append(c)
            i += 1
    return ''.join(result)

for path in files_with_mojibake:
    if not os.path.exists(path):
        print(f'SKIP (not found): {path}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    for mojibake, replacement in replacements:
        content = content.replace(mojibake, replacement)

    content = clean_remaining_mojibake(content)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed: {path}')
    else:
        print(f'No change: {path}')

print('Done.')
