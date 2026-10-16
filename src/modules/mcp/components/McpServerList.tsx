"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Server,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import {
  useCreateMcpServer,
  useCreateMcpTool,
  useDeleteMcpServer,
  useDeleteMcpTool,
  useMcpServers,
  useMcpTools,
  useUpdateMcpTool,
} from "../hooks";
import type { McpServer, McpTool, McpTransport, ToolPermission } from "../schemas";
import {
  AsyncBoundary,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Input,
  Select,
  Skeleton,
} from "@/shared/ui";

function ToolsSection({ server }: { server: McpServer }) {
  const tools = useMcpTools(server.id);
  const updateTool = useUpdateMcpTool(server.id);
  const deleteTool = useDeleteMcpTool(server.id);
  const createTool = useCreateMcpTool(server.id);

  const [showAddTool, setShowAddTool] = React.useState(false);
  const [toolName, setToolName] = React.useState("");
  const [toolDescription, setToolDescription] = React.useState("");
  const [toolPermission, setToolPermission] =
    React.useState<ToolPermission>("requires_confirmation");

  const handleAddTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) {
      toast.error("Tool name is required.");
      return;
    }
    createTool.mutate(
      {
        name: toolName.trim(),
        description: toolDescription.trim() || undefined,
        permission: toolPermission,
      },
      {
        onSuccess: () => {
          setShowAddTool(false);
          setToolName("");
          setToolDescription("");
          setToolPermission("requires_confirmation");
        },
      },
    );
  };

  return (
    <div className="mt-4 border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Discovered Tools
          </h4>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAddTool(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Tool
        </Button>
      </div>

      <AsyncBoundary
        isPending={tools.isPending}
        error={tools.error}
        isEmpty={!tools.data || tools.data.length === 0}
        skeleton={
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        }
        empty={
          <p className="text-xs text-muted-foreground italic py-2">
            No tools registered for this MCP server yet.
          </p>
        }
        errorTitle="Couldn't load tools"
        onRetry={() => void tools.refetch()}
      >
        <div className="divide-y divide-border rounded border border-border bg-card">
          {(tools.data ?? []).map((tool: McpTool) => (
            <div
              key={tool.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 text-sm"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-xs text-foreground">
                    {tool.name}
                  </span>
                  <Badge
                    variant={
                      tool.permission === "allowed"
                        ? "success"
                        : tool.permission === "blocked"
                          ? "destructive"
                          : "neutral"
                    }
                    className="text-[10px]"
                  >
                    {tool.permission}
                  </Badge>
                </div>
                {tool.description && (
                  <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="w-44">
                  <Select
                    value={tool.permission}
                    onChange={(e) =>
                      updateTool.mutate({
                        toolId: tool.id,
                        patch: { permission: e.target.value as ToolPermission },
                      })
                    }
                    className="h-8 text-xs"
                  >
                    <option value="allowed">Allowed (Auto)</option>
                    <option value="requires_confirmation">Requires Approval</option>
                    <option value="blocked">Blocked</option>
                  </Select>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteTool.mutate(tool.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AsyncBoundary>

      {showAddTool && (
        <Dialog
          open
          title="Add Tool to MCP Server"
          description={`Register a tool capability under ${server.name}.`}
          onClose={() => setShowAddTool(false)}
        >
          <form onSubmit={handleAddTool} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Tool Name</label>
              <Input
                placeholder="search_repositories"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Description</label>
              <Input
                placeholder="Search across indexed code repositories"
                value={toolDescription}
                onChange={(e) => setToolDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Permission</label>
              <Select
                value={toolPermission}
                onChange={(e) => setToolPermission(e.target.value as ToolPermission)}
              >
                <option value="requires_confirmation">Requires Human Confirmation</option>
                <option value="allowed">Allowed Automatically</option>
                <option value="blocked">Blocked</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddTool(false)}
                disabled={createTool.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createTool.isPending}>
                Register Tool
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

export function McpServerList() {
  const servers = useMcpServers();
  const createServer = useCreateMcpServer();
  const deleteServer = useDeleteMcpServer();

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [showAddServer, setShowAddServer] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [serverType, setServerType] = React.useState("custom");
  const [transport, setTransport] = React.useState<McpTransport>("sse");
  const [endpoint, setEndpoint] = React.useState("");

  const handleCreateServer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Server name is required.");
      return;
    }
    createServer.mutate(
      {
        name: name.trim(),
        server_type: serverType,
        transport,
        endpoint: endpoint.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowAddServer(false);
          setName("");
          setServerType("custom");
          setTransport("sse");
          setEndpoint("");
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configured MCP Servers</CardTitle>
            <CardDescription>
              Model Context Protocol endpoints exposing tools and resources to agents.
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddServer(true)}>
            <Plus className="h-4 w-4 mr-1" /> Register Server
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AsyncBoundary
          isPending={servers.isPending}
          error={servers.error}
          isEmpty={!servers.data || servers.data.length === 0}
          skeleton={
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="rounded border border-border p-4 space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          }
          empty={
            <EmptyState
              icon={Server}
              title="No MCP servers configured"
              description="Register an MCP server via SSE or stdio to expand autonomous agent capabilities."
            />
          }
          errorTitle="Couldn't load MCP servers"
          onRetry={() => void servers.refetch()}
        >
          <div className="space-y-3">
            {(servers.data ?? []).map((server: McpServer) => {
              const isExpanded = expandedId === server.id;

              return (
                <div
                  key={server.id}
                  className="rounded-lg border border-border bg-card p-4 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 mt-0.5 text-muted-foreground"
                        onClick={() => setExpandedId(isExpanded ? null : server.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{server.name}</h3>
                          <Badge variant="neutral" className="font-mono text-[10px]">
                            {server.transport}
                          </Badge>
                          <Badge
                            variant={server.is_active ? "success" : "neutral"}
                            className="text-[10px]"
                          >
                            {server.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        {server.endpoint && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {server.endpoint}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedId(isExpanded ? null : server.id)}
                      >
                        <Wrench className="h-3.5 w-3.5 mr-1" />
                        Tools
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(server.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && <ToolsSection server={server} />}
                </div>
              );
            })}
          </div>
        </AsyncBoundary>
      </CardContent>

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <ConfirmDialog
          open={Boolean(deleteConfirmId)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDeleteConfirmId(null);
          }}
          title="Delete MCP Server"
          description="Are you sure you want to remove this MCP server? Discovered tools will no longer be available to workflows or agents."
          confirmLabel="Delete Server"
          variant="destructive"
          onConfirm={() => {
            deleteServer.mutate(deleteConfirmId, {
              onSettled: () => setDeleteConfirmId(null),
            });
          }}
        />
      )}

      {/* Register Server Dialog */}
      {showAddServer && (
        <Dialog
          open
          title="Register MCP Server"
          description="Connect a Model Context Protocol endpoint to expose tools."
          onClose={() => setShowAddServer(false)}
        >
          <form onSubmit={handleCreateServer} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Server Name</label>
              <Input
                placeholder="github-mcp-server"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Server Type</label>
                <Input
                  placeholder="custom"
                  value={serverType}
                  onChange={(e) => setServerType(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Transport</label>
                <Select
                  value={transport}
                  onChange={(e) => setTransport(e.target.value as McpTransport)}
                >
                  <option value="sse">SSE (Server-Sent Events)</option>
                  <option value="stdio">stdio (Local Command)</option>
                  <option value="websocket">WebSocket</option>
                  <option value="webhook">Webhook</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Endpoint / Command</label>
              <Input
                placeholder={
                  transport === "sse" ? "http://localhost:8080/sse" : "npx -y @modelcontextprotocol/..."
                }
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddServer(false)}
                disabled={createServer.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createServer.isPending}>
                Register Server
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Card>
  );
}
