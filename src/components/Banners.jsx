import React from "react";

export function Banner({ notice, error }) {
  if (!notice && !error) return null;
  return (
    <div className={error ? "banner error" : "banner notice"}>
      {error || notice}
    </div>
  );
}
