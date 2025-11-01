import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const Options = () => {
  return (
    <>
      <h1>Options</h1>
      <p>This is the options page for the extension.</p>
    </>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
