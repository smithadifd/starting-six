import React from "react";

import { getClassNames } from "lib/utils";

interface CardProps {
  children: React.ReactNode;
  bgColor?: string;
  className?: string[];
}

const Card = ({ children, className, bgColor = 'white' } : CardProps) => {
  const classes = getClassNames(
    "bg-white shadow-md rounded-md p-4",
    className,
    `bg-${bgColor}`,
  );
  return (
    <div className={classes}>
      {children}
    </div>
  );
}

export default Card;