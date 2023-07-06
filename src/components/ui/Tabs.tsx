import React, { useState } from "react";


interface TabsProps {
  children: React.ReactNode;
}

const Tabs = ({ children } : TabsProps) => {
    const [activeTab, setActiveTab] = useState(0);
    const childrenArray = React.Children.toArray(children);
    const activeChild = childrenArray[activeTab];

    const createTab = (child : React.ReactNode, i : number) => {
        return (
            <button
                key={i}
                onClick={() => setActiveTab(i)} 
                className={`px-4 py-2 ${activeTab === i ? "bg-gray-200" : ""}`}
            >
                {child.props.title}
            </button>
        );
    };

    return (
        <div className="flex flex-col">
            <div className="flex flex-row">
                {childrenArray.map((child, i) => (createTab(child, i)))}
            </div>
            <div className="flex flex-col">
                {activeChild}
            </div>
        </div>
    );
}

export default Tabs;