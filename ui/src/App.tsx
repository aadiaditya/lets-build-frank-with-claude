import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import { useState } from "react";
import { Overview } from "./pages/Overview";
import { Tools } from "./pages/Tools";

type PageId = "#/overview" | "#/tools";

export function App(): JSX.Element {
  const [page, setPage] = useState<PageId>("#/overview");
  const [navigationOpen, setNavigationOpen] = useState(true);

  return (
    <AppLayout
      toolsHide
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      navigation={
        <SideNavigation
          header={{ href: "#/overview", text: "Frank" }}
          activeHref={page}
          onFollow={(event) => {
            event.preventDefault();
            setPage(event.detail.href as PageId);
          }}
          items={[
            { type: "link", text: "Overview", href: "#/overview" },
            { type: "link", text: "Tools", href: "#/tools" },
          ]}
        />
      }
      content={page === "#/overview" ? <Overview /> : <Tools />}
    />
  );
}
