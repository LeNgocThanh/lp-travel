export type ItineraryInformationData = { inclusions?: string | null; exclusions?: string | null; informationNotes?: string | null; title?: string };

const lines = (value: string | null | undefined) => value?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];

function BulletList({ value }: { value: string | null | undefined }) {
  const items = lines(value);
  return items.length ? <ul className="list-disc space-y-1 pl-5">{items.map((item, index) => <li key={`${index}-${item}`} className="whitespace-pre-wrap">{item}</li>)}</ul> : <p className="text-muted-foreground">—</p>;
}

export function ItineraryInformation({ inclusions, exclusions, informationNotes, title = "II. Quotation & Information" }: ItineraryInformationData) {
  if (!inclusions && !exclusions && !informationNotes) return null;
  return <section className="mt-12 space-y-8 text-sm text-slate-900"><div><h2 className="mb-4 font-bold">{title}</h2><div className="grid border border-black md:grid-cols-2"><div className="border-b border-black md:border-b-0 md:border-r"><h3 className="border-b border-black p-2 text-center font-bold text-amber-500">Inclusions</h3><div className="p-3"><BulletList value={inclusions} /></div></div><div><h3 className="border-b border-black p-2 text-center font-bold text-amber-500">Exclusions</h3><div className="p-3"><BulletList value={exclusions} /></div></div></div></div>{informationNotes && <div className="px-5"><h3 className="mb-2 font-bold text-amber-500">NOTES:</h3><BulletList value={informationNotes} /></div>}</section>;
}
