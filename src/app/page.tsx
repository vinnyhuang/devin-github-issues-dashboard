import { Dashboard } from "@/components/Dashboard";
import { HydrateClient } from "@/trpc/server";

export default function Home() {
  return (
    <HydrateClient>
      <Dashboard />
    </HydrateClient>
  );
}
