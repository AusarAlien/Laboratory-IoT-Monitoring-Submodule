# Repository development instructions

Before changing SQL registrations, services, templates, or page JavaScript in this repository, read and follow [开发指导与数据关联边界.md](开发指导与数据关联边界.md).

Mandatory boundaries:

- `INSTID` is the instrument business key and is expected to join energy data to `HTLIS.LP_TBC_INSTFILE.INSTID`.
- `FSSID` identifies a smart socket/collection endpoint and must not replace the instrument key.
- Keep unmatched legacy telemetry through a left join and explicit display fallback.
- Filter by the authenticated institution scope; latest/cumulative tables without `FHIINO` must be scoped through trusted instrument or history relations.
- Keep history, latest status, cumulative values, collection logs, and warning events as distinct business concepts.
- Do not introduce water-immersion content.
- Real-query failures must not silently fall back to Mock data.
- Current scope is front-end pages, registered SQL, and basic platform interaction; do not add Java interfaces unless the user changes that scope.

