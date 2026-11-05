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
        backgroundImage: id === "savage" ? "url(/logo.png?v=savage-classic-20261103)" : "url(/personas.webp)",
        backgroundSize: id === "savage" ? "contain" : "300% 200%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: id === "savage" ? "center" : `${(index % 3) * 50}% ${Math.floor(index / 3) * 100}%`,
      }}
      {...props}
    />
  );
}
