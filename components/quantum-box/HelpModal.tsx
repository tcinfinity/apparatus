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
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
      });
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
            The time-dependent Schr&ouml;dinger equation in natural units (
            <Eq tex="\hbar = 1,\; m = 1" />
            ):
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq
              tex="i\frac{\partial \psi}{\partial t} = \left[-\frac{1}{2}\frac{\partial^2}{\partial x^2} + V(x)\right]\psi"
              display
            />
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">Wave Numbers</h3>
          <p className="mb-2">
            The incident wave has wavenumber <Eq tex="k_1" /> with kinetic
            energy:
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq tex="E = \frac{k_1^2}{2}" display />
          </div>
          <p className="mt-2 mb-2">
            When <Eq tex="E > V_0" /> (above barrier), the transmitted wave has
            real wavenumber:
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq tex="k_2 = \sqrt{2(E - V_0)}" display />
          </div>
          <p className="mt-2 mb-2">
            When <Eq tex="E < V_0" /> (below barrier), the wave decays
            exponentially inside the barrier:
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq
              tex="\kappa_2 = \sqrt{2(V_0 - E)},\quad \psi \sim e^{-\kappa_2 x}"
              display
            />
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">
            Numerical Method
          </h3>
          <p className="mb-2">
            The split-operator Fourier transform method propagates the wave
            function in time:
          </p>
          <div className="rounded-md bg-background p-3 text-center">
            <Eq
              tex="\psi(t{+}\Delta t) \approx e^{-iV\frac{\Delta t}{2}} \;\mathcal{F}^{-1}\!\left[e^{-i\frac{k^2}{2}\Delta t}\;\mathcal{F}\!\left[e^{-iV\frac{\Delta t}{2}}\psi(t)\right]\right]"
              display
            />
          </div>
          <p className="mt-2">
            Absorbing boundary conditions (quadratic imaginary potential) are
            applied at the domain edges to prevent spurious reflections.
          </p>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">Modes</h3>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <strong>Wave Packet</strong>: A Gaussian wave packet
              <div className="my-1.5 rounded-md bg-background p-2 text-center">
                <Eq
                  tex="\psi(x,0) = A\,e^{-(x - x_0)^2 / 2\sigma^2}\,e^{ik_1 x}"
                  display
                />
              </div>
              that propagates and scatters off barriers. It is a superposition
              of many plane waves, localized in space with a spread of momenta.
            </li>
            <li>
              <strong>Plane Wave</strong>: An extended wave{" "}
              <Eq tex="\psi \sim e^{ik_1 x}" /> (windowed to fit the domain).
              It has a single definite momentum but is spread across all space.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">How to Use</h3>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              Set the <strong>wavenumber</strong>{" "}
              <Eq tex="k_1" /> to control the particle&apos;s momentum
            </li>
            <li>
              Add <strong>potential barriers</strong> and configure their
              position, width, and height <Eq tex="V_0" />
            </li>
            <li>
              Choose <strong>boundary type</strong>: open (absorbing), infinite
              wall, or finite wall
            </li>
            <li>
              Click <strong>Restart Wave</strong> to initialize the wave
              function with current parameters
            </li>
            <li>
              Click <strong>Play</strong> to start the time evolution
            </li>
            <li>
              <strong>Scroll to zoom</strong> and <strong>drag to pan</strong>{" "}
              the canvas view
            </li>
          </ol>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-foreground">
            Things to Try
          </h3>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Set <Eq tex="V_0 \gg E" /> to see evanescent decay (quantum
              tunnelling)
            </li>
            <li>
              Set <Eq tex="V_0 \ll E" /> to see mostly transmission with small
              reflection
            </li>
            <li>
              Make the barrier very thin to observe resonant tunnelling
            </li>
            <li>
              Add two barriers to create a double-barrier resonance (Fabry-P&eacute;rot)
            </li>
            <li>
              Set <Eq tex="k_1 = 0" /> and watch pure dispersion of a
              stationary packet
            </li>
            <li>
              Try infinite walls to see a true &ldquo;particle in a box&rdquo;
              with standing waves
            </li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
