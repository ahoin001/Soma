import { AnimatedNumber } from "./AnimatedNumber";

type StatProps = {
  label: string;
  value: number;
};

export const Stat = ({ label, value }: StatProps) => (
  <div className="text-center">
    <p className="text-xs font-medium">{label}</p>
    <p className="text-xl font-display font-semibold text-foreground">
      <AnimatedNumber value={value} />
    </p>
  </div>
);
