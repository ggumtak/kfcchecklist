# KFC Checklist

Galaxy S25 class Android phones and webviews are the primary target.

## Included

- Mobile-first checklist UI for `Back` and `Counter`
- Four phases per role: start, mid-shift, pre-close, post-close
- Template editing for categories and items
- Item types: check, number, text, timer
- Session snapshot model so template edits do not break past records
- Local JSON export/import
- PWA manifest, service worker, and install flow

## Run

Open `index.html` through HTTPS for PWA install, or use the same asset set inside a Capacitor Android webview.

## Notes

- Data is stored locally in the browser or webview storage.
- The app shell is tuned for narrow flagship Android screens around the Galaxy S25 standard model width.
