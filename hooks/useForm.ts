import { useState, useCallback } from 'react';

type ValidationRules<T> = {
  [K in keyof T]?: (value: T[K], form: T) => string | undefined;
};

interface UseFormOptions<T extends object> {
  initial: T;
  rules?: ValidationRules<T>;
  onSubmit: (values: T) => void | Promise<void>;
}

export default function useForm<T extends object>({ initial, rules, onSubmit }: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const setValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValue(name as keyof T, value as T[keyof T]);
  }, [setValue]);

  const reset = useCallback((data?: T) => {
    setValues(data ?? initial);
    setErrors({});
  }, [initial]);

  const validate = useCallback((): boolean => {
    if (!rules) return true;
    const errs: Partial<Record<keyof T, string>> = {};
    for (const key of Object.keys(rules) as (keyof T)[]) {
      const rule = rules[key];
      if (rule) {
        const msg = rule(values[key], values);
        if (msg) errs[key] = msg;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [rules, values]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(values);
  }, [validate, onSubmit, values]);

  const getFieldProps = useCallback((name: keyof T) => ({
    name: name as string,
    value: values[name] as string,
    onChange: handleChange,
    error: errors[name],
  }), [values, errors, handleChange]);

  return {
    values,
    errors,
    setErrors,
    setValue,
    setValues,
    handleChange,
    handleSubmit,
    validate,
    reset,
    getFieldProps,
  };
}
