import ListContactsClient from "./ListContactsClient";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

export const dynamicParams = true;

export default function Page() {
  return <ListContactsClient />;
}

