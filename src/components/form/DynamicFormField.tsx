/**
 * DynamicFormField component for rendering form fields based on key-value records
 * Supports various field types: text, number, select, textarea, file, date, email, tel
 */

import React from 'react';
import { FormFieldConfig, FieldType } from '@/utils/formFieldGenerator';

interface DynamicFormFieldProps {
  config: FormFieldConfig;
  value: string | number | undefined;
  onChange: (field: string, value: string | number) => void;
  onFileChange?: (field: string, file: File) => void;
  isUploading?: boolean;
  selectOptions?: Array<{ label: string; value: string | number }>;
  error?: string;
}

const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  config,
  value,
  onChange,
  onFileChange,
  isUploading = false,
  selectOptions,
  error,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const newValue = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    onChange(config.key, newValue);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onFileChange) {
      onFileChange(config.key, e.target.files[0]);
    }
  };

  const baseClasses =
    'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

  const disabledClasses =
    'w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-not-allowed';

  const errorClasses = error ? 'ring-2 ring-red-500 border-red-500' : '';

  const renderField = () => {
    switch (config.type) {
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={handleChange}
            disabled={config.disabled}
            placeholder={config.placeholder}
            rows={4}
            className={`${config.disabled ? disabledClasses : baseClasses} ${errorClasses}`}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={handleChange}
            disabled={config.disabled}
            className={`${config.disabled ? disabledClasses : baseClasses} ${errorClasses}`}
          >
            <option value="">Select {config.label.toLowerCase()}</option>
            {(selectOptions || config.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <input
              type="file"
              onChange={handleFileChange}
              disabled={isUploading || config.disabled}
              className={`block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed dark:file:bg-blue-600 dark:hover:file:bg-blue-700 ${errorClasses}`}
            />
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                <span>Uploading file...</span>
              </div>
            )}
            {value && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                File: <span className="font-medium">{String(value)}</span>
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={handleChange}
            disabled={config.disabled}
            placeholder={config.placeholder}
            min="0"
            step="0.01"
            className={`${config.disabled ? disabledClasses : baseClasses} ${errorClasses}`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={handleChange}
            disabled={config.disabled}
            className={`${config.disabled ? disabledClasses : baseClasses} ${errorClasses}`}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={handleChange}
            disabled={config.disabled}
            placeholder={config.placeholder}
            className={`${config.disabled ? disabledClasses : baseClasses} ${errorClasses}`}
          />
        );

      case 'tel':
        return (
          <input
            type="tel"
            value={value || ''}
            onChange={handleChange}
            disabled={config.disabled}
            placeholder={config.placeholder}
            className={`${config.disabled ? disabledClasses : baseClasses} ${errorClasses}`}
          />
        );

      default: // 'text'
        return (
          <input
            type="text"
            value={value || ''}
            onChange={handleChange}
            disabled={config.disabled}
            placeholder={config.placeholder}
            className={`${config.disabled ? disabledClasses : baseClasses} ${errorClasses}`}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {config.label}
        {config.required && <span className="text-red-500"> *</span>}
      </label>
      {renderField()}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default DynamicFormField;
