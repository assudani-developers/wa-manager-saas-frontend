import CampaignDetailClient from "./CampaignDetailClient";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

export const dynamicParams = true;

export default function Page() {
  return <CampaignDetailClient />;
}

