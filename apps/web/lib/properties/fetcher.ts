export async function propertyFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Property lookup failed")
  return response.json() as Promise<T>
}
