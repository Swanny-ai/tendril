import { redirect } from "next/navigation";

// Deep-link analytics live on the main analytics page now, under its source filter.
export default async function LinkAnalyticsPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const [{ id }, { range }] = await Promise.all([props.params, props.searchParams]);
  redirect(`/dashboard/analytics?${new URLSearchParams(range ? { source: id, range } : { source: id })}`);
}
