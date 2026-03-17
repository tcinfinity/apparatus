export interface Simulation {
  name: string;
  slug: string;
  type: string;
  description: string;
  tag: string;
  tagColor: string;
}

export const simulations: Simulation[] = [
  {
    name: "Lens Builder",
    slug: "lens-builder",
    type: "phys",
    description: "Build ray diagrams with draggable lenses and trace light through multi-lens optical systems",
    tag: "Physics",
    tagColor: "bg-blue-500/20 text-blue-400",
  },
  {
    name: "Quantum Particle in a Box",
    slug: "quantum-box",
    type: "phys",
    description: "Simulate quantum tunnelling of a Gaussian wave packet through potential barriers",
    tag: "Quantum",
    tagColor: "bg-purple-500/20 text-purple-400",
  },
  {
    name: "Feynman Diagram Editor",
    slug: "feynman-diagram",
    type: "phys",
    description: "Draw and export particle interaction diagrams with proper line types and labels",
    tag: "Quantum",
    tagColor: "bg-purple-500/20 text-purple-400",
  },
];
