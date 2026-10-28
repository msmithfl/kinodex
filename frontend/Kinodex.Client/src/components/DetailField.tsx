// One labelled value in a drawer's details grid (a <dl>). rowStart begins a new row at the left
// edge, so a short row leaves its remaining columns empty instead of pulling the next row up.
function DetailField({ label, children, rowStart = false }: {
  label: string;
  children: React.ReactNode;
  rowStart?: boolean;
}) {
  return (
    <div className={`min-w-0 ${rowStart ? "col-start-1" : ""}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-white truncate">{children}</dd>
    </div>
  );
}

export default DetailField;
