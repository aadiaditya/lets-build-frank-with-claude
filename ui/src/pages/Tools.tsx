import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";
import { useEffect, useMemo, useState } from "react";
import { callTool, listTools, type FrankTool, type ToolCallResult } from "../frank";
import { coerceArgs, fieldsFromSchema } from "../schema";

export function Tools(): JSX.Element {
  const [tools, setTools] = useState<FrankTool[]>([]);
  const [selected, setSelected] = useState<FrankTool[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [result, setResult] = useState<ToolCallResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const discovered = await listTools();
        if (live) setTools(discovered);
      } catch (cause) {
        if (live) setError(cause instanceof Error ? cause.message : "Could not list Frank's tools.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const tool = selected[0];
  // The form is derived from the tool's own input schema, so a new tool shows
  // up here with no UI work at all (ADR-002/ADR-003).
  const fields = useMemo(() => (tool ? fieldsFromSchema(tool.inputSchema) : []), [tool]);

  async function invoke(): Promise<void> {
    if (!tool) return;
    setCalling(true);
    setResult(null);
    setError(null);
    try {
      setResult(await callTool(tool.name, coerceArgs(fields, values)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The call failed.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <ContentLayout header={<Header variant="h1" description="Discovered from Frank over MCP.">Tools</Header>}>
      <SpaceBetween size="l">
        <Table
          variant="container"
          selectionType="single"
          trackBy="name"
          loading={loading}
          loadingText="Asking Frank what he can do"
          items={tools}
          selectedItems={selected}
          onSelectionChange={({ detail }) => {
            setSelected(detail.selectedItems);
            setValues({});
            setResult(null);
          }}
          header={<Header variant="h2" counter={`(${tools.length})`}>Available</Header>}
          empty={<Box textAlign="center" padding="l">Frank has no tools registered.</Box>}
          columnDefinitions={[
            { id: "name", header: "Name", cell: (item: FrankTool) => item.name, isRowHeader: true },
            { id: "description", header: "Description", cell: (item: FrankTool) => item.description ?? "—" },
          ]}
        />

        {error && <Alert type="error" header="Something went wrong">{error}</Alert>}

        {tool && (
          <Container header={<Header variant="h2" description={tool.description}>{tool.name}</Header>}>
            <Form
              actions={
                <Button variant="primary" loading={calling} onClick={() => void invoke()}>
                  Call {tool.name}
                </Button>
              }
            >
              <SpaceBetween size="m">
                {fields.length === 0 && <Box color="text-status-inactive">This tool takes no arguments.</Box>}
                {fields.map((field) =>
                  field.kind === "boolean" ? (
                    <Checkbox
                      key={field.name}
                      checked={values[field.name] === true}
                      onChange={({ detail }) => setValues((v) => ({ ...v, [field.name]: detail.checked }))}
                    >
                      {field.name}
                      {field.description ? ` — ${field.description}` : ""}
                    </Checkbox>
                  ) : (
                    <FormField
                      key={field.name}
                      label={field.required ? `${field.name} (required)` : field.name}
                      description={field.description}
                    >
                      <Input
                        type={field.kind === "number" ? "number" : "text"}
                        value={typeof values[field.name] === "string" ? (values[field.name] as string) : ""}
                        onChange={({ detail }) => setValues((v) => ({ ...v, [field.name]: detail.value }))}
                      />
                    </FormField>
                  ),
                )}
              </SpaceBetween>
            </Form>
          </Container>
        )}

        {result && (
          <Container header={<Header variant="h2">{result.isError ? "Frank returned an error" : "Result"}</Header>}>
            <SpaceBetween size="s">
              <Box variant="awsui-key-label">Summary</Box>
              <Box>{result.text}</Box>
              {result.structured && (
                <>
                  <Box variant="awsui-key-label">Detail</Box>
                  <Box variant="code">
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(result.structured, null, 2)}
                    </pre>
                  </Box>
                </>
              )}
            </SpaceBetween>
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
