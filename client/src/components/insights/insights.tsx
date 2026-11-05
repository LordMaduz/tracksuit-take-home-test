import { Trash2Icon } from "lucide-react";
import { BRANDS } from "../../../../lib/brands.ts";
import type { Insight } from "../../../../lib/insight.ts";
import { cx } from "../../lib/cx.ts";
import styles from "./insights.module.css";

type InsightsProps = {
  insights: Insight[];
  className?: string;
  /** Called after an insight is deleted */
  onChange(): void;
};

const brandName = (id: number) =>
  BRANDS.find((brand) => brand.id === id)?.name ?? `Unknown brand (${id})`;

export const Insights = ({ insights, className, onChange }: InsightsProps) => {
  const deleteInsight = async (id: number) => {
    try {
      await fetch(`/api/insights/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Could not delete the insight", error);
    }
    onChange();
  };

  return (
    <div className={cx(className)}>
      <h1 className={styles.heading}>Insights</h1>
      <div className={styles.list}>
        {insights?.length
          ? (
            insights.map(({ id, text, createdAt, brand }) => (
              <div className={styles.insight} key={id}>
                <div className={styles["insight-meta"]}>
                  <span>{brandName(brand)}</span>
                  <div className={styles["insight-meta-details"]}>
                    <time dateTime={createdAt.toISOString()}>
                      {createdAt.toLocaleString()}
                    </time>
                    <button
                      type="button"
                      className={styles["insight-delete"]}
                      aria-label="Delete insight"
                      onClick={() =>
                        deleteInsight(id)}
                    >
                      <Trash2Icon aria-hidden />
                    </button>
                  </div>
                </div>
                <p className={styles["insight-content"]}>{text}</p>
              </div>
            ))
          )
          : <p>We have no insight!</p>}
      </div>
    </div>
  );
};
