# KIIT Block A & B Indoor Navigation

Pure graph / blueprint view — no floor-plan images required.

## Files
- `index.html` — interface
- `styles.css` — dark blueprint theme + graph node styles
- `app.js` — campus graph, Dijkstra, Yen k-shortest paths, SVG map renderer

## Run
```bash
python3 -m http.server 8080
# open http://localhost:8080
```
Or open `index.html` directly in a browser.

## Map design
Floor plans are drawn as an interactive **SVG graph** from the blueprint coordinates:
- Blue nodes = rooms
- Pink nodes = toilets
- Green nodes = entrances
- Purple nodes = stairs
- Grey nodes = corridor junctions
- Yellow highlight = active route

Click any node to set source / destination.

## Notes
- Room IDs: `A001` (ground), `A101` (1st), `A201` (2nd), `A301` (3rd)
- Walking scale calibrated on B116 → B117 = 11 steps
- Stairs ≈ 35 steps per floor transition
- Accessible mode avoids stairs (add lifts via Admin JSON if needed)
- Admin panel: export / import / edit full map JSON
