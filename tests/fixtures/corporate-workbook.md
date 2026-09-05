# Synthetic workbook acceptance fixture

`corporate-workbook.xlsx` is the existing Phase 3.3 synthetic corporate fixture, retained unchanged for reproducible parser, Storage/RLS and browser acceptance. It contains Pipeline, Companies, Contacts and Forecast sheets, stored formulas, a formula without a cached result, and hidden-source metadata. It contains no customer data or credentials.

The original temporary working copy is not required by repository tests. The workbook is test input only and is never loaded into authenticated production flows automatically.
