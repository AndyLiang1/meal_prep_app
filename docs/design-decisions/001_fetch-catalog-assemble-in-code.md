# Design Decision: Fetch Catalog, Assemble in Code

## Context

Meals and meal groups need to return rich nested data — a meal contains foods,
which can be plain ingredients or composite foods (which themselves contain
ingredients). The naive approach uses a massive multi-table JOIN that fans out
rows and requires complex in-memory de-duplication.

## Decision

Instead of large JOINs that combine relationship data with entity data in a
single query, we:

1. **Fetch the relationship rows** — lightweight queries against join tables
   (e.g., `meal_food`) that return only foreign key IDs.
2. **Batch-fetch the referenced entities** — use `WHERE id IN (...)` against
   the ingredient and composite food tables to get all needed records in one
   query each.
3. **Assemble in application code** — match IDs from step 1 against the maps
   built from step 2 to construct the response shape.

## Rationale

- **No N+1:** One query per entity type regardless of how many meals or foods
  are involved.
- **No fan-out:** JOIN-based approaches multiply rows when composite foods have
  many ingredients. Separate queries keep result sets flat.
- **Uniform read path:** The same approach works for fetching a single meal, a
  list of meals, or an entire meal group — just vary the IDs passed to step 1.
- **Simpler queries:** Each query is a straightforward `SELECT * WHERE id IN`.
  No aliased columns, no LEFT JOINs, no Kysely type-casting hacks.
- **Cacheable:** The entity data (ingredients, composite foods) changes far less
  often than meal composition, making it a natural caching boundary later.

## Trade-offs

- Slightly more application code to stitch things together (Map lookups).
- Over-fetches if only a subset of fields are needed (acceptable at current
  scale).
- Multiple round trips to the DB (2–3) instead of one, but each is fast and the
  total latency is comparable or better than a single complex JOIN.

## Applies To

- `mealService` — fetching single meals or listing all meals.
- `mealGroupService` — fetching a meal group with all its meals and foods.
- Any future "plan" or "schedule" aggregation that references meals.
