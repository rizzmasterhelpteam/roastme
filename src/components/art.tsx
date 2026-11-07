import { personas } from "@/lib/personas";
export function Portrait({
  id = "savage",
  className = "",
  style,
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
        backgroundImage: `url(/brand/${personas[index].id}.webp?v=complete-20261106)`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        ...style,
      }}
      {...props}
    />
  );
}
