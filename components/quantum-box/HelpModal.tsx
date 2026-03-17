"use client";

import Modal from "@/components/ui/Modal";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ open, onClose }: HelpModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold">Quantum Particle in a Box</h2>

      <div className="space-y-4 text-sm text-text-muted">
        <section>
          <h3 className="mb-1 font-semibold text-foreground">Overview</h3>
          <p>
            This simulation shows a quantum particle (Gaussian wave packet)
            evolving in a 1D infinite square well potential. You can add
            potential barriers to observe quantum tunnelling.
          </p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Physics</h3>
          <p>
            The time-dependent Schrödinger equation is solved numerically using
            the split-operator Fourier transform method. In natural units
            (ℏ = 1, m = 1):
          </p>
          <div className="mt-2 rounded-md bg-background p-3 font-mono text-xs">
            iℏ ∂ψ/∂t = [-ℏ²/(2m) ∂²/∂x² + V(x)] ψ
          </div>
          <p className="mt-2">
            The wave function is propagated as:
          </p>
          <div className="mt-2 rounded-md bg-background p-3 font-mono text-xs">
            ψ(t+dt) ≈ e^(-iVdt/2) · FFT⁻¹[e^(-ik²dt/2) · FFT[e^(-iVdt/2) · ψ(t)]]
          </div>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Controls</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <strong>Position (x₀)</strong>: Initial center of the wave packet (0 = left wall, 1 = right wall)
            </li>
            <li>
              <strong>Width (σ)</strong>: Spatial spread of the wave packet. Narrower packets have broader momentum distributions.
            </li>
            <li>
              <strong>Momentum (k₀)</strong>: Initial momentum. Positive = rightward, negative = leftward.
            </li>
            <li>
              <strong>Barriers</strong>: Add rectangular potential barriers. Adjust center, width, and height.
            </li>
            <li>
              <strong>Speed</strong>: Number of simulation steps per frame.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Display</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <span className="text-purple-400">|ψ|²</span>: Probability density
            </li>
            <li>
              <span className="text-blue-400">Re(ψ)</span>: Real part of wave function
            </li>
            <li>
              <span className="text-orange-400">Im(ψ)</span>: Imaginary part of wave function
            </li>
            <li>
              <span className="text-yellow-400">V(x)</span>: Potential energy
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Things to Try</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Set k₀ to 0 and watch the wave packet spread due to dispersion</li>
            <li>Add a thin, tall barrier and observe partial tunnelling</li>
            <li>Add two barriers to create a resonant cavity</li>
            <li>Increase k₀ and watch the packet bounce between walls</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
