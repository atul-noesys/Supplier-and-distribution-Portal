# Key-Value Record API Integration Documentation

## Overview

The application has been updated to use a **key-value record structure** for all API interactions, particularly for PO (Purchase Order) items. This approach provides flexibility, scalability, and easier form population from dynamic API responses.

## Key Concepts

### KeyValueRecord Type

```typescript
interface KeyValueRecord {
  [key: string]: string | number | boolean | null | undefined;
}
```

Every API response is now treated as a key-value record where:
- **Key**: Field identifier (e.g., `item_code`, `unit_price`)
- **Value**: Field value (string, number, boolean, or null)

### Benefits

1. **Dynamic Form Population**: Forms can be generated from API responses without hardcoding field names
2. **Flexible Data Handling**: Easy to handle varying fields from different API responses
3. **Type Safety**: Combined with TypeScript interfaces that extend `KeyValueRecord`
4. **Scalability**: Add new fields without modifying form component logic

## Implementation Details

### 1. Updated Types (`src/types/purchase-order.ts`)

```typescript
export interface KeyValueRecord {
  [key: string]: string | number | boolean | null | undefined;
}

export interface POItem extends KeyValueRecord {
  // Specific fields with type safety
  po_number?: string;
  item_code?: string;
  item?: string;
  unit_price?: string | number;
  quantity?: string | number;
  total?: string | number;
  // ... other fields
}
```

### 2. Form Field Generator (`src/utils/formFieldGenerator.ts`)

Utility functions for generating form fields from key-value records:

```typescript
// Generate field configuration from API response
const fieldConfigs = generateFormFieldConfig(apiRecord, fieldOverrides);

// Validate form data
const { isValid, errors } = validateFormData(formData, fieldConfigs);

// Extract form data for API submission
const poData = extractFormData(formData, ['rowId']);

// Normalize API responses
const normalized = normalizeAPIResponse(apiResponse);
```

### 3. Dynamic Form Field Component (`src/components/form/DynamicFormField.tsx`)

Reusable component that renders fields based on configuration:

```typescript
<DynamicFormField
  config={fieldConfig}
  value={formData[fieldConfig.key]}
  onChange={handleInputChange}
  onFileChange={handleFileChange}
  error={validationErrors[fieldConfig.key]}
/>
```

Supports field types:
- `text` - Standard text input
- `number` - Numeric input
- `select` - Dropdown selection
- `textarea` - Multi-line text
- `file` - File upload
- `date` - Date picker
- `email` - Email input
- `tel` - Telephone input

### 4. Updated Modal Components

#### AddPOModal.tsx
- Uses `KeyValueRecord` for `formData` state
- Filters empty values before API submission
- Dynamically validates only populated fields

```typescript
const [formData, setFormData] = useState<KeyValueRecord>({
  po_issue_date: '',
  vendor_id: '',
  vendor_name: '',
  po_status: 'pending',
});

// Before API submission
const poToSave: KeyValueRecord = {};
Object.keys(formData).forEach((key) => {
  if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
    poToSave[key] = formData[key];
  }
});
```

#### AddPOItemModal.tsx
- Treats form data as key-value records
- Handles nested key-value data from API responses
- Dynamically processes all fields without hardcoding

```typescript
// Validate required fields dynamically
const requiredFields = ['item_code', 'item', 'unit_price', 'quantity'];
const missingFields = requiredFields.filter((field) => !formData[field]);

// Submit only populated key-value pairs
const itemToSave: KeyValueRecord = {};
Object.keys(formData).forEach((key) => {
  if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined) {
    itemToSave[key] = formData[key];
  }
});
```

## Form Field Configuration

Fields are automatically configured based on naming patterns:

```typescript
const defaultFieldTypes: Record<string, FieldType> = {
  // Item fields
  item_code: 'select',
  item: 'text',
  item_name: 'text',
  unit_price: 'number',
  quantity: 'number',
  total: 'number',

  // PO fields
  po_number: 'text',
  po_issue_date: 'date',
  po_status: 'select',

  // Vendor fields
  vendor_id: 'text',
  vendor_name: 'select',

  // Other fields
  status: 'select',
  step_name: 'select',
  remarks: 'textarea',
  document: 'file',
};
```

## API Integration Example

### Before (Hardcoded Fields)
```typescript
interface POItem {
  po_number?: string;
  item_code?: string;
  unit_price?: number;
  // ... must list every field
}
```

