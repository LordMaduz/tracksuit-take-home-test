import { type FormEvent, useState } from "react";
import { BRANDS } from "../../../../lib/brands.ts";
import { Button } from "../button/button.tsx";
import { Modal, type ModalProps } from "../modal/modal.tsx";
import styles from "./add-insight.module.css";

type AddInsightProps = ModalProps & {
  /** Called after an insight is created */
  onAdded(): void;
};

export const AddInsight = ({ onAdded, ...props }: AddInsightProps) => {
  const [brand, setBrand] = useState(BRANDS[0].id);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const addInsight = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brand, text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not add the insight");
        return;
      }
    } catch {
      setError("Could not reach the server");
      return;
    } finally {
      setSubmitting(false);
    }

    setText("");
    props.onClose();
    onAdded();
  };

  return (
    <Modal {...props}>
      <h1 className={styles.heading}>Add a new insight</h1>
      <form className={styles.form} onSubmit={addInsight}>
        <label className={styles.field}>
          Brand
          <select
            className={styles["field-input"]}
            value={brand}
            onChange={(e) => setBrand(Number(e.target.value))}
          >
            {BRANDS.map(({ id, name }) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Insight
          <textarea
            className={styles["field-input"]}
            rows={5}
            placeholder="Something insightful..."
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <Button
          className={styles.submit}
          type="submit"
          label="Add insight"
          disabled={submitting || !text.trim()}
        />
      </form>
    </Modal>
  );
};
