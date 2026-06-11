import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const base =
  "focus-ring w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

function borderCls(invalid?: boolean) {
  return invalid
    ? "border-red-300 focus:border-red-500"
    : "border-gray-300 hover:border-gray-400 focus:border-brand";
}

export function Input({
  invalid,
  className = "",
  ...props
}: { invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`${base} ${borderCls(invalid)} ${className}`}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className = "",
  children,
  ...props
}: { invalid?: boolean } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`${base} ${borderCls(invalid)} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_0.625rem_center] bg-no-repeat pr-9 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  invalid,
  className = "",
  ...props
}: { invalid?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${base} ${borderCls(invalid)} ${className}`}
      {...props}
    />
  );
}
