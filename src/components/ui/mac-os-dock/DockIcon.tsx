import React, { useState } from 'react';

interface DockIconProps {
  name: string;
  icon: string | React.ReactNode;
}

/** A dock icon: an image URL (with a letter fallback if it fails) or any node. */
const DockIcon: React.FC<DockIconProps> = ({ name, icon }) => {
  const [failed, setFailed] = useState(false);

  if (typeof icon !== 'string') {
    return <span className="flex h-full w-full items-center justify-center [&>*]:h-full [&>*]:w-full">{icon}</span>;
  }
  if (failed) {
    return (
      <span
        aria-hidden="true"
        className="flex h-full w-full items-center justify-center rounded-[22%] bg-white/20 text-lg font-bold uppercase text-white"
      >
        {name.trim().charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={icon}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className="h-full w-full object-contain drop-shadow-md"
    />
  );
};

export default DockIcon;
