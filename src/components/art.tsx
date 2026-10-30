import { personas } from "@/lib/personas";
export function Portrait({
  id = "savage",
  className = "",
  ...props
}: { id?: string; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const index = Math.max(
    0,
    personas.findIndex((p) => p.id === id),
  );
  return (
    <div
      role="img"
      aria-label={personas[index].name}
      className={`portrait ${className}`}
      style={{
        backgroundImage: id === "savage" ? "url(/logo.png)" : "url(/personas.webp)",
        backgroundSize: id === "savage" ? "100% 100%" : "300% 200%",
        backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 100}%`,
      }}
      {...props}
    />
  );
}
