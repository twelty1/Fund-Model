
# Plan: Rename Deal Tab and Add Sub-tabs

## Summary
Rename the "Deal" tab to "Valuation/Shares" and add two sub-tabs: "Deal Research" on the left and "Deal Dynamics" on the right.

## Changes

**File:** `src/pages/Index.tsx`

### 1. Rename Main Tab (line 141)
- Change `<TabsTrigger value="deal">Deal</TabsTrigger>` to `<TabsTrigger value="deal">Valuation/Shares</TabsTrigger>`

### 2. Add Sub-tabs Structure (lines 201-208)
Replace the current Deal tab content with nested tabs following the same pattern as the Scenario tab:

```text
Current structure:
  <TabsContent value="deal">
    <DealDynamicsForm />
  </TabsContent>

New structure:
  <TabsContent value="deal">
    <Tabs defaultValue="research">
      <TabsList>
        <TabsTrigger value="research">Deal Research</TabsTrigger>
        <TabsTrigger value="dynamics">Deal Dynamics</TabsTrigger>
      </TabsList>
      
      <TabsContent value="research">
        <!-- Placeholder for future Deal Research content -->
      </TabsContent>
      
      <TabsContent value="dynamics">
        <DealDynamicsForm />
      </TabsContent>
    </Tabs>
  </TabsContent>
```

### 3. Deal Research Placeholder
Add a simple placeholder section with a message like "Deal Research - Coming Soon" or an empty `SectionCard` that can be populated later with deal research inputs.

## Technical Details

The implementation mirrors the existing Scenario tab pattern:
- Nested `Tabs` component with `defaultValue="research"` (left tab opens first)
- Two-column `TabsList` grid
- Move existing `DealDynamicsForm` into the "dynamics" sub-tab
- Add placeholder content for the "research" sub-tab

## Files Modified
- `src/pages/Index.tsx` - Update tab label and add nested sub-tab structure
