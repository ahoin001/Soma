import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  format?: (value: number) => string;
};

export const AnimatedNumber = ({
  value,
  className,
  format,
}: AnimatedNumberProps) => {
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const controls = animate(previous.current, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplay(Math.round(latest));
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value]);

  const content = format ? format(display) : display.toString();

  return <span className={className}>{content}</span>;
};
