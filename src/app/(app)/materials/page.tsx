import { requireUser } from "@/lib/auth";
import { getAllMaterials, getCountries, getChannels } from "@/lib/queries";
import { MaterialsClient } from "@/components/materials/materials-client";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  await requireUser();
  const [materials, countries, channels] = await Promise.all([
    getAllMaterials(),
    getCountries(),
    getChannels(),
  ]);
  return <MaterialsClient materials={materials} countries={countries} channels={channels} />;
}
