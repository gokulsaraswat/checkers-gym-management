# Patch 35 - Reporting and Analytics Polish

## Included
- period-over-period comparison cards on the admin reports page
- quick date-range presets
- payment method mix chart
- class utilisation bucket chart
- action-centre insight panel
- monthly scorecard table
- CSV snapshot export from the reports workspace
- richer class-performance table with missed and no-show visibility

## Files added
- `src/features/reports/reportPolishHelpers.js`
- `src/features/reports/components/ReportComparisonCard.js`
- `src/features/reports/components/ReportInsightPanel.js`
- `src/features/reports/PATCH_35_INTEGRATION.md`

## Files updated
- `src/features/reports/AdminReportsPage.js`

## Notes
- this patch is intentionally scoped to the reporting workspace only
- it does not change finance exports or hardware/access-control features
- CSV export is generated client-side from already loaded report data
