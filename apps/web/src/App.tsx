import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QuickEntry } from "./features/capture/QuickEntry";
import { Timeline } from "./features/timeline/Timeline";
import { TaxonomySettings } from "./features/taxonomy/TaxonomySettings";
import { StatsOverview } from "./features/stats/StatsOverview";
import { GoalsList } from "./features/goals/GoalsList";
import { SyncProvider } from "./features/sync/SyncProvider";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Timeline />,
  },
  {
    path: "/entry/new",
    element: <QuickEntry />,
  },
  {
    path: "/settings",
    element: <TaxonomySettings />,
  },
  {
    path: "/stats",
    element: <StatsOverview />,
  },
  {
    path: "/goals",
    element: <GoalsList />,
  }
]);

export function App() {
  return (
    <SyncProvider>
      <main style={{ maxWidth: "48rem", margin: "0 auto", minHeight: "100vh" }}>
        <RouterProvider router={router} />
      </main>
    </SyncProvider>
  );
}
