import { About } from "@/components/public/About";
import { ContactWidget } from "@/components/public/ContactWidget";
import { Hero } from "@/components/public/Hero";
import { PracticalInfo } from "@/components/public/PracticalInfo";
import { Services } from "@/components/public/Services";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { getSiteContent } from "@/lib/site-content";

// Le contenu vient de la base : il doit refléter immédiatement les
// modifications faites dans le backoffice.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await getSiteContent();

  return (
    <>
      <SiteHeader phone={content["info.phone"]} />
      <main>
        <Hero content={content} />
        <Services content={content} />
        <About content={content} />
        <PracticalInfo content={content} />
        <ContactWidget content={content} />
      </main>
      <SiteFooter content={content} />
    </>
  );
}
