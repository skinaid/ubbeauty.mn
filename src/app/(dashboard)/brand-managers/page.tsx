import { redirect } from "next/navigation";
import { BrandManagerCard } from "@/components/brand-managers/brand-manager-card";
import { CreateBrandManagerButton } from "@/components/brand-managers/create-brand-manager-button";
import { getCurrentUser } from "@/modules/auth/session";
import { getCurrentUserOrganization } from "@/modules/organizations/data";
import { getBrandManagers } from "@/modules/brand-managers/actions";

export default async function BrandManagersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const organization = await getCurrentUserOrganization(user.id);
  if (!organization) redirect("/setup-organization");

  const brandManagers = await getBrandManagers();

  return (
    <div className="page-content">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">AI Brand Managers</h1>
          <p className="page-subtitle">Брэндийнхээ тухай бүрэн мэдлэгтэй AI менежерүүдийг бүтээгээрэй</p>
        </div>
        <CreateBrandManagerButton />
      </div>

      {brandManagers.length === 0 ? (
        <div className="brand-managers-empty">
          <div className="brand-managers-empty__icon">🧠</div>
          <h3 className="brand-managers-empty__title">Брэнд менежер байхгүй байна</h3>
          <p className="brand-managers-empty__desc">
            Анхны AI брэнд менежерээ үүсгэж, брэндийнхээ мэдлэгийг сургаарай.
          </p>
          <CreateBrandManagerButton primary />
        </div>
      ) : (
        <div className="brand-managers-grid">
          {brandManagers.map((bm) => (
            <BrandManagerCard key={bm.id} brandManager={bm} />
          ))}
        </div>
      )}
    </div>
  );
}
