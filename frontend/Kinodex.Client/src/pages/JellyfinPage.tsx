import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import PageHeader from "../components/PageHeader";
import PageShell from "../components/PageShell";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  useConnectJellyfin,
  useDisconnectJellyfin,
  useJellyfinComparison,
  useJellyfinStatus,
} from "../features/jellyfin/api";
import type { JellyfinStatus, LibraryComparison } from "../types";

// Jellyfin: connect a server, then compare its libraries with Kinodex (docs/design/jellyfin-compare.md).
// Its own page, reached from Settings, until the design for Jellyfin features settles.
function JellyfinPage() {
  const { data: status, isLoading } = useJellyfinStatus();
  // Showing the form for a connected server (to change its address or key)
  const [changing, setChanging] = useState(false);

  return (
    <PageShell layout="scroll">
      <div className="max-w-3xl px-4 pt-4 pb-8 md:px-20 md:pt-7">
        {/* Tablet up; on phones the top bar says Jellyfin */}
        <PageHeader title="Jellyfin" className="hidden md:mb-6 md:flex" />

        {isLoading || !status ? (
          <LoadingSpinner />
        ) : (
          <>
            <section className="rounded-xl border border-border bg-card px-5 py-4">
              <h2 className="pb-3 text-base font-semibold">Server</h2>
              {status.connected && !changing ? (
                <ConnectedServer status={status} onChange={() => setChanging(true)} />
              ) : (
                <ConnectForm
                  initialUrl={status.serverUrl ?? ""}
                  onDone={() => setChanging(false)}
                  onCancel={status.connected ? () => setChanging(false) : undefined}
                />
              )}
            </section>

            {status.connected && <Comparison serverUrl={status.serverUrl ?? ""} />}
          </>
        )}
      </div>
    </PageShell>
  );
}

function ConnectedServer({ status, onChange }: { status: JellyfinStatus; onChange: () => void }) {
  const disconnect = useDisconnectJellyfin();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {status.serverName}
          {status.serverVersion && (
            <span className="font-normal text-muted-foreground"> · Jellyfin {status.serverVersion}</span>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">{status.serverUrl}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onChange}>
          Change
        </Button>
        <Button variant="ghost-destructive" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
          Disconnect
        </Button>
      </div>
    </div>
  );
}

function ConnectForm({
  initialUrl,
  onDone,
  onCancel,
}: {
  initialUrl: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const connect = useConnectJellyfin();
  const [serverUrl, setServerUrl] = useState(initialUrl);
  const [apiKey, setApiKey] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        connect.mutate({ serverUrl, apiKey }, { onSuccess: onDone });
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="jellyfin-url" className="text-xs text-muted-foreground">
          Server address
        </Label>
        <Input
          id="jellyfin-url"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="https://jellyfin.example.com"
          autoComplete="url"
          inputMode="url"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="jellyfin-key" className="text-xs text-muted-foreground">
          API key
        </Label>
        <Input
          id="jellyfin-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
          required
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Create one in Jellyfin under Dashboard → API Keys. Kinodex keeps it encrypted and never shows it again.
        </p>
      </div>
      {connect.error && <Alert variant="destructive">{connect.error.message}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={connect.isPending}>
          {connect.isPending ? "Connecting…" : "Connect"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Comparison({ serverUrl }: { serverUrl: string }) {
  const { data, error, isFetching, refetch } = useJellyfinComparison(true);

  return (
    <section className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2 className="text-base font-semibold">Compare libraries</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn(isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">{error.message}</Alert>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Reading the libraries…</p>
      ) : (
        <Tabs defaultValue="movies" className="gap-4">
          <TabsList>
            <TabsTrigger value="movies">Movies</TabsTrigger>
            <TabsTrigger value="shows">TV shows</TabsTrigger>
          </TabsList>
          <TabsContent value="movies">
            <ComparisonLists comparison={data.movies} serverUrl={serverUrl} kind="movie" />
          </TabsContent>
          <TabsContent value="shows">
            <ComparisonLists comparison={data.shows} serverUrl={serverUrl} kind="show" />
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}

// Where a Kinodex title opens: its drawer over the list
const kinodexLink = (kind: "movie" | "show", id: number) =>
  kind === "movie" ? `/library?movie=${id}` : `/tv-shows?show=${id}`;

// Where a Jellyfin title opens: its page in Jellyfin's web app
const jellyfinLink = (serverUrl: string, id: string) => `${serverUrl}/web/#/details?id=${id}`;

function ComparisonLists({
  comparison,
  serverUrl,
  kind,
}: {
  comparison: LibraryComparison;
  serverUrl: string;
  kind: "movie" | "show";
}) {
  return (
    <div className="flex flex-col gap-3">
      <Group title="On Jellyfin, not in Kinodex" count={comparison.onlyOnJellyfin.length} defaultOpen>
        {comparison.onlyOnJellyfin.map((title) => (
          <Row key={title.id} title={title.title} year={title.year} href={jellyfinLink(serverUrl, title.id)} />
        ))}
      </Group>
      <Group title="In Kinodex, not on Jellyfin" count={comparison.onlyInKinodex.length} defaultOpen>
        {comparison.onlyInKinodex.map((title) => (
          <Row key={title.id} title={title.title} year={title.year} to={kinodexLink(kind, title.id)} />
        ))}
      </Group>
      <Group title="In both" count={comparison.inBoth.length}>
        {comparison.inBoth.map((match) => (
          <Row
            key={match.kinodex.id}
            title={match.kinodex.title}
            year={match.kinodex.year}
            to={kinodexLink(kind, match.kinodex.id)}
            // Matched by title and year rather than TMDB id: worth a glance in case it's wrong
            note={match.matchedBy === "title" ? "Matched by title" : undefined}
          />
        ))}
      </Group>
    </div>
  );
}

// One of the three lists, folding open and shut
function Group({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        disabled={count === 0}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm font-medium disabled:cursor-default"
      >
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && count > 0 && "rotate-90")} />
        <span className="flex-1">{title}</span>
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </button>
      {open && count > 0 && <ul className="border-t border-border p-1">{children}</ul>}
    </div>
  );
}

function Row({
  title,
  year,
  to,
  href,
  note,
}: {
  title: string;
  year: number;
  to?: string;
  href?: string;
  note?: string;
}) {
  const content = (
    <>
      <span className="min-w-0 truncate">{title}</span>
      {year > 0 && <span className="shrink-0 text-muted-foreground tabular-nums">{year}</span>}
      {note && (
        <Badge variant="outline" className="ml-auto shrink-0 font-normal text-muted-foreground">
          {note}
        </Badge>
      )}
      {href && <ExternalLink className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );
  const className = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent";
  return (
    <li>
      {to ? (
        <Link to={to} className={className}>
          {content}
        </Link>
      ) : (
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {content}
        </a>
      )}
    </li>
  );
}

export default JellyfinPage;
