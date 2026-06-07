"use client";

import { useEffect, useRef, useState } from "react";
import MoleculeViewer from "./MoleculeViewer";
import type { PkaEntry } from "./types";

interface Props {
  entry: PkaEntry;
  onAnswer: (value: number) => void;
  disabled: boolean;
}

export default function QuestionCard({ entry, onAnswer, disabled }: Props) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus on new question
  useEffect(() => {
    setInputValue("");
    // slight delay so the molecule viewer settles
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [entry.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(inputValue);
    if (!disabled && !isNaN(parsed)) {
      onAnswer(parsed);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Functional group label */}
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {entry.functionalGroup}
      </p>

      {/* Molecule */}
      <div className="flex items-center justify-center rounded-xl border border-border bg-surface p-4">
        <MoleculeViewer smiles={entry.smiles} width={300} height={200} />
      </div>

      <p className="text-center text-sm text-text-muted">
        What is the pK<sub>a</sub> of the{" "}
        <span className="font-medium text-red-400">highlighted</span> proton?
      </p>

      {/* Answer input */}
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="e.g. −6 or 4.76"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-border bg-surface px-4 py-4 text-center text-2xl text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none disabled:opacity-50"
          style={{ appearance: "textfield" }}
          aria-label="Enter pKa value"
        />
        <button
          type="submit"
          disabled={disabled || inputValue.trim() === "" || isNaN(parseFloat(inputValue))}
          className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
