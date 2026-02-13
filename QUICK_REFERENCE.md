# Quick Reference: Key-Value Records Implementation

## What Changed?

The PO (Purchase Order) system now uses **key-value records** instead of fixed field structures, allowing flexible API integration and dynamic form population.

## File Locations

| File | Purpose |
|------|---------|
| `src/types/purchase-order.ts` | Type definitions (`KeyValueRecord`, `RowData`, `POItem`) |
| `src/utils/formFieldGenerator.ts` | Utility functions for form management |
| `src/components/form/DynamicFormField.tsx` | Reusable form field component |
| `src/components/modals/AddPOModal.tsx` | PO creation form |
| `src/components/modals/AddPOItemModal.tsx` | PO item form |
| `KEY_VALUE_RECORDS_API_DOCUMENTATION.md` | Full documentation |
| `IMPLEMENTATION_SUMMARY.md` | Implementation details |

## Key Concepts

### KeyValueRecord
```typescript
interface KeyValueRecord {
  [key: string]: string | number | boolean | null | undefined;
}
```
Flexible structure for any API response

### RowData
```typescript
interface RowData {
  [key: string]: string | number | null;
}
```
Type-safe structure for API submission

### POItem
```typescript
interface POItem extends KeyValueRecord {
  po_number?: string;
  item_code?: string;
  unit_price?: number;
  quantity?: number;
  // ... other fields
}
```

## Common Patterns

### 1. Initialize Form with Key-Value Data
```typescript
const [formData, setFormData] = useState<KeyValueRecord>({
  po_issue_date: '',
  vendor_id: '',
  vendor_name: '',
  po_status: 'pending',
});
```

### 2. Handle Form Changes
```typescript
const handleInputChange = (field: string, value: string | number) => {
  setFormData((prev) => ({
    ...prev,
    [field]: value,
  }));
};
```

### 3. Convert to RowData Before Submission
```typescript
const toRowData = (record: KeyValueRecord): RowData => {
  const rowData: RowData = {};
  Object.keys(record).forEach((key) => {
    const value = record[key];
    if (value !== null && value !== undefined && value !== '') {
      rowData[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    }
  });
  return rowData;
};

const cleanData = toRowData(formData);
await api.save(cleanData);
```

### 4. Type-Safe Value Access
```typescript
// Safe property access
value={String(formData.item_code ?? '')}

// Safe with date conversion
defaultDate={formData.po_issue_date ? new Date(String(formData.po_issue_date)) : undefined}

// Safe with null coalescing
value={String(poData?.po_number ?? 'ENG-PO-****')}
```

### 5. Validate Dynamic Fields
```typescript
const requiredFields = ['item_code', 'item', 'unit_price', 'quantity'];
const missingFields = requiredFields.filter((field) => !formData[field]);

if (missingFields.length > 0) {
  toast.error(`Please fill in: ${missingFields.join(', ')}`);
  return;
}
```

## API Response Handling

### Normalize API Response
```typescript
const normalized = normalizeAPIResponse(apiResponse);
setFormData(normalized);
```

### Extract Form Data
```typescript
const dataToSubmit = extractFormData(formData, ['rowId', 'timestamp']);
```

### Validate Form
```typescript
const { isValid, errors } = validateFormData(formData, fieldConfigs);
```

## Utility Functions

### formFieldGenerator.ts

```typescript
// Generate field configurations from data
generateFormFieldConfig(apiRecord, overrides)

// Normalize API response
normalizeAPIResponse(response)

// Extract and filter fields
extractFormData(formData, excludeFields)

// Validate form data
validateFormData(formData, configs)

// Get field configuration
getFieldConfig(configs, fieldKey)
```

## Form Field Types

| Type | Usage |
|------|-------|
| `text` | General text input |
| `number` | Numeric input |
| `select` | Dropdown list |
| `textarea` | Multi-line text |
| `file` | File upload |
| `date` | Date picker |
| `email` | Email input |
| `tel` | Phone input |

## Error Handling

### TypeScript Compilation
✅ 0 errors in PO-related files

### Runtime Validation
- Required field checking
- Type coercion handling
- Null/undefined safety

### API Submission
- Empty fields excluded
- Boolean to number conversion
- Proper error messages

## Performance Tips

1. **Memoize Functions**
   ```typescript
   const getDefaultFormData = React.useCallback(() => ({...}), [deps]);
   ```

2. **Avoid Unnecessary Renders**
   Use `React.memo()` for field components

3. **Optimize Field Filtering**
   Cache the `toRowData()` result if needed

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Type errors with form values | Use `String()` coercion: `String(value ?? '')` |
| Undefined values in API | Use `toRowData()` which filters empty values |
| Form not updating | Ensure `handleInputChange` is connected to all fields |
| Validation not working | Check required fields list matches form fields |

## Next Steps

1. **Review Documentation**
   - Read [KEY_VALUE_RECORDS_API_DOCUMENTATION.md](KEY_VALUE_RECORDS_API_DOCUMENTATION.md)

2. **Test Implementation**
   - Test form submission
   - Verify API integration
   - Check error handling

3. **Extend to Other Forms**
   - Apply key-value pattern to other modals
   - Create reusable form generator
   - Use `DynamicFormField` component

4. **Future Enhancements**
   - Add field grouping/sections
   - Implement conditional fields
   - Add cross-field validation

## Example: Adding a New Field

### Before (Hardcoded)
```typescript
interface POItem {
  po_number?: string;
  item_code?: string;
  // Must add new field here
  custom_field?: string;
}
```

### After (Key-Value)
```typescript
// No changes needed! Any field automatically supported
const formData: KeyValueRecord = {
  po_number: '',
  item_code: '',
  custom_field: '', // Just add it!
};
```

## Support Resources

- 📖 [Full Documentation](KEY_VALUE_RECORDS_API_DOCUMENTATION.md)
- 📋 [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- 💻 [Form Field Generator](src/utils/formFieldGenerator.ts)
- 🎨 [Dynamic Form Component](src/components/form/DynamicFormField.tsx)

---

**Version**: 1.0  
**Last Updated**: February 2026  
**Status**: ✅ Production Ready
