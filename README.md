### Islandchill

IslandChill production management interface for Frappe/ERPNext.

### Production interface

- **Work Orders:** Expand Show Operations to access Issue Raw Materials, Maintenance, and Job Cards in that order. Maintenance unlocks after materials are issued; Job Cards unlock after maintenance is complete. Future planned-date restrictions remain in place.
- **Maintenance:** Applicable checklists and completion progress appear directly in the Maintenance tab. Existing checklist forms handle editing and submission, and the list refreshes after submission.
- **Job Cards:** Compact, responsive operation cards show sequence numbers, workstation, status, and saved employee assignments. Existing Start, Pause, Resume, Finish, and Remarks actions remain available according to status. Unassigned-operator placeholders are hidden.
- **Search:** Header search appears only on Work Orders. It matches Work Order IDs, item codes, and item names across server-side pages and resets pagination when the query changes.
- **Business Workflow:** Work Order selection is optional. Selecting an order loads its Job Cards and highlights the corresponding operation; clearing the selection returns to the default workflow view.

### Frontend development and build

```bash
cd frontend
npm ci
npm run dev
```

To build the frontend assets and copy the HTML entry into the Frappe website route:

```bash
cd frontend
npm run build
```

The build writes assets to `islandchill/public/frontend` and copies its HTML entry to `islandchill/www/islandchill.html`. Commit the generated assets together with source changes. Backend search and employee mapping changes also require the updated Python application to be deployed.

### Proposed incident dashboard

The incident dashboard is a design proposal only; it is not implemented in this update. The proposed `Production Incident` DocType links incidents to Work Orders, Job Cards, and originating maintenance forms using a source DocType and Dynamic Link. The planned dashboard includes status counts, search/filtering, investigation and corrective actions, and navigation back to the source records. Proposed statuses are Open, Acknowledged, Pending, and Resolved.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch version-16
bench install-app islandchill
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/islandchill
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade
### CI

This app can use GitHub Actions for CI. The following workflows are configured:

- CI: Installs this app and runs unit tests on every push to `develop` branch.
- Linters: Runs [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and [pip-audit](https://pypi.org/project/pip-audit/) on every pull request.


### License

mit
# islandchill-anantdv-updated
