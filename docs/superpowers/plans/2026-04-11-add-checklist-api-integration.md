# Add Checklist API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 400 error on checklist creation by renaming `categoryId` → `visaCategoryId`, add `description`/`slug`/`isActive` fields, and redesign the "Create New Checklist" form to be visually attractive with grouped sections.

**Architecture:** Two-file change — update the TypeScript interface in `checklist.api.ts`, then update form state + full UI in `AddChecklistPage.tsx`. The sections/items tab is already correct and is left untouched.

**Tech Stack:** React, TypeScript, Wouter, Axios, shadcn/ui (Button, Input, Label, Textarea, Select, Card, Alert, Badge, Separator, Switch), lucide-react icons, Tailwind CSS.

---

### Task 1: Fix `CreateChecklistData` interface in the API file

**Files:**
- Modify: `client/src/api/checklist.api.ts` (lines 185–191)

- [ ] **Step 1: Update the interface**

Open `client/src/api/checklist.api.ts` and replace the `CreateChecklistData` interface (currently around line 185):

```ts
// BEFORE
export interface CreateChecklistData {
  title: string;
  subType?: string;
  countryId?: string | null;
  displayOrder?: number;
  categoryId: string;
}

// AFTER
export interface CreateChecklistData {
  visaCategoryId: string;    // renamed from categoryId — matches backend field
  title: string;
  countryId?: string | null;
  slug?: string;             // optional, backend auto-generates from title if omitted
  subType?: string;
  description?: string;      // optional
  displayOrder?: number;
  isActive?: boolean;        // optional, default true on backend
}
```

- [ ] **Step 2: Verify `createChecklist` function needs no change**

The function body at line 278 just spreads `data` into the POST body — no field mapping needed, so it's already correct once the interface is fixed:

```ts
export async function createChecklist(data: CreateChecklistData): Promise<ApiResponse<ChecklistSummary>> {
  const res = await api.post<ApiResponse<ChecklistSummary>>("/api/v1/admin/checklists", data);
  return res.data;
}
```

No changes needed here.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/checklist.api.ts
git commit -m "fix: rename categoryId to visaCategoryId in CreateChecklistData, add description/slug/isActive fields"
```

---

### Task 2: Update form state in `AddChecklistPage.tsx`

**Files:**
- Modify: `client/src/pages/AddChecklistPage.tsx` (lines 795–830 of the active non-commented block)

- [ ] **Step 1: Update the `checklistData` state initial value**

Find the `useState<CreateChecklistData>` block (around line 811) and replace it:

```ts
// BEFORE
const [checklistData, setChecklistData] = useState<CreateChecklistData>({
  title: '',
  subType: '',
  countryId: null,
  displayOrder: 0,
  categoryId: '',
});

