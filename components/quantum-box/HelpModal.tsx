"use client";

import { useMemo } from "react";
import Modal from "@/components/ui/Modal";
import katex from "katex";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

function Eq({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: display, throwOnError: false });
    } catch {
      return tex;
    }
  }, [tex, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold">Quantum Particle in a Box</h2>

      <div className="space-y-5 text-sm text-text-muted">
        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">Physics</h3>
          <p className="mb-2">
            The time-dependent Schrödinger equation in natural units (<Eq tex="\hbar = 1, m = 1" />):
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq tex="i\frac{\partial \psi}{\partial t} = \left[-\frac{1}{2}\frac{\partial^2}{\partial x^2} + V(x)\right]\psi" display />
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">Wave Numbers</h3>
          <p className="mb-2">
            The incident wave has wavenumber <Eq tex="k_1" /> with energy:
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq tex="E = \frac{\hbar^2 k_1^2}{2m} = \frac{k_1^2}{2}" display />
          </div>
          <p className="mt-2 mb-2">
            When <Eq tex="E > V_0" /> (energy above barrier), the transmitted wave has:
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq tex="k_2 = \sqrt{2(E - V_0)}" display />
          </div>
          <p className="mt-2 mb-2">
            When <Eq tex="E < V_0" /> (energy below barrier), the wave is evanescent inside the barrier:
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq tex="\kappa_2 = \sqrt{2(V_0 - E)}, \quad \psi \sim e^{-\kappa_2 x}" display />
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">Numerical Method</h3>
          <p className="mb-2">
            The split-operator Fourier transform method propagates the wave function:
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq tex="\psi(t+\Delta t) \approx e^{-iV\frac{\Delta t}{2}} \cdot \mathcal{F}^{-1}\left[e^{-i\frac{k^2}{2}\Delta t} \cdot \mathcal{F}\left[e^{-iV\frac{\Delta t}{2}} \cdot \psi(t)\right]\right]" display />
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">Modes</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Wave Packet</strong>: A Gaussian wave packet <Eq tex="\psi(x,0) = A\,e^{-(x-x_0)^2/2\sigma^2}\,e^{ik_1 x}" /> that propagates and scatters off the barrier.
            </li>
            <li>
              <strong>Plane Wave</strong>: An extended wave <Eq tex="\psi \sim e^{ik_1 x}" /> (windowed to fit the box). Shows steady-state scattering behavior.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">How to Use</h3>
          <ol className="list-inside list-decimal space-y-1">
            <li>Set the <strong>wavenumber k₁</strong> to control the particle&apos;s momentum</li>
            <li>Enable the <strong>potential barrier</strong> and set its position, width, and height V₀</li>
            <li>Click <strong>Apply &amp; Restart</strong> to initialize the wave function</li>
            <li>Click <strong>Play</strong> to start the time evolution</li>
            <li>Watch the wave packet scatter — reflected and transmitted components appear</li>
            <li>Compare <Eq tex="E" /> vs <Eq tex="V_0" /> to see tunnelling vs. transmission</li>
          </ol>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">Things to Try</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Set <Eq tex="V_0 \gg E" /> to see evanescent decay (tunnelling)</li>
            <li>Set <Eq tex="V_0 \ll E" /> to see mostly transmission with small reflection</li>
            <li>Make the barrier very thin to observe resonant tunnelling</li>
            <li>Set k₁ = 0 and watch pure dispersion of a stationary packet</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
