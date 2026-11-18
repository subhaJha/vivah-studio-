import Studio from "@/components/studio";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export default async function Home() {
  return <Studio catalog={await getCatalog()} />;
}
