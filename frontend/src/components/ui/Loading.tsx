type LoadingProps = {
  label?: string;
};

export function Loading({ label = "Loading..." }: LoadingProps) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm font-medium text-stone-700">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
      <span>{label}</span>
    </div>
  );
}
