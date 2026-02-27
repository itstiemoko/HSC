import { useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const BASE_INPUT = 'mt-1 block w-full rounded-lg px-3 py-2 text-sm bg-card text-ink ring-1 transition-shadow';

function inputClass(error?: string) {
  return cn(BASE_INPUT, error ? 'ring-red-300 bg-red-50 dark:bg-red-950/30 dark:ring-red-800' : 'ring-edge-soft focus:ring-2 focus:ring-blue-500');
}

interface LabelProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}

function Label({ htmlFor, children, required }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-secondary">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>;
}

// ── Text Input ──────────────────────────────────────────────

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name?: string;
  label: string;
  error?: string;
  required?: boolean;
}

export function FormInput({ name, label, error, required, className, id: propsId, ...props }: FormInputProps) {
  const generatedId = useId();
  const inputId = propsId ?? name ?? generatedId;
  return (
    <div className={className}>
      <Label htmlFor={inputId} required={required}>{label}</Label>
      <input id={inputId} name={name} className={inputClass(error)} {...props} />
      <ErrorMessage message={error} />
    </div>
  );
}

// ── Select ──────────────────────────────────────────────────

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  name?: string;
  label: string;
  error?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FormSelect({ name, label, error, required, options, placeholder, className, id: propsId, ...props }: FormSelectProps) {
  const generatedId = useId();
  const selectId = propsId ?? name ?? generatedId;
  return (
    <div className={className}>
      <Label htmlFor={selectId} required={required}>{label}</Label>
      <select id={selectId} name={name} className={inputClass(error)} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ErrorMessage message={error} />
    </div>
  );
}

// ── Textarea ────────────────────────────────────────────────

interface FormTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  name?: string;
  label: string;
  error?: string;
  required?: boolean;
}

export function FormTextarea({ name, label, error, required, className, id: propsId, ...props }: FormTextareaProps) {
  const generatedId = useId();
  const textareaId = propsId ?? name ?? generatedId;
  return (
    <div className={className}>
      <Label htmlFor={textareaId} required={required}>{label}</Label>
      <textarea id={textareaId} name={name} className={inputClass(error)} {...props} />
      <ErrorMessage message={error} />
    </div>
  );
}

// ── Fieldset ────────────────────────────────────────────────

interface FormFieldsetProps {
  legend: string;
  children: React.ReactNode;
  columns?: 1 | 2;
}

export function FormFieldset({ legend, children, columns = 2 }: FormFieldsetProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-ink">{legend}</legend>
      <div className={cn('grid grid-cols-1 gap-4', columns === 2 && 'sm:grid-cols-2')}>
        {children}
      </div>
    </fieldset>
  );
}
