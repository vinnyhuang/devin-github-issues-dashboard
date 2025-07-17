import { Dashboard } from "@/components/features/dashboard";
import { HydrateClient } from "@/trpc/server";

export default function Home() {
  return (
    <HydrateClient>
      <Dashboard />
    </HydrateClient>
  );
}
