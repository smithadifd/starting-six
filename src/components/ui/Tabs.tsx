import React, { useState } from "react";


interface TabsProps {
  children: React.ReactNode;
}
type Child = React.ReactElement<{title: string}>;

const Tabs = ({ children } : TabsProps) => {
    const [activeTab, setActiveTab] = useState(0);
    const childrenArray = React.Children.toArray(children) as Child[];
    const activeChild = childrenArray[activeTab];

    const createTab = (child : React.PropsWithChildren<Child>, i : number) => {
      return (
          <button
              key={i}
              onClick={() => setActiveTab(i)} 
              className={`px-4 py-2 ${activeTab === i ? "bg-sky-500 text-wh" : ""}`}
          >
            {child.props.title}
          </button>
      );
    };

    return (
        <div className="flex flex-col">
          <div className="flex justify-center">
            <div className="flex flex-row shrink border border-black-1 rounded">
                {childrenArray.map((child, i) => (createTab(child, i)))}
            </div>
          </div>
            <div className="flex flex-col">
                {activeChild}
            </div>
        </div>
    );
}

export default Tabs;