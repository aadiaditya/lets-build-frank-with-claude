import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Button from "@cloudscape-design/components/button";
import { useCallback, useEffect, useState } from "react";
import { callTool } from "../frank";

interface Status {
  version?: string;
  uptimeSeconds?: number;
  greeting?: string;
  summary?: string;
}

function Pair({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <div>{value}</div>
    </div>
  );
}

export function Overview(): JSX.Element {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callTool("get_status", {});
      if (result.isError) throw new Error(result.text);
      setStatus((result.structured as Status) ?? { summary: result.text });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach Frank.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ContentLayout header={<Header variant="h1" description="Frank's own view of himself.">Overview</Header>}>
      <SpaceBetween size="l">
        <Container
          header={
            <Header
              variant="h2"
              actions={<Button onClick={() => void refresh()} loading={loading}>Refresh</Button>}
            >
              Connection
            </Header>
          }
        >
          {loading ? (
            <Spinner />
          ) : error ? (
            <StatusIndicator type="error">Not connected</StatusIndicator>
          ) : (
            <StatusIndicator type="success">Connected — get_status answered over MCP</StatusIndicator>
          )}
        </Container>

        {error && (
          <Alert type="error" header="Frank did not answer">
            {error}
          </Alert>
        )}

        {status && (
          <Container header={<Header variant="h2">Status</Header>}>
            <ColumnLayout columns={3} variant="text-grid">
              <Pair label="Version" value={status.version ?? "unknown"} />
              <Pair label="Uptime" value={status.uptimeSeconds !== undefined ? `${status.uptimeSeconds}s` : "unknown"} />
              <Pair label="Greeting" value={status.greeting ?? "—"} />
            </ColumnLayout>
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
