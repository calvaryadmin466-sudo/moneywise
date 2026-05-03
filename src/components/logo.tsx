import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = "", width = 48, height = 48 }: LogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Money-Wise Logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
