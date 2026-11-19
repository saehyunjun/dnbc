# Hand-filled quotes

`reddit.json` and `linkedin.json` are arrays of records. The `quotes` job loads both. Both start empty.

```json
{
  "text": "The quote, as written.",
  "community": "r/rarediseases",
  "date": "2026-11-10",
  "url": "https://example.com/optional",
  "topic": "short topic label",
  "entities": { "drugs": [], "sponsors": [], "nctIds": [], "conditions": [] }
}
```

| Field | Reddit | LinkedIn |
|---|---|---|
| `text` | required | required |
| `community` | required, the only speaker label shown | not used |
| `name`, `role` | never | required, name and role as shown on the post |
| `date` | required, `YYYY-MM-DD` | required |
| `url` | dropped, Reddit quotes carry no link | optional |
| `topic` | required | required |
| `entities` | optional, guessed from the text when absent | optional |

Never record a Reddit username. Allowed subreddits are in `data/subreddits.json`.
