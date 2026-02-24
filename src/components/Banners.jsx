import React from "react";

export function Banner({ notice, error }) {
  if (!notice && !error) return null;

  return (
    <div className={`banner ${error ? "error" : "notice"}`}>
      {error || notice}
    </div>
  );
}
