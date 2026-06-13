export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateUniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(name) || 'workspace';
  let slug = base;
  let counter = 1;

  while (await exists(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}
