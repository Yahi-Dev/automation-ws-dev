// lib/password.ts
export function generateFinalPassword(): string {
  // Puedes dejarla fija (como pediste) o generar una robusta:
  // Ejemplo aleatorio si luego quieres:
  const specials = "!@#$%^&*";
  const nums = "0123456789";
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = lowers.toUpperCase();
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  return `${pick(uppers)}${pick(lowers)}${pick(nums)}${pick(specials)}${pick(lowers)}${pick(uppers)}${pick(nums)}${pick(specials)}`;
}