"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/ui/SearchBar";
import SimulationCard from "./SimulationCard";
import { simulations } from "@/lib/simulations";

export default function CardGrid() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return simulations;
    const q = query.toLowerCase();
    return simulations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20">
      <SearchBar
        value={query}
        onChange={setQuery}
        className="mx-auto mb-8 max-w-md"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((sim, i) => (
          <SimulationCard key={sim.slug} simulation={sim} index={i} />
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-muted">
          No simulations found matching &ldquo;{query}&rdquo;
        </p>
      )}
    </section>
  );
}