// AFTER
const [checklistData, setChecklistData] = useState<CreateChecklistData>({
  visaCategoryId: '',
  title: '',
  subType: '',
  countryId: null,
  slug: '',
  description: '',
  displayOrder: 0,
  isActive: true,
});
```

- [ ] **Step 2: Add slug-specific inline error state**

Add a new state variable directly below the `checklistData` state declaration:

```ts
const [slugError, setSlugError] = useState<string | null>(null);
```

- [ ] **Step 3: Update `handleChecklistSubmit` to use `visaCategoryId` and handle 409**

Replace the existing `handleChecklistSubmit` function:

```ts
const handleChecklistSubmit = async () => {
  if (!checklistData.title || !checklistData.visaCategoryId) {
    setError('Please fill in all required fields (Title and Category)');
    return;
  }

  setError(null);
  setSlugError(null);
  setSuccess(null);
  setLoading(true);

  // Strip empty optional strings so backend doesn't receive empty slug/description
  const payload: CreateChecklistData = {
    ...checklistData,
    slug: checklistData.slug?.trim() || undefined,
    description: checklistData.description?.trim() || undefined,
    subType: checklistData.subType?.trim() || undefined,
  };

  try {
    const result = await createChecklist(payload);

    if (result.success && result.data.id) {
      setCreatedChecklistId(result.data.id);
      setSuccess('Checklist created successfully! Now you can add sections and items.');
      setActiveTab('sections');
    } else {
      throw new Error('Failed to create checklist: Invalid response');
    }
  } catch (error: any) {
    console.error('Error creating checklist:', error);
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Error creating checklist';

    if (status === 409) {
      setSlugError(message); // inline error under slug field
    } else {
      setError(message);
    }
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/AddChecklistPage.tsx
git commit -m "fix: update form state to use visaCategoryId, add slug/description/isActive, handle 409 slug conflict"
```

---

### Task 3: Add Switch import and update the import list

**Files:**
- Modify: `client/src/pages/AddChecklistPage.tsx` (imports section, line 746 onwards)

- [ ] **Step 1: Ensure `Switch` is imported from shadcn/ui**

Add `Switch` to the shadcn imports block. The existing import block in the active code section looks like:

```ts
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
```

Add a new line below the existing shadcn imports:

```ts
import { Switch } from '@/components/ui/switch';
```

- [ ] **Step 2: Trim the lucide-react import**

The active code imports many unused icons. Replace the lucide-react import with only what the redesigned form actually uses:

```ts
import {
  ArrowLeft, Plus, Trash2, Save, X, AlertCircle,
  FolderPlus, FileText, CheckCircle, ChevronRight,
  BookOpen, Tag, Hash, Settings2, Globe, Loader2,
} from 'lucide-react';
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AddChecklistPage.tsx
git commit -m "chore: add Switch import, trim unused lucide-react icons"
```

---

### Task 4: Redesign the "Create New Checklist" form UI

**Files:**
- Modify: `client/src/pages/AddChecklistPage.tsx` — the `TabsContent value="checklist"` block for `mode === 'new'`

- [ ] **Step 1: Replace the mode==='new' form JSX**

Find the JSX block that renders when `mode === 'new'` (inside `<TabsContent value="checklist">`). Replace the entire `<div className="space-y-5">` form block with the following:

```tsx
<div className="space-y-8">

  {/* ── Group 1: Basic Info ───────────────────────────── */}
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <BookOpen className="w-4 h-4 text-[#0063cc]" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Basic Info</span>
    </div>
    <Separator />

    {/* Title */}
    <div>
      <Label htmlFor="title" className="text-sm font-semibold mb-1.5 flex items-center gap-1">
        Checklist Title <span className="text-red-500">*</span>
      </Label>
      <Input
        id="title"
        value={checklistData.title}
        onChange={(e) => setChecklistData({ ...checklistData, title: e.target.value })}
        placeholder="e.g., Student Visa – Canada"
        className="focus:ring-[#0063cc] focus:border-[#0063cc]"
      />
    </div>

    {/* Description */}
    <div>
      <Label htmlFor="description" className="text-sm font-semibold mb-1.5 block">
        Description <span className="text-xs font-normal text-slate-400">(optional)</span>
      </Label>
      <Textarea
        id="description"
        value={checklistData.description || ''}
        onChange={(e) => setChecklistData({ ...checklistData, description: e.target.value })}
        placeholder="Brief description of what this checklist covers…"
        className="focus:ring-[#0063cc] focus:border-[#0063cc] resize-none"
        rows={3}
      />
    </div>
  </div>

  {/* ── Group 2: Classification ───────────────────────── */}
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <Tag className="w-4 h-4 text-[#0063cc]" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Classification</span>
    </div>
    <Separator />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Visa Category */}
      <div>
        <Label htmlFor="category" className="text-sm font-semibold mb-1.5 flex items-center gap-1">
          Visa Category <span className="text-red-500">*</span>
        </Label>
        <Select
          value={checklistData.visaCategoryId}
          onValueChange={(value) => setChecklistData({ ...checklistData, visaCategoryId: value })}
        >
          <SelectTrigger className="focus:ring-[#0063cc] focus:border-[#0063cc]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <span>{cat.name}</span>
                  <Badge variant="secondary" className="text-xs">{cat.checklistCount}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sub Type */}
      <div>
        <Label htmlFor="subType" className="text-sm font-semibold mb-1.5 block">
          Sub Type <span className="text-xs font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id="subType"
          value={checklistData.subType || ''}
          onChange={(e) => setChecklistData({ ...checklistData, subType: e.target.value })}
          placeholder="e.g., Work Permit, Extension"
          className="focus:ring-[#0063cc] focus:border-[#0063cc]"
        />
      </div>
    </div>

    {/* Country */}
    <div>
      <Label htmlFor="country" className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-slate-400" />
        Country <span className="text-xs font-normal text-slate-400">(optional)</span>
      </Label>
      <Select
        value={checklistData.countryId || '__all__'}
        onValueChange={(value) =>
          setChecklistData({ ...checklistData, countryId: value === '__all__' ? null : value })
        }
      >
        <SelectTrigger className="focus:ring-[#0063cc] focus:border-[#0063cc]">
          <SelectValue placeholder="All Countries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">🌍 All Countries</SelectItem>
          {countries.map((country) => (
            <SelectItem key={country.id} value={country.id}>
              {country.name} ({country.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>

  {/* ── Group 3: Advanced / Optional ─────────────────── */}
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-1">
      <Settings2 className="w-4 h-4 text-[#0063cc]" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Advanced</span>
    </div>
    <Separator />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Slug */}
      <div>
        <Label htmlFor="slug" className="text-sm font-semibold mb-1.5 block">
          URL Slug <span className="text-xs font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id="slug"
          value={checklistData.slug || ''}
          onChange={(e) => {
            setChecklistData({ ...checklistData, slug: e.target.value });
            if (slugError) setSlugError(null);
          }}
          placeholder="auto-generated from title"
          className={`focus:ring-[#0063cc] focus:border-[#0063cc] ${slugError ? 'border-red-400' : ''}`}
        />
        {slugError ? (
          <p className="text-xs text-red-500 mt-1">{slugError}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-1">Leave blank to auto-generate from title</p>
        )}
      </div>

      {/* Display Order */}
      <div>
        <Label htmlFor="displayOrder" className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-slate-400" />
          Display Order
        </Label>
        <Input
          id="displayOrder"
          type="number"
          min={0}
          value={checklistData.displayOrder ?? 0}
          onChange={(e) =>
            setChecklistData({ ...checklistData, displayOrder: parseInt(e.target.value) || 0 })
          }
          className="focus:ring-[#0063cc] focus:border-[#0063cc]"
        />
      </div>
    </div>

    {/* Is Active toggle */}
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-700">Active Status</p>
        <p className="text-xs text-slate-400 mt-0.5">Inactive checklists are hidden from users</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          variant={checklistData.isActive ? 'default' : 'secondary'}
          className={checklistData.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500'}
        >
          {checklistData.isActive ? 'Active' : 'Inactive'}
        </Badge>
        <Switch
          checked={checklistData.isActive ?? true}
          onCheckedChange={(checked) => setChecklistData({ ...checklistData, isActive: checked })}
        />
      </div>
    </div>
  </div>

  {/* ── Actions ───────────────────────────────────────── */}
  <div className="flex gap-3 pt-2">
    <Button
      onClick={handleChecklistSubmit}
      disabled={loading}
      className="bg-[#0063cc] hover:bg-[#0052a3] flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Creating…
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          Create Checklist &amp; Continue
        </>
      )}
    </Button>
    <Button variant="outline" onClick={() => setLocation('/checklists')}>
      Cancel
    </Button>
  </div>

</div>
```

- [ ] **Step 2: Verify in browser**

Start the dev server and open the Add Checklist page. Confirm:
- Three grouped sections appear with icons + separators
- Category dropdown works (populated with SPOUSE, STUDENT, VISITOR)
- Country dropdown works (All Countries + list)
- Is Active toggle shows green "Active" / grey "Inactive" badge
- Slug field shows helper text "Leave blank to auto-generate from title"
- Submitting with title + category selected no longer returns 400
- On success: green alert appears, tab switches to "Add Sections & Items"
- On 409 (duplicate slug): red text appears inline below the slug field, not in the top alert

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AddChecklistPage.tsx
git commit -m "feat: redesign Create Checklist form — grouped sections, description, slug, isActive toggle"
```

---

## Self-Review

**Spec coverage:**
- [x] `categoryId` → `visaCategoryId` rename in interface — Task 1
- [x] `slug`, `description`, `isActive` fields added — Tasks 1 & 2
- [x] Empty optional strings stripped before POST — Task 2, `handleChecklistSubmit`
- [x] 409 conflict shown inline under slug field — Task 2
- [x] Form grouped into Basic Info / Classification / Advanced — Task 4
- [x] Is Active as Switch with colored badge — Task 4
- [x] Slug helper text — Task 4
- [x] Loader2 spinner on submit button — Task 4
- [x] Sections/Items tab untouched — confirmed, not in any task

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:**
- `visaCategoryId` used consistently across Task 1 interface, Task 2 state init, Task 2 submit handler, and Task 4 JSX. No drift.
- `slugError` state introduced in Task 2 and consumed in Task 4 JSX.
