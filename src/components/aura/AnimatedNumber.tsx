import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  format?: (value: number) => string;
  animateTrigger?: number;
};

export const AnimatedNumber = ({
  value,
  className,
  format,
  animateTrigger,
}: AnimatedNumberProps) => {
  const previous = useRef(value);
  const lastTrigger = useRef(animateTrigger);
  const shouldReset = useRef(false);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (animateTrigger !== undefined && animateTrigger !== lastTrigger.current) {
      shouldReset.current = true;
      lastTrigger.current = animateTrigger;
    }
  }, [animateTrigger]);

  useEffect(() => {
    const start = shouldReset.current ? 0 : previous.current;
    const controls = animate(start, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplay(Math.round(latest));
      },
    });
    previous.current = value;
    shouldReset.current = false;
    return () => controls.stop();
  }, [value, animateTrigger]);

  const content = format ? format(display) : display.toString();

  return <span className={className}>{content}</span>;
};
