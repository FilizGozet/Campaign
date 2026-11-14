import { buildSeed } from "@/data/seed";

let seed: ReturnType<typeof buildSeed> | null = null;
export function getSeed() {
  if (!seed) seed = buildSeed();
  return seed;
}
export function freshSeed() {
  seed = buildSeed();
  return seed;
}
