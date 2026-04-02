# Hardware Launch Stage-2 Notes (US / English / USD)

## Files generated in this round
- `research-hardware-signals.csv`
- `research-hardware-ranked.csv`
- `hardware-launch-24-skus.csv`
- `hardware-launch-24-skus-commercial-images.csv`
- `hardware-launch-24-skus-final-mixed.csv`
- `hardware-image-attribution-mixed.csv`
- `ads-keyword-groups-us-hardware.csv`

## Important image note
- `hardware-launch-24-skus-final-mixed.csv` is the mixed-mode import file:
  - primary image: licensed Wikimedia image (where mapped)
  - secondary image: generated placeholder fallback
- `hardware-image-attribution-mixed.csv` contains attribution rows for all primary licensed images.
- Before paid traffic, replace fallback placeholder URLs with your own licensed product photos (recommended: 2-4 images per SKU, 1600x1200 or higher, JPG/WebP).

## Import path
1. Admin -> Product editing -> Import CSV
2. Upload: `hardware-launch-24-skus-final-mixed.csv`
3. Click `Preview import`
4. Fix row errors if any
5. Click `Import now`
6. Keep `hardware-image-attribution-mixed.csv` for compliance records

## SEO stage-2 already added
- Shop page now includes hardware keyword clusters.
- Cluster button click applies keyword filtering on live products.
- Existing dynamic meta/canonical/JSON-LD/sitemap/robots flow remains active.
