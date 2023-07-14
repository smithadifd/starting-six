import { getClassNames } from "lib/utils";

interface PillProps {
  children: React.ReactNode;
  textColor?: string;
  backgroundColor?: string;
  className?: string;
}

function Pill({
  children,
  textColor: txtClr,
  backgroundColor: bgClr,
  className,
}: PillProps) {
  const textColor = txtClr || "text-gray-800";
  const backgroundColor = bgClr || "bg-gray-100";
  const defaultClasses =
    "flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  const classes = getClassNames(
    defaultClasses,
    textColor,
    backgroundColor,
    className
  );

  return <span className={classes}>{children}</span>;
}

export default Pill;
