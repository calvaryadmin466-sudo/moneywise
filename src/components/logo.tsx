import Image from "next/image";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = "", width = 48, height = 48 }: LogoProps) {
  return (
    <Image
      src="/icon.png"
      alt="MoneyWise Logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
