import React from "react";
import RankingsPage from "./RankingsPage.jsx";

export default function Top25({ supabase, isCommish }) {
  return (
    <RankingsPage
      supabase={supabase}
      isCommish={isCommish}
      settingKey="rankings_top25"
      pageTitle="Top 25"
      pageSubtitle="National top 25 rankings"
      showConference={false}
      splitAfter={5}
      placeholder={"1. Alabama (8-0)\n2. Georgia (7-1)\n3. Ohio State (7-1)\n..."}
    />
  );
}
