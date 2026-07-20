import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { BriefSummary } from "./types";
import { NewBriefForm } from "./components/NewBriefForm";
import { BriefList } from "./components/BriefList";
import { BriefDetail } from "./components/BriefDetail";
import "./App.css";

export default function App() {
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    try {
      setBriefs(await api.listBriefs());
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load briefs");
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  function handleCreated(id: number) {
    setSelectedId(id);
    refreshList();
  }

  return (
    <div className="app">
      <header>
        <h1>Torch Blog Automation</h1>
        <p className="subtitle">Content Brief workspace — keyword → researched brief → review → approve</p>
      </header>

      <div className="layout">
        <aside>
          <NewBriefForm onCreated={handleCreated} />
          <h2 className="list-heading">Briefs</h2>
          {listError && <p className="error">{listError}</p>}
          <BriefList briefs={briefs} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>

        <main>
          {selectedId === null ? (
            <p className="muted placeholder">Select a brief on the left, or create a new one.</p>
          ) : (
            <BriefDetail id={selectedId} onChanged={refreshList} />
          )}
        </main>
      </div>
    </div>
  );
}
