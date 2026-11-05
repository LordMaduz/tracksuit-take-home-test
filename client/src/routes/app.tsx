import { useCallback, useEffect, useState } from "react";
import { Header } from "../components/header/header.tsx";
import { Insights } from "../components/insights/insights.tsx";
import styles from "./app.module.css";
import { Insight } from "../../../lib/insight.ts";

export const App = () => {
  const [insights, setInsights] = useState<Insight[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/insights`);
      if (!res.ok) throw new Error(`GET /insights returned ${res.status}`);
      setInsights(Insight.array().parse(await res.json()));
    } catch (error) {
      console.error("Could not load insights", error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className={styles.main}>
      <Header onInsightAdded={refresh} />
      <Insights
        className={styles.insights}
        insights={insights}
        onChange={refresh}
      />
    </main>
  );
};