### After (Key-Value Records)
```typescript
// API can return any structure
const apiResponse = {
  po_number: 'PO-001',
  item_code: 'ITEM-123',
  unit_price: 99.99,
  custom_field_1: 'value',
  custom_field_2: true,
  // ... unlimited fields
};

// Easily converted to key-value
const normalized = normalizeAPIResponse(apiResponse);
```

## Usage Example

### In AddPOItemModal:

```typescript
// Initialize with key-value structure
const getDefaultFormData = (): KeyValueRecord => ({
  po_number: poData?.po_number || '',
  item_code: '',
  item: '',
  unit_price: '',
  quantity: '',
  // ... other fields
});

const [formData, setFormData] = useState<KeyValueRecord>(getDefaultFormData());

// Handle changes dynamically
const handleInputChange = (field: string, value: string | number) => {
  setFormData((prev) => ({
    ...prev,
    [field]: value,
  }));
};

// Submit with validation
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  const requiredFields = ['item_code', 'item', 'unit_price', 'quantity'];
  const missingFields = requiredFields.filter((field) => !formData[field]);

  if (missingFields.length > 0) {
    toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
    return;
  }

  // Extract and submit
  const itemToSave = extractFormData(formData, ['rowId']);
  await nguageStore.AddDataSourceRow(itemToSave, 42, 'purchase_order_items');
};
```

## Validation

Form validation is now more flexible:

```typescript
const { isValid, errors } = validateFormData(formData, [
  {
    key: 'item_code',
    label: 'Item Code',
    type: 'select',
    required: true,
    validation: (value) => value !== '' || 'Item Code is required',
  },
  {
    key: 'unit_price',
    label: 'Unit Price',
    type: 'number',
    required: true,
    validation: (value) => parseFloat(value) > 0 || 'Price must be greater than 0',
  },
]);

if (!isValid) {
  toast.error('Validation failed: ' + JSON.stringify(errors));
}
```

## Migration Guide

### For Existing Components

1. **Update imports**:
   ```typescript
   import { KeyValueRecord } from '@/types/purchase-order';
   ```

2. **Update state**:
   ```typescript
   // Before
   const [formData, setFormData] = useState<POItem>({...});
   
   // After
   const [formData, setFormData] = useState<KeyValueRecord>({...});
   ```

3. **Use extractFormData**:
   ```typescript
   // Before
   const result = await api.save(formData);
   
   // After
   const cleanData = extractFormData(formData, excludeFields);
   const result = await api.save(cleanData);
   ```

4. **Dynamic field rendering**:
   ```typescript
   // Can use DynamicFormField for flexible forms
   <DynamicFormField
     config={fieldConfig}
     value={formData[fieldConfig.key]}
     onChange={handleInputChange}
   />
   ```

## Best Practices

1. **Always normalize API responses**:
   ```typescript
   const normalized = normalizeAPIResponse(apiResponse);
   ```

2. **Extract before submission**:
   ```typescript
   const cleanData = extractFormData(formData, ['rowId']);
   ```

3. **Validate with configuration**:
   ```typescript
   const { isValid, errors } = validateFormData(formData, fieldConfigs);
   ```

4. **Handle missing fields gracefully**:
   ```typescript
   const value = formData[fieldKey] ?? 'default value';
   ```

5. **Use TypeScript for safety**:
   ```typescript
   // Type-safe access
   const itemCode: string = String(formData.item_code || '');
   ```

## Performance Considerations

- **Normalization**: Happens once on API response
- **Validation**: Only validates required fields (filtered from config)
- **Rendering**: DynamicFormField memoization recommended for large forms
- **Submission**: Only non-empty fields are sent to API

## Future Enhancements

1. **Field Grouping**: Group related fields in sections
2. **Conditional Fields**: Show/hide fields based on other field values
3. **Custom Validators**: Pluggable validation logic
4. **Field Dependencies**: Auto-populate based on other fields
5. **API Schema Integration**: Generate form config from OpenAPI/GraphQL schema

## Troubleshooting

### Form doesn't update
- Ensure you're using the correct field key name
- Check that `handleInputChange` is properly connected
- Verify field is not marked as `disabled: true`

### Validation errors not showing
- Ensure error object is populated from validation result
- Check that DynamicFormField's `error` prop is passed correctly
- Verify field config `required` flag is set

### API submission fails
- Use `extractFormData` to remove internal fields like `rowId`
- Ensure only required fields are populated
- Check API expects the same key names as form data

---

**Last Updated**: February 2026
**Version**: 1.0
