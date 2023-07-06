import React from "react";

interface CardProps {
  children: React.ReactNode;
  bgColor?: string;
}

const Card = ({ children, bgColor = 'white' } : CardProps) => {
  return (
    <div className={`bg-${bgColor} shadow-md rounded-md p-4`}>
      {children}
    </div>
  );
}

export default Card;