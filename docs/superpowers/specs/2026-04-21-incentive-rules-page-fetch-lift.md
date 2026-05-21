---
title: Lift incentive rules fetch to IncentiveRulesPage
date: 2026-04-21
status: approved
---

## Goal

Move the `useQuery(['incentive-rules'])` call from each individual tab into `IncentiveRulesPage`, passing `rules` as a prop. This eliminates 5 duplicate query registrations and makes data ownership explicit at the page level.

## Architecture

**IncentiveRulesPage**
- Calls `useQuery({ queryKey: ['incentive-rules'], queryFn: fetchIncentiveRules })`
- Shows a loading spinner while `isLoading` is true
- Shows an error message if `isError` is true
- Once `data` is available, renders the `<Tabs>` tree and passes `rules={data}` to each tab component

**Each tab (SpouseRulesTab, VisitorRulesTab, StudentRulesTab, UkStudentRulesTab, AllFinanceRulesTab)**
- Removes its own `useQuery` call
- Accepts a new required prop: `rules: IncentiveRulesPayload`
- Internal `useEffect` that seeds draft state from `rules` is unchanged
- `useMutation` and save logic are unchanged

## Data Flow

```
IncentiveRulesPage
  └─ useQuery → fetchIncentiveRules → rules: IncentiveRulesPayload
       ├─ SpouseRulesTab(rules)
       ├─ VisitorRulesTab(rules)
       ├─ StudentRulesTab(rules)
       ├─ UkStudentRulesTab(rules)
       └─ AllFinanceRulesTab(rules)
```

## Files Changed

| File | Change |
|------|--------|
| `client/src/pages/IncentiveRulesPage.tsx` | Add `useQuery`, loading/error UI, pass `rules` prop |
| `client/src/components/incentives/SpouseRulesTab.tsx` | Remove `useQuery`, add `rules` prop |
| `client/src/components/incentives/VisitorRulesTab.tsx` | Remove `useQuery`, add `rules` prop |
| `client/src/components/incentives/StudentRulesTab.tsx` | Remove `useQuery`, add `rules` prop |
| `client/src/components/incentives/UkStudentRulesTab.tsx` | Remove `useQuery`, add `rules` prop |
| `client/src/components/incentives/AllFinanceRulesTab.tsx` | Remove `useQuery`, add `rules` prop |

## Error Handling

- Loading: render a centered spinner in place of the tabs
- Error: render a simple error message with the query error
- No skeleton or optimistic UI needed — tabs are not rendered until data is ready
