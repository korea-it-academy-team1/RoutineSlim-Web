import React from "react";
export default function BrandLogo({ english = false }) {
  return (
    <span className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <span>R</span>
      </span>
      <span>{english ? "RoutineSlim" : "루틴슬림"}</span>
    </span>
  );
}
