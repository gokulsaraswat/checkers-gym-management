# Patch 32 Integration Notes

## Scope

Patch 32 focuses on homepage and media polish only.

Included in this patch:
- homepage hero slider
- richer image and poster presentation
- theme-aware visual cards for light and dark mode
- stronger public-to-product transition on the homepage
- improved exercise entry point styling
- theme-aware loading states for shared loaders

## Files added or updated

- `src/features/exercises/pages/HomePage.js`
- `src/features/publicSite/HomepageHeroSlider.js`
- `src/features/publicSite/HomepageMediaShowcase.js`
- `src/components/common/LoadingScreen.js`
- `src/components/Loader.js`
- `src/App.css`

## Notes

- Patch 32 builds on Patch 31 public site content.
- The homepage uses the seeded media and event content already introduced in `publicSiteContent.js`.
- No hardware or access-control logic is mixed into this patch.
- If you already have real branch media, replace the seeded image URLs in `publicSiteContent.js` after applying the patch.
