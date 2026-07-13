import { redirect } from 'next/navigation';

type SearchValue = string | string[] | undefined;

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LegacySearchPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, SearchValue>> }>) {
  const incoming = await searchParams;
  const outgoing = new URLSearchParams();
  const search = first(incoming.search) || first(incoming.q);
  const fields = ['type', 'category', 'color', 'brand', 'sort', 'page'] as const;

  if (search) outgoing.set('search', search.slice(0, 100));
  fields.forEach((field) => {
    const value = first(incoming[field]);
    if (value) outgoing.set(field, value);
  });

  const query = outgoing.toString();
  redirect(query ? `/items?${query}` : '/items');
}
