import React from "react";
import RankingsPage from "./RankingsPage.jsx";

export default function Big10Rankings({ supabase, isCommish }) {
  return (
    <RankingsPage
      supabase={supabase}
      isCommish={isCommish}
      settingKey="rankings_big10"
      pageTitle="Big 10 Rankings"
      pageSubtitle="Big 10 conference standings & rankings"
      showConference={true}
      placeholder={"1. Ohio State (8-0, 5-0)\n2. Michigan (7-1, 4-1)\n3. Penn State (7-1, 4-1)\n..."}
    />
  );
}
