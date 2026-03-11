import { GiVhs, GiCompactDisc } from "react-icons/gi";

export function FormatIcon({ fmt }: { fmt: string }) {
  const f = fmt.toLowerCase();
  if (f === "vhs")
    return <GiVhs className="w-8 h-8 text-gray-300" title="VHS" />;
  if (f.includes("4k"))
    return <GiCompactDisc className="w-7 h-7 text-yellow-400" title="4K" />;
  if (f.includes("blu"))
    return <GiCompactDisc className="w-7 h-7 text-blue-400" title="Blu-ray" />;
  if (f.includes("dvd"))
    return <GiCompactDisc className="w-7 h-7 text-gray-400" title="DVD" />;
  return <span className="text-sm">{fmt}</span>;
}