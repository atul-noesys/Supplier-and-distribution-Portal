/**
 * Utility functions for generating and managing dynamic form fields
 * based on key-value record structure from API responses
 */

import { KeyValueRecord } from '@/types/purchase-order';

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'file' | 'date' | 'email' | 'tel';

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
  validation?: (value: any) => boolean | string;
  dependsOn?: string; // Field that triggers auto-population
  autoPopulateFrom?: (sourceData: KeyValueRecord) => string | number | undefined;
}

/**
 * Generate form fields configuration from API key-value records
 * Maps field names to appropriate input types and labels
 */
export const generateFormFieldConfig = (
  apiRecord: KeyValueRecord,
  fieldOverrides?: Partial<Record<string, Partial<FormFieldConfig>>>
): FormFieldConfig[] => {
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
    step_history: 'textarea',
    remarks: 'textarea',
    document: 'file',
    email: 'email',
    phone: 'tel',
  };

  const defaultLabels: Record<string, string> = {
    item_code: 'Item Code',
    item: 'Item Name',
    item_name: 'Item Name',
    unit_price: 'Unit Price',
    quantity: 'Quantity',
    total: 'Total Amount',
    po_number: 'PO Number',
    po_issue_date: 'Issue Date',
    po_status: 'PO Status',
    vendor_id: 'Vendor ID',
    vendor_name: 'Vendor Name',
    status: 'Status',
    step_name: 'Step Name',
    step_history: 'Step History',
    remarks: 'Remarks',
    document: 'Document',
    email: 'Email Address',
    phone: 'Phone Number',
  };

  const fieldConfigs: FormFieldConfig[] = Object.keys(apiRecord).map((key) => {
    const value = apiRecord[key];
    const type = defaultFieldTypes[key] || 'text';
    const label = defaultLabels[key] || key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.slice(1);

    const baseConfig: FormFieldConfig = {
      key,
      label,
      type,
      required: ['item_code', 'item', 'unit_price', 'quantity'].includes(key),
      disabled: ['po_number', 'total', 'item', 'unit_price'].includes(key),
      placeholder: `Enter ${label.toLowerCase()}`,
    };

    // Apply field-specific overrides
    if (fieldOverrides?.[key]) {
      return { ...baseConfig, ...fieldOverrides[key] };
    }

    return baseConfig;
  });

  return fieldConfigs;
};

/**
 * Convert API response to key-value record format
 * Ensures all API responses have consistent structure
 */
export const normalizeAPIResponse = (response: any): KeyValueRecord => {
  if (!response || typeof response !== 'object') {
    return {};
  }

  const normalized: KeyValueRecord = {};

  Object.keys(response).forEach((key) => {
    const value = response[key];
    // Convert null/undefined to empty string for form handling
    normalized[key] = value === null || value === undefined ? '' : value;
  });

  return normalized;
};

/**
 * Extract key-value pairs from form data for API submission
 */
export const extractFormData = (
  formData: KeyValueRecord,
  excludeFields?: string[]
): KeyValueRecord => {
  const extracted: KeyValueRecord = {};

  Object.keys(formData).forEach((key) => {
    if (!excludeFields?.includes(key)) {
      extracted[key] = formData[key];
    }
  });

  return extracted;
};

/**
 * Validate form data against field configuration
 */
export const validateFormData = (
  formData: KeyValueRecord,
  fieldConfigs: FormFieldConfig[]
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  fieldConfigs.forEach((config) => {
    const value = formData[config.key];

    // Check required fields
    if (config.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[config.key] = `${config.label} is required`;
      return;
    }

    // Check custom validation
    if (config.validation && value) {
      const validationResult = config.validation(value);
      if (typeof validationResult === 'string') {
        errors[config.key] = validationResult;
      } else if (!validationResult) {
        errors[config.key] = `${config.label} is invalid`;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Get field configuration by key
 */
export const getFieldConfig = (
  fieldConfigs: FormFieldConfig[],
  fieldKey: string
): FormFieldConfig | undefined => {
  return fieldConfigs.find((config) => config.key === fieldKey);
};
