import React from "react";

import { getClassNames } from "lib/utils";

interface CardProps {
  children: React.ReactNode;
  color?: string;
  className?: string[] | string;
  opacity?: number;
}

function Card({ children, className, color = "white", opacity }: CardProps) {
  const classes = getClassNames(
    "shadow-md rounded-md",
    `bg-${color}`,
    opacity && `bg-opacity-${opacity}`,
    className
  );
  return <div className={classes}>{children}</div>;
}

export default Card;
